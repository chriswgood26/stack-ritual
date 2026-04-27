# Email Reduction + Analysis UX Polish

**Date:** 2026-04-27
**Status:** Approved (design)

## Summary

Five coupled changes: reduce email noise (low-supply alert cooldown + master unsubscribe + wire up the dead `email_marketing` toggle), and polish the AI Stack Analysis UX (always-show "View analysis" CTA on the Stack page, re-analyze confirmation modal, printable analysis with user name + print date).

The email-reduction work closes a real trust gap (today, the user-profile "marketing emails" toggle is dead code that doesn't gate anything) and stops the daily-spam loop on persistently-low supplement items. The analysis UX work cleans up the entry-point card and protects users from accidentally wiping out their saved follow-up Q&As.

## Change 1 — Low-supply alert cooldown

### Problem

`/api/cron/low-supply` runs daily at 8am UTC. The query selects items where `quantity_remaining <= 14` with no per-item cooldown, so a user whose supplement sits at 8 doses for two weeks gets the same email 14 days in a row. This is the single biggest source of email noise.

### Schema

```sql
alter table user_stacks
  add column if not exists last_low_supply_alert_sent_at timestamptz;
```

### Cron change

Modify `src/app/api/cron/low-supply/route.ts` to:

1. Add a 14-day filter to the existing Supabase query, alongside the current `quantity_remaining <= 14` and `low_supply_alert = true` filters:

   ```ts
   .or(`last_low_supply_alert_sent_at.is.null,last_low_supply_alert_sent_at.lt.${fourteenDaysAgo.toISOString()}`)
   ```

2. After a successful Resend send for a user, bulk-update `last_low_supply_alert_sent_at = now()` on every `user_stacks` row that was included in that user's email. (One bulk update per user, not per item.)

### Emergent behavior

- First-time low for an item → email sent → 14-day cooldown begins.
- Item stays low for 14+ days → silent for 14 days, then re-alerts on day 14 if still low.
- User restocks (quantity > 14) and runs low again 20 days later → re-alerts on next cron tick (timestamp is older than 14 days).
- User restocks and runs low again within 14 days → silent until timestamp ages out. Acceptable: the user just bought a bottle and the in-app inventory display shows current state.

### No backfill

Existing rows have `last_low_supply_alert_sent_at = NULL`, so the next cron run will alert any genuinely-low item once and start its cooldown. Worst case: a user who got a low-supply email yesterday gets one more tomorrow morning. One-time minor inconvenience.

---

## Change 2 — `email_marketing` two-way sync

### Problem

`user_profiles.email_marketing` is exposed in the EmailSettings UI and accepts writes via `/api/email/settings`, but **no email-sending code currently consults it**. The campaign-queue cron only checks `newsletter_subscribers.unsubscribed_at`. Result: a user can toggle "marketing emails" off in their dashboard and continue to receive newsletter blasts.

### Approach: two-way sync at write time

User ↔ subscriber are matched by lowercased email address. Two-way means: any change to one side propagates to the other. Read-time enforcement remains belt-and-suspenders in the campaign-queue cron.

### Read site — `/api/cron/campaign-queue/route.ts`

After the existing `if (subscriber.unsubscribed_at) ...` skip, add a Clerk lookup of the matching SR user by email; if found and the user_profiles `email_marketing` is `false`, skip with a logged reason. The existing `unsubscribed_at` check stays as the primary gate; the profile check is defensive.

### Write site — `/api/email/settings/route.ts`

The POST handler currently writes the four flags to `user_profiles`. Extend it: when `email_marketing` is supplied in the body and the value flips, also update the matching `newsletter_subscribers` row by email:

- `email_marketing` → `false`: set `newsletter_subscribers.unsubscribed_at = now()` for the matching subscriber row. If no subscriber row exists, no-op (the user isn't subscribed, so there's nothing to suppress).
- `email_marketing` → `true`: clear `unsubscribed_at` on the matching subscriber row. If no subscriber row exists, no-op (toggling on doesn't auto-create a subscription; that requires the landing-page signup flow).

### Write site — `/api/newsletter/unsubscribe/route.ts`

After setting `subscriber.unsubscribed_at`, look up the SR user by the subscriber's email (Clerk lookup); if a `user_profiles` row exists, set `email_marketing = false` on it. Profile UI now reflects the unsubscribed state.

### Email-normalization migration

A one-time SQL pass to lowercase + trim subscriber emails, so future joins are exact:

```sql
update newsletter_subscribers set email = lower(trim(email)) where email != lower(trim(email));
```

(Run in Supabase, manual.)

### Backfill of inconsistent rows

Existing users whose `unsubscribed_at IS NOT NULL` but `email_marketing = true` should be reconciled to match the subscriber state, since the email-link unsubscribe is the authoritative explicit user action. Approach: a one-off admin endpoint at `/api/admin/backfill-email-marketing/route.ts` that:

1. Iterates all `user_profiles` rows with `email_marketing = true`.
2. For each, pulls the user's email from Clerk.
3. Looks up `newsletter_subscribers` by lowercased email.
4. If a matching row exists with `unsubscribed_at IS NOT NULL`, flips `user_profiles.email_marketing` to `false`.
5. Returns counts.

Triggered manually once at deploy time; admin-only. After the deploy is healthy, the file can be deleted.

### UI label

Quick polish during implementation: in `src/components/EmailSettings.tsx`, confirm the label for the `email_marketing` toggle is accurate. *"Newsletter emails"* is more precise than *"Marketing emails"* since the only thing this toggle gates is newsletter campaigns.

---

## Change 3 — Master unsubscribe toggle

### Schema

```sql
alter table user_profiles
  add column if not exists email_unsubscribed_all boolean not null default false;
```

### Cron-side enforcement

Each email-sending cron route gains a top-of-loop check that skips users when `email_unsubscribed_all = true`. Routes affected:

- `/api/cron/daily-reminders` — already selects `email_reminders_enabled, email_consolidated_summary`; add `email_unsubscribed_all` and short-circuit before existing checks.
- `/api/cron/weekly-summary` — already selects `email_weekly_summary`; same pattern.
- `/api/cron/low-supply` — already selects `email_reminders_enabled`; same pattern.
- `/api/cron/birthday-emails` — currently doesn't read `user_profiles` flags; add `email_unsubscribed_all` to the candidate select and filter.
- `/api/cron/campaign-queue` — uses the Clerk lookup added in Change 2; while reading the matching `user_profiles` row, also consult `email_unsubscribed_all`.

### API

`/api/email/settings/route.ts`:

- GET: include `email_unsubscribed_all` in the response payload.
- POST: accept `email_unsubscribed_all` in the body and write it through. When set to `true`, also write `newsletter_subscribers.unsubscribed_at = now()` for the matching subscriber row (consistency with Change 2's two-way sync, so external systems see the suppression).

When `email_unsubscribed_all` is set back to `false`, do **not** auto-clear `newsletter_subscribers.unsubscribed_at`. The user must separately re-enable `email_marketing` if they want to re-subscribe to newsletters specifically. This keeps newsletter opt-in explicit.

### UI

In `src/components/EmailSettings.tsx`:

- New top-of-panel toggle labeled *"Unsubscribe from all emails"*.
- When ON: the four individual toggles below it visually disable (`opacity-50 pointer-events-none`). A small subhint reads *"Individual settings preserved — turn this off to use them again."*
- When OFF: individual toggles work as today.

### Backfill

None. Default `false` keeps existing users in their current state.

---

## Change 4 — Re-analyze UX

Two coupled UI changes that move the re-analyze decision off the Stack page card and into the Analysis page itself, with confirmation.

### A) Stack page entry-point card simplification

In `src/components/StackAnalysisCard.tsx`, collapse the fresh/stale branches into a single render when an analysis exists:

- **No analysis yet** → "Analyze my stack" button, links to `/dashboard/analysis`. (Unchanged.)
- **Analysis exists** (fresh or stale) → "View analysis" button, links to `/dashboard/analysis`. The "Last analyzed [date]" label stays. The "X items changed since" indicator still renders when `stack_changed_since`, as a soft informational nudge — but it does not change the button.

The "Re-analyze" button is removed from this card entirely. Re-analyze decisions happen only on the analysis page.

### B) Analysis page re-analyze confirmation modal

In `src/app/dashboard/analysis/page.tsx`, the existing Re-analyze button (visible only when `stack_changed_since` and an analysis exists) gets a confirmation gate.

- New state: `const [showReanalyzeConfirm, setShowReanalyzeConfirm] = useState(false);`
- Re-analyze button `onClick` changes from `handleRun` to `() => setShowReanalyzeConfirm(true)`.
- Inline modal (small JSX block, no new component file) shows:

  > **Re-analyze your stack?**
  >
  > Your current analysis and any follow-up questions you've asked will be replaced with a new analysis based on your updated stack.
  >
  > [Cancel] [Re-analyze]

- Cancel: dismiss modal, no run.
- Re-analyze (modal button): close modal, call `handleRun()`.

### Edge cases

- First-ever analysis (`a === null`) → no modal. Nothing to overwrite. The "Analyze my stack" button (visible when `!a`) calls `handleRun` directly.
- Modal dismissed by clicking the backdrop or pressing Esc → treated as Cancel.
- Modal open while a re-analyze is somehow already running (shouldn't happen because the button is disabled when `running`, but defensively the modal's [Re-analyze] button checks `running` before firing).

---

## Change 5 — Printable analysis

### Print button

A small "Print 🖨️" button on the analysis page header, near the existing Re-analyze button (or just below it on narrow screens). Plain `<button onClick={() => window.print()}>`. Visible whenever an analysis exists. Hidden in loading, error, plan-locked, and disclaimer-modal states.

### Print-only header block

A new block at the top of the printable area, visible *only* on print (`hidden print:block`):

```
For: {firstName} {lastName}
Printed: {today's date}
```

- **User name**: use Clerk's `useUser()` hook (already-imported at the top of the file or added). Pull `user.firstName` and `user.lastName`. Fall back to the email local-part (the segment before `@` in the user's primary email address) if both are null.
- **Printed date**: state initialized to `new Date().toLocaleDateString()` at mount. Optionally refreshed via `window.addEventListener("beforeprint", ...)` for absolute precision; mount-time accuracy is fine for v1.

The on-screen page title "Stack Analysis" and the "Based on N supplements · Analyzed [date]" line stay visible in both views — no change needed there.

### Print stylesheet

Add `@media print` rules (Tailwind print variants where possible). Hide on print:

- `TopNav`, `BottomNav`
- The Re-analyze + Print buttons themselves
- The "X/20 follow-ups used" counter
- The existing-user demographics nudge banner
- The "Ask a follow-up" UI (textarea + Cancel/Ask buttons) on each card — but **keep** the rendered Q&A pairs above it, so saved questions and answers print
- All error states, loading skeletons, the demographics-banner

Keep on print:
- Page title + "Based on N supplements · Analyzed [date]"
- Print-only header block (For: / Printed:)
- All five sections with findings + answers
- All saved Q&A pairs
- Disclaimer banner ("Informational only. Talk to your doctor...")

### Page-break friendliness

- `break-inside-avoid` on each `AnalysisFindingCard` and `AnalysisRecommendationCard` wrapper, so cards don't split across pages.
- `break-after-avoid` on each section header so a header doesn't end up alone at the bottom of a page.

### Implementation pattern

Use Tailwind's `print:` variants where possible:

```tsx
<button className="print:hidden" onClick={...}>Re-analyze</button>
```

Wrap the per-card "Ask follow-up" UI in a `<div className="print:hidden">` while leaving the Q&A history block above it untouched.

### Browser caveat

Print rendering varies between Chrome, Safari, and Firefox. The CSS will be conservative; iteration may be needed during QA. The user has explicitly flagged they'll test the print output.

---

## Cross-cutting summary

### Database migrations (3 new files, run in order in Supabase)

```
database-low-supply-cooldown.sql       — last_low_supply_alert_sent_at on user_stacks
database-email-unsubscribed-all.sql    — email_unsubscribed_all on user_profiles
database-newsletter-email-normalize.sql — one-time lowercase/trim of subscriber emails
```

### Code changes

| File | Change |
|------|--------|
| `src/app/api/cron/low-supply/route.ts` | Add 14-day cooldown filter; bulk-update `last_low_supply_alert_sent_at` on successful send |
| `src/app/api/cron/campaign-queue/route.ts` | Defensive `email_marketing` + `email_unsubscribed_all` check via Clerk lookup |
| `src/app/api/cron/daily-reminders/route.ts` | Add `email_unsubscribed_all` filter |
| `src/app/api/cron/weekly-summary/route.ts` | Add `email_unsubscribed_all` filter |
| `src/app/api/cron/birthday-emails/route.ts` | Add `email_unsubscribed_all` filter |
| `src/app/api/email/settings/route.ts` | Add `email_unsubscribed_all` and `email_marketing` two-way sync writes |
| `src/app/api/newsletter/unsubscribe/route.ts` | On unsubscribe, also flip matching `user_profiles.email_marketing` |
| `src/app/api/admin/backfill-email-marketing/route.ts` (new) | One-off backfill for inconsistent existing rows; deleted after deploy |
| `src/components/EmailSettings.tsx` | New master "Unsubscribe from all emails" toggle; visual disable of individuals when ON; review marketing-toggle label |
| `src/components/StackAnalysisCard.tsx` | Collapse fresh/stale branches into single "View analysis" button; keep informational labels |
| `src/app/dashboard/analysis/page.tsx` | Re-analyze confirmation modal; print button; print-only header block; `useUser()` hook for name |
| `src/components/AnalysisFindingCard.tsx` | Wrap Ask UI in `print:hidden` |
| `src/components/AnalysisRecommendationCard.tsx` | Same |
| `src/app/globals.css` (or component-level styles) | `@media print` rules: page-break behavior, hidden chrome |

### Build sequence

Each step ships in a working state.

1. **DB migrations + email normalization SQL.** Three SQL files written; user runs them in Supabase before dependent code lands.
2. **Low-supply cooldown** (Change 1) — cleanest, isolated, ships first.
3. **`email_marketing` two-way sync + backfill endpoint** (Change 2) — adds the Clerk lookup pattern in `/api/cron/campaign-queue`, wires the writes in `/api/email/settings` and `/api/newsletter/unsubscribe`, runs the backfill manually, and deletes the backfill endpoint after deploy.
4. **Master unsubscribe toggle** (Change 3) — adds the column, wires all five crons. Reuses the Clerk lookup added in step 3 for the campaign-queue route.
5. **Stack card simplification + analysis confirmation modal** (Change 4) — UI-only, isolated.
6. **Printable analysis** (Change 5) — UI + CSS, isolated. Manual QA by user includes a real print test.
7. **Manual QA pass.**

### Manual QA matrix

(No automated test suite, so spelled out.)

- Low-supply cron: alert sent on first low; silent for 14 days; re-alerts after 14 days if still low.
- Restock + re-deplete within 14 days: silent (cooldown still active).
- Restock + re-deplete after 14 days: re-alerts.
- `email_marketing` toggle off in app: next campaign-queue tick skips. Newsletter subscriber row's `unsubscribed_at` is now set.
- Email-link unsubscribe: profile shows `email_marketing = false` after.
- Toggle `email_marketing` back on: subscriber row's `unsubscribed_at` cleared.
- User without subscriber row toggles `email_marketing` on/off: no-op (no subscriber to update). Confirm no errors.
- Master unsubscribe ON: no daily reminder, weekly summary, low-supply, birthday email, or newsletter is sent. Individual toggles in UI visually disabled.
- Master unsubscribe OFF: previous individual settings preserved and respected.
- Stack card: shows "View analysis" when an analysis exists, regardless of stack-changed state. "X items changed since" still renders as info.
- Analysis page: "Re-analyze" click shows confirmation modal. Cancel keeps existing analysis. Confirm runs the analysis.
- First-ever analysis: no confirmation modal (nothing to overwrite).
- Print: button visible. Print preview shows clean layout with name, date, all sections, Q&A history, disclaimer. Buttons, nav, follow-up textareas hidden. No section header orphaned at bottom of page.

### Out of scope (future work)

- Granular cadence presets (e.g., "weekly digest only" bundled toggle) — deferred per Section 1 scope decision.
- Migrating subscriber-table identity to be `user_id`-keyed instead of email-keyed (would simplify joins but is a bigger refactor).
- Auto-creating newsletter subscriptions when a user toggles `email_marketing` to true (currently a no-op for users without a subscriber row).
- Print quality polish beyond the conservative initial CSS — iteration during QA.
- Server-side `beforeprint` precise date capture — mount-time is good enough for v1.
- Admin chart for email-spam-suppression counts (telemetry could be added if useful).
- Dropping `email_marketing` toggle in favor of a single source of truth in `newsletter_subscribers` — this would require subscriber rows for every SR user, which doesn't currently exist.
