# Stack Analysis — Follow-ups, Demographics, Re-analyze Gating

**Date:** 2026-04-26
**Status:** Approved (design)

## Summary

Three coupled changes to the AI Stack Analysis feature:

1. **Re-analyze gating.** The "Re-analyze" button is only shown when the user's stack has changed since the last analysis. The manual-rerun-with-no-changes pathway is removed entirely, along with the 3/day rate limit that was protecting it.
2. **Demographics for personalized analysis.** Optional sex + birthday fields on `user_profiles`. Sex and a derived age band feed into the analysis prompt for more demographic-relevant guidance. Birth month/day enable a Today-page birthday banner and a once-per-year birthday email.
3. **Pro follow-ups.** Pro users can ask a single-shot follow-up question on any individual finding or recommendation in their analysis. Answers persist with the analysis. Capped at 20 follow-ups per analysis to bound model cost.

## Change 1 — Re-analyze gating & rate-limit removal

### Behavior

- `/dashboard/analysis`: the "Re-analyze" button (and its description) only renders when `stack_changed_since === true`, or when no analysis exists yet. When the latest analysis matches the current stack, the page shows the analysis with no run-action button.
- `/dashboard/stack` entry-point card: the existing "Re-analyze" CTA already keys off `stack_changed_since`. When fresh, the card keeps its existing "View results" button. No structural change here.

### Manual-rerun cap removal

The 3/day manual-rerun rate limit goes away entirely:

- Remove `MANUAL_RERUN_DAILY_CAP` and `manual_runs_used_today` plumbing from `lib/analysis-types.ts`, `api/analysis/run`, `api/analysis/latest`, the analysis page, and `StackAnalysisCard.tsx`.
- The `429 rate_limited` error response on `/run` is gone.
- The `trigger` column on `stack_analyses` keeps the `'manual_rerun'` enum value for backward compatibility with existing rows. New code never produces it; new rows are always `'initial'` or `'stack_changed'`.

### Server defense

`POST /api/analysis/run` rejects when the stack hasn't changed AND a prior analysis exists, with `409 nothing_to_analyze`. The UI never produces this error in normal flow, but it defends against direct-API calls bypassing the now-hidden button.

### Out of scope

- Backfilling or removing existing `manual_rerun` rows.
- Dropping the `manual_rerun` enum value (safe to defer indefinitely).

---

## Change 2 — Demographics + birthday celebration

### Schema additions on `user_profiles`

```sql
alter table user_profiles
  add column if not exists sex text check (sex in ('male','female')),
  add column if not exists birth_month smallint check (birth_month between 1 and 12),
  add column if not exists birth_day   smallint check (birth_day between 1 and 31),
  add column if not exists birth_year  smallint check (birth_year between 1900 and 2026),
  add column if not exists last_birthday_email_year smallint;
```

All fields are nullable. "Prefer not to say" for sex stores as `null` — no separate sentinel value. The four birthday columns are independently nullable so the user can fill any subset (e.g., month/day only, no year).

### Three disclosure levels (emergent from optional fields)

1. **Skip everything** → no celebration, no demographic personalization. Generic analysis, same as today.
2. **Month + day only** → birthday banner on Today + once-per-year email. Analysis stays generic (no `birth_year` → no age band).
3. **Full birthday** → celebration features + age-personalized analysis. The exact birth year never reaches the LLM; only a derived age band does.

### Collection point

Extend the existing `AnalysisDisclaimerModal.tsx`. Below the required "I understand" checkbox, add an "Optional — for personalized results" section with:

- Sex dropdown: Male / Female / Prefer not to say.
- Birthday: three small inputs (Month / Day / Year), each blankable. Helper text: *"Year unlocks age-personalized analysis. Skip the year and we'll just send a happy birthday note."*

The modal's `[Continue]` button is enabled by the disclaimer checkbox alone — demographics are never required to proceed. On Continue, the form posts to `POST /api/analysis/disclaimer/accept` (extended to accept these fields in the same body).

### Editing later

A new "Personal" section on `/dashboard/profile` lets users update or clear all demographic fields. Saves via a new `PUT /api/profile/demographics` endpoint.

### Existing-user upgrade path

Users who already accepted the disclaimer at version 1 (before this spec ships) won't see the disclaimer modal again, so they need a different path to discover the new demographics fields. On `/dashboard/analysis`, when the user has accepted the disclaimer AND all four demographic columns are null, show a small dismissible banner near the page header: *"💡 Personalize your analysis — add age & sex on your profile."* Clicking the banner deep-links to the new `/dashboard/profile` "Personal" section. Dismissed state persists in `localStorage` (`sr.demographics_banner_dismissed = '1'`) and the banner doesn't reappear after dismissal. New users hitting the modal don't see this banner — they're already prompted there.

### Prompt wiring

`runStackAnalysis()` in `src/lib/analysis.ts` gains an optional `user` parameter:

```ts
type AnalysisUserContext = {
  sex: 'male' | 'female' | null;
  age_band: '18-24' | '25-34' | '35-44' | '45-54' | '55-64' | '65+' | null;
};
```

`/api/analysis/run` loads the user's `user_profiles` row, derives the age band server-side from `birth_year` if present, and passes the result. The LLM receives only the band — exact birth year never leaves the server.

Derived age below 18 → `age_band = null` (the personalization is omitted for minors; the analysis still runs, just without demographic weighting).

When at least one field is non-null, the user message JSON gains a sibling object:

```json
{ "stack": [...], "user": { "sex": "female", "age_band": "35-44" } }
```

When both fields are null, the `user` block is omitted entirely (keeps the system prompt cache hot).

System prompt gets a small appended clause:

> *"If the request includes a `user` object, weight findings and recommendations to that demographic where research supports it (e.g., iron needs for menstruating users; sarcopenia/protein for 55+; bone health for postmenopausal)."*

`PROMPT_VERSION` bumps from 1 to 2 so historical rows stay attributable to the older prompt.

### Birthday celebration

**Today-page banner.** When the user opens `/dashboard` (Today), the page server-computes today's date in the user's saved timezone and compares it to `birth_month`/`birth_day`. On a match, render a small celebratory card at the top of the page (e.g., 🎉 *"Happy birthday from Stack Ritual"*). No persistence needed — the card naturally disappears the next day. Skipped silently if `birth_month` or `birth_day` is null, or if the user has no timezone set.

**Birthday email.** A new Vercel cron at `/api/cron/birthday-emails` runs **hourly**. For each `user_profiles` row with both `birth_month` and `birth_day` set and a known timezone:

1. Compute the user's local date and hour using their `timezone`.
2. If local hour is `8` AND local month/day match `birth_month`/`birth_day` AND `last_birthday_email_year` < current year: send the birthday email via Resend, then update `last_birthday_email_year` to current year.

The hourly cadence + year stamp is self-deduping: at most one email per user per year regardless of cron retries, DST edge cases, or deploy timing.

Cron registration in `vercel.json`:

```json
{ "path": "/api/cron/birthday-emails", "schedule": "0 * * * *" }
```

**Email template.** New entry in `src/lib/emails.ts`: short, on-brand, no upsell. ~3 sentences. Final wording during implementation.

### Edge cases

- **Feb 29 birthdays** — never trigger in non-leap years. Acceptable v1; flag for future.
- **Users without timezone** — banner and email both skip silently.
- **Resend down at trigger hour** — cron retries naturally next hour; year-stamp only writes on successful send.
- **User edits/clears birthday after email already sent that year** — year stamp prevents re-send. Acceptable.
- **All demographic fields null** — user message omits the `user` block entirely. Analysis remains generic.

---

## Change 3 — Pro follow-up Q&A

### Shape

Per-finding, single-shot Q&A. Each finding (and recommendation) on the analysis page gets its own follow-up panel. A user with Pro status can ask a question scoped to that one finding; the model returns a 1-3 sentence answer, which renders inline below the question. Each ask is independent — no thread state, no edit/regenerate.

### Schema

New table:

```sql
create table if not exists analysis_followups (
  id uuid primary key default gen_random_uuid(),
  analysis_id uuid not null references stack_analyses(id) on delete cascade,
  user_id text not null,

  section text not null check (section in ('synergies','interactions','timing','redundancies','recommendations')),
  finding_index int not null,

  question text not null,
  answer text not null,

  created_at timestamptz not null default now(),

  model text not null,
  prompt_version int not null default 1,
  input_tokens int,
  output_tokens int,
  cached_input_tokens int,
  duration_ms int
);

create index analysis_followups_analysis_idx on analysis_followups (analysis_id, created_at);
create index analysis_followups_user_idx on analysis_followups (user_id);

alter table analysis_followups enable row level security;
create policy "users read own followups" on analysis_followups for select
  using (auth.jwt() ->> 'sub' = user_id);
-- writes server-only via supabaseAdmin; no insert policy
```

`(analysis_id, section, finding_index)` together identify a specific finding. Index stability is fine: `stack_analyses.analysis` JSON is immutable once written.

### API

**`POST /api/analysis/followups`**

Request body:
```ts
{ analysis_id: string, section: 'synergies' | 'interactions' | 'timing' | 'redundancies' | 'recommendations', finding_index: number, question: string }
```

Validations (in order):
1. Clerk auth.
2. Plan is `pro` and `status='active'`.
3. Analysis row exists and `user_id` matches.
4. `count(*)` of existing followups for that `analysis_id` is < 20.
5. `section`/`finding_index` resolves to a real finding in the analysis JSON.
6. Question is non-empty and ≤ 500 characters.

Then call the model, persist the row, return:

```ts
{ id: string, question: string, answer: string, created_at: string }
```

Errors:
- `403 plan_required` `{ plan: 'pro' }` — user is Free or Plus.
- `404 not_found` — analysis missing or not owned, or finding index invalid.
- `409 cap_reached` `{ used: 20, cap: 20 }` — 20 followups already exist for this analysis.
- `500 followup_failed` — model error or persistence error. No row written.

**`GET /api/analysis/latest` (extended)**

Existing endpoint gains a `followups` field on its response:

```ts
followups: Array<{
  id: string;
  section: 'synergies' | 'interactions' | 'timing' | 'redundancies' | 'recommendations';
  finding_index: number;
  question: string;
  answer: string;
  created_at: string;
}>
```

All followups for the latest analysis row, in `created_at` order. The analysis page groups them client-side by `section + finding_index`. One fetch loads the whole page including Q&A history.

The `rate_limit` field is removed from this response (Change 1).

Historical (non-latest) analyses don't surface follow-ups in v1 — only the latest analysis is viewable.

### LLM call

- **Model:** `claude-sonnet-4-6` (same as the parent analysis).
- **System block (cached, identical across all users and calls):** instructions to stay focused on the one finding, ≤3 sentences, same hedging/tone rules as the analysis prompt, no medical advice, no brand recommendations.
- **User message:** JSON containing the finding (title, body, severity if present, involves), the user's stored demographics if any (same shape as the analysis prompt), and the question.
- **No tool_use.** Output is plain prose. Structured output would be over-engineering for a single short answer.
- **Caching:** system block uses `cache_control: ephemeral`. High hit rate across users.
- **Token budget:** `max_tokens: 1024` — generous for 1-3 sentences but bounded.
- **`prompt_version`** stamped on every row (starts at 1; bumps independently of the analysis prompt).

### UI

On `/dashboard/analysis`, both `AnalysisFindingCard` and `AnalysisRecommendationCard` gain a follow-up panel at the bottom of each card.

**For Pro users:**
- Render existing Q&A pairs for this finding inline (question in muted text, answer below).
- Below the list: an "Ask a follow-up" textarea (collapsed to a single-line clickable hint until activated) + "Ask" button. Char counter to 500.
- Cap indicator at the page header: *"3/20 follow-ups used on this analysis."* When 20 is hit, the input on every card becomes disabled with text *"You've used all 20 follow-ups for this analysis. Update your stack to start fresh."*
- Loading state during a call: disable button, subtle spinner. ~3-10s typical.
- Error state: inline red message below the input. Failures don't decrement the cap (we only persist on success).

**For Free/Plus users:**
- Locked-state link: *"🔒 Ask follow-ups — Pro feature"* → opens upgrade prompt.

**During an in-flight `Re-analyze`:** the follow-up UI is disabled across all cards (`running === true`).

### Gating decision

Follow-ups are revenue-costing per call but the per-analysis cap bounds worst-case cost (~$0.10/analysis). Gate on `plan === 'pro'` alone — comped Pros (early adopters with `plan='pro'` but no `stripe_customer_id`) get the feature too, since they were promised "Pro for life" and the cost is small and bounded. This is an explicit deviation from the `paying_vs_comped_pro` memory rule; revisit if usage suggests otherwise.

### Cost estimate

- Per follow-up: ~500 input tokens (mostly cached after first call), ~200 output → ~$0.005/call.
- Per analysis at the 20-cap ceiling: ~$0.10.
- Realistic: most users use 0–5 → ~$0.025/analysis on average.

Telemetry columns are captured (`input_tokens`, `output_tokens`, `cached_input_tokens`, `duration_ms`) on every row so an admin spend chart can be built later without a backfill.

### Edge cases

- **Question length abuse** — 500-char server-side cap. Client-side counter + truncation.
- **Anthropic API error** — `500 followup_failed`. No row written, cap not decremented. Inline retry.
- **User downgrades Pro → Plus mid-analysis** — they can still read existing follow-ups (data persists), but new asks return `403 plan_required`.
- **Stack changes mid-conversation** — when the user re-analyzes, follow-ups stay attached to the old analysis row. New analysis starts fresh with no inherited Q&As. Old Q&As effectively disappear from the page but persist in DB.
- **Concurrent asks (rapid double-click, etc.)** — the cap check is read-then-write; minor race possible. Tolerable: in the worst case a user gets 21 follow-ups instead of 20. Don't bother with a transaction or row-level lock for v1.
- **Direct API call bypassing the UI** — server enforces all gates (plan, cap, ownership, finding existence). UI is decoration.
- **Deletion** — deleting a `stack_analyses` row cascades to its followups via FK.

---

## Cross-cutting summary

### Database migrations (3 files, run in order in Supabase)

```
database-user-demographics.sql       — sex, birth_month, birth_day, birth_year on user_profiles
database-birthday-email-tracking.sql — last_birthday_email_year on user_profiles
database-analysis-followups.sql      — analysis_followups table with FK + RLS + indexes
```

Per the project's manual-migration convention. No backfills required.

### Code changes

| File | Change |
|---|---|
| `src/lib/analysis-types.ts` | Drop `MANUAL_RERUN_DAILY_CAP`. Add `Demographics`, `AgeBand`, `Followup` types. Bump `PROMPT_VERSION` to 2. Add `FOLLOWUPS_PER_ANALYSIS_CAP = 20` and `FOLLOWUP_PROMPT_VERSION = 1`. |
| `src/lib/analysis.ts` | Accept optional `user: { sex, age_band }`. Append demographic clause to system prompt. |
| `src/lib/analysis-followups.ts` (new) | `runFollowup(finding, demographics, question)` — Anthropic call, no tool_use, cached system block. |
| `src/lib/age-band.ts` (new) | Pure function: `birthYearToAgeBand(year, today)` → one of the 6 bands or null. |
| `src/lib/emails.ts` | Add `sendBirthdayEmail(to, firstName)` template. |
| `src/app/api/analysis/run/route.ts` | Load demographics. Drop rate-limit branch. Return `409 nothing_to_analyze` when stack unchanged + prior exists. |
| `src/app/api/analysis/latest/route.ts` | Drop `rate_limit` from response. Add `followups` array. |
| `src/app/api/analysis/disclaimer/accept/route.ts` | Accept optional `{ sex, birth_month, birth_day, birth_year }` in body, persist alongside disclaimer. |
| `src/app/api/analysis/followups/route.ts` (new) | `POST` — validate, call model, persist, return row. |
| `src/app/api/profile/demographics/route.ts` (new) | `PUT` — update the four demographic columns from profile page. |
| `src/app/api/cron/birthday-emails/route.ts` (new) | Hourly. Sends email to users whose local 8am matches their birthday this year. |
| `src/app/dashboard/analysis/page.tsx` | Gate "Re-analyze" on `stack_changed_since`. Drop rate-limit text. Pass followups into cards. |
| `src/components/AnalysisDisclaimerModal.tsx` | Add optional sex + birthday inputs. Submit alongside disclaimer accept. |
| `src/components/AnalysisFindingCard.tsx` | Add follow-up panel (Pro-gated). |
| `src/components/AnalysisRecommendationCard.tsx` | Same. |
| `src/components/StackAnalysisCard.tsx` | Drop rate-limit message. Gate "Re-analyze" CTA on `stack_changed_since`. |
| `src/app/dashboard/profile/page.tsx` | Add "Personal" section with demographic editing. |
| `src/app/dashboard/page.tsx` (Today) | Render birthday banner when local date matches. |
| `vercel.json` | Add `0 * * * *` cron for `/api/cron/birthday-emails`. |

### Build sequence

Each step ships in a working state.

1. **DB migrations.** Write all 3 SQL files. User runs them in Supabase before dependent code lands.
2. **Re-analyze gating + rate-limit removal.** Smallest, fully independent. Easy to review and ship.
3. **Demographics: storage + modal collection + profile editing + prompt wiring.** One cohesive PR — types, modal, profile page, both API routes (`/disclaimer/accept` extension and new `/profile/demographics`), prompt update with bumped `PROMPT_VERSION`. Existing analysis users get prompted on next visit (no demographics row → modal-supplement renders).
4. **Birthday celebration: Today banner + email template + hourly cron.** Depends on step 3 columns existing.
5. **Pro follow-ups: table + types + endpoint + UI + Pro gating + cap enforcement.** Largest, ships last so the foundation is stable.
6. **Manual QA pass.** Per the matrix below.

### Manual QA matrix

(No automated test suite, so spelled out.)

- **Re-analyze button** — hidden when stack unchanged, visible when changed, returns `409 nothing_to_analyze` when called directly with unchanged stack. `StackAnalysisCard` reflects the same state.
- **Demographics input** — skipping all fields → analysis runs, no `user` block sent. Year-omitted birthday → no age band sent, banner/email still active. Profile edit clears values cleanly.
- **Birthday banner** — shows on the day in user's TZ, hidden before/after, hidden if no birthday or no TZ.
- **Birthday email** — sends once per year, doesn't double-fire across hourly runs, skipped without TZ. Year stamp updates only on successful Resend response.
- **Follow-ups Free/Plus** — see locked state and upgrade prompt; cannot reach `POST /api/analysis/followups` (returns 403).
- **Follow-ups Pro** — cap correctly enforced at 20; question persists across reload; cap-reached state explains how to refresh; follow-up UI disabled while a re-analyze is in flight.
- **Pro → Plus downgrade** — existing Q&A still readable; new asks 403.

### Out of scope (future work)

- Birthday email A/B copy variants and engagement tracking.
- Admin dashboard chart for analysis/followup token spend (telemetry captured; visualization is future).
- Threaded follow-ups or general-chat panel.
- Demographic-aware mood correlation (rolls into the existing v1-spec mood-correlation future work).
- Dropping the `manual_rerun` enum value from `stack_analyses.trigger` (cleanup-only; safe to defer indefinitely).
- Surfacing follow-ups on historical (non-latest) analyses.
- Stripe-paying-Pro vs comped-Pro discrimination on follow-ups (gated on `plan='pro'` alone for v1).
- Feb 29 birthday handling.
