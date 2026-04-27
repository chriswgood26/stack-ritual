# Email Reduction + Analysis UX Polish — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Five coupled improvements: (1) low-supply alert cooldown so persistently-low items don't spam users daily; (2) wire the dead `email_marketing` toggle and keep it in two-way sync with `newsletter_subscribers.unsubscribed_at`; (3) add a master "unsubscribe from all emails" override on `user_profiles`; (4) simplify the Stack page card to always show "View analysis" + add a re-analyze confirmation modal on the Analysis page; (5) make the Analysis page printable with user name + print date.

**Architecture:** Additive only. Two new columns on existing tables (`user_stacks.last_low_supply_alert_sent_at`, `user_profiles.email_unsubscribed_all`), one one-time email-normalization SQL, one one-off admin backfill endpoint (deleted after deploy). Five existing cron routes gain a master-toggle skip; one cron and two API routes participate in the two-way email_marketing sync. UI changes touch the EmailSettings panel, the Stack analysis card, the analysis page, and the two analysis cards.

**Tech Stack:** Next.js 16 App Router · Clerk auth · Supabase (`supabaseAdmin`) · Resend · Tailwind 4 (using `print:` variants).

> **No automated tests in this project** (see `CLAUDE.md`). Verification uses `npm run lint`, `npm run build`, and a manual QA matrix at the end. Each task ends with a commit. Don't push to origin until Task 7.

**Spec:** `docs/superpowers/specs/2026-04-27-email-reduction-and-analysis-ux-design.md`

---

## File Structure

| File | Status | Responsibility |
|------|--------|----------------|
| `database-low-supply-cooldown.sql` | new | `last_low_supply_alert_sent_at` on `user_stacks` |
| `database-email-unsubscribed-all.sql` | new | `email_unsubscribed_all` on `user_profiles` |
| `database-newsletter-email-normalize.sql` | new | One-time lowercase + trim of subscriber emails |
| `src/app/api/cron/low-supply/route.ts` | modify | Add 14-day cooldown filter; bulk-stamp on send |
| `src/app/api/cron/campaign-queue/route.ts` | modify | Defensive Clerk lookup of matching SR user; skip if `email_marketing=false` or `email_unsubscribed_all=true` |
| `src/app/api/cron/daily-reminders/route.ts` | modify | Add `email_unsubscribed_all` filter |
| `src/app/api/cron/weekly-summary/route.ts` | modify | Add `email_unsubscribed_all` filter |
| `src/app/api/cron/birthday-emails/route.ts` | modify | Add `email_unsubscribed_all` filter |
| `src/app/api/email/settings/route.ts` | modify | Accept `email_unsubscribed_all`; on `email_marketing` flip, sync `newsletter_subscribers.unsubscribed_at`; on `email_unsubscribed_all` ON, also flip subscriber row |
| `src/app/api/newsletter/unsubscribe/route.ts` | modify | After unsubscribing subscriber, look up matching SR user via Clerk and flip `email_marketing=false` |
| `src/app/api/admin/backfill-email-marketing/route.ts` | new (one-off) | Reconcile inconsistent existing rows; deleted after deploy |
| `src/components/EmailSettings.tsx` | modify | New master "Unsubscribe from all emails" toggle at top; visual disable of individual toggles when ON; rename "Tips & updates" if desired |
| `src/components/StackAnalysisCard.tsx` | modify | Collapse fresh/stale into single "View analysis" branch |
| `src/app/dashboard/analysis/page.tsx` | modify | Re-analyze confirmation modal; Print button; `useUser()` for name; print-only header block; `print:hidden` on chrome |
| `src/components/AnalysisFindingCard.tsx` | modify | Wrap Ask UI in `print:hidden`; add `break-inside-avoid` |
| `src/components/AnalysisRecommendationCard.tsx` | modify | Same |

---

### Task 1: Database migrations

**Files:**
- Create: `database-low-supply-cooldown.sql`
- Create: `database-email-unsubscribed-all.sql`
- Create: `database-newsletter-email-normalize.sql`

- [ ] **Step 1: Write `database-low-supply-cooldown.sql`**

```sql
-- Per-item cooldown for low-supply alerts. The /api/cron/low-supply route
-- writes this timestamp after a successful send and skips items still
-- inside the 14-day cooldown window. NULL means "never alerted yet".
-- See docs/superpowers/specs/2026-04-27-email-reduction-and-analysis-ux-design.md

alter table user_stacks
  add column if not exists last_low_supply_alert_sent_at timestamptz;
```

- [ ] **Step 2: Write `database-email-unsubscribed-all.sql`**

```sql
-- Master "unsubscribe from all emails" override on user profile. When true,
-- every email-sending cron skips this user before consulting individual
-- per-channel toggles. Default false keeps existing users in current state.

alter table user_profiles
  add column if not exists email_unsubscribed_all boolean not null default false;
```

- [ ] **Step 3: Write `database-newsletter-email-normalize.sql`**

```sql
-- One-time normalization so future joins between user_profiles (Clerk email)
-- and newsletter_subscribers (signup email) are exact-match. Idempotent —
-- safe to re-run. Run BEFORE the email_marketing two-way sync code lands.

update newsletter_subscribers
   set email = lower(trim(email))
 where email is not null
   and email <> lower(trim(email));
```

- [ ] **Step 4: Tell the user to run all three in Supabase**

Pause and tell the user:
> "Three migrations are ready: `database-low-supply-cooldown.sql`, `database-email-unsubscribed-all.sql`, `database-newsletter-email-normalize.sql`. Per the project's manual-migrations rule, please run them in Supabase in that order, then confirm so I continue. (`alter table … add column if not exists` is idempotent; the normalize update is also idempotent — safe to re-run.)"

Wait for "ok ran them" before continuing.

- [ ] **Step 5: Commit**

```bash
git add database-low-supply-cooldown.sql database-email-unsubscribed-all.sql database-newsletter-email-normalize.sql
git commit -m "$(cat <<'EOF'
feat(emails): db migrations for low-supply cooldown + master unsubscribe

Three additive migrations: per-item cooldown timestamp on user_stacks for
the low-supply cron; master email-unsubscribed-all flag on user_profiles
respected by every email cron; one-time lowercase/trim of subscriber
emails so joins with Clerk emails are exact-match.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Low-supply cooldown

**Files:**
- Modify: `src/app/api/cron/low-supply/route.ts`

- [ ] **Step 1: Update the candidate query and add bulk timestamp write**

Replace the entire body of `src/app/api/cron/low-supply/route.ts` with:

```ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { resend, getFromEmail } from "@/lib/resend";
import { clerkClient } from "@clerk/nextjs/server";

const CRON_SECRET = process.env.CRON_SECRET;
const COOLDOWN_DAYS = 14;

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Items eligible for a low-supply alert:
  // - active, not paused, alerts opted-in for the item
  // - quantity_remaining <= 14
  // - never alerted OR last alert was > 14 days ago
  const cooldownCutoff = new Date();
  cooldownCutoff.setDate(cooldownCutoff.getDate() - COOLDOWN_DAYS);

  const { data: lowItems } = await supabaseAdmin
    .from("user_stacks")
    .select("id, user_id, custom_name, dose, quantity_remaining, quantity_total, quantity_unit, doses_per_serving, supplement:supplement_id(name, slug)")
    .eq("is_active", true)
    .or("is_paused.is.null,is_paused.eq.false")
    .eq("low_supply_alert", true)
    .not("quantity_remaining", "is", null)
    .lte("quantity_remaining", 14)
    .or(`last_low_supply_alert_sent_at.is.null,last_low_supply_alert_sent_at.lt.${cooldownCutoff.toISOString()}`);

  if (!lowItems || lowItems.length === 0) {
    return NextResponse.json({ message: "No low supply items", sent: 0 });
  }

  // Group by user
  const byUser: Record<string, typeof lowItems> = {};
  lowItems.forEach(item => {
    if (!byUser[item.user_id]) byUser[item.user_id] = [];
    byUser[item.user_id].push(item);
  });

  let sent = 0;
  const client = await clerkClient();

  for (const [userId, items] of Object.entries(byUser)) {
    try {
      // Check subscription
      const { data: sub } = await supabaseAdmin
        .from("subscriptions")
        .select("plan, status")
        .eq("user_id", userId)
        .single();

      if (!sub || sub.status !== "active") continue;

      // Check email preferences
      const { data: profile } = await supabaseAdmin
        .from("user_profiles")
        .select("email_reminders_enabled, email_unsubscribed_all")
        .eq("user_id", userId)
        .single();

      if (!profile || profile.email_unsubscribed_all) continue;
      if (!profile.email_reminders_enabled) continue;

      // Get user email from Clerk
      const users = await client.users.getUser(userId);
      const email = users.emailAddresses?.[0]?.emailAddress;
      const firstName = users.firstName || "there";
      if (!email) continue;

      // Build item list
      const itemRows = items.map(item => {
        const supp = Array.isArray(item.supplement) ? item.supplement[0] : item.supplement;
        const name = supp?.name || item.custom_name || "Supplement";
        const reorderUrl = `https://www.amazon.com/s?k=${encodeURIComponent(name + ' supplement')}&tag=stackritual-20`;
        return `<tr>
          <td style="padding:8px 0;border-bottom:1px solid #f3f4f6;font-weight:600">${name}</td>
          <td style="padding:8px 0;border-bottom:1px solid #f3f4f6;color:#6b7280">${item.quantity_remaining} ${item.quantity_unit || "doses"} left</td>
          <td style="padding:8px 0;border-bottom:1px solid #f3f4f6"><a href="${reorderUrl}" style="color:#065f46;font-weight:600;text-decoration:none">Reorder →</a></td>
        </tr>`;
      }).join("");

      await resend.emails.send({
        from: getFromEmail(),
        to: email,
        subject: `🌿 Running low on ${items.length === 1 ? items[0].custom_name || "your supplement" : `${items.length} supplements`}`,
        html: `
          <!DOCTYPE html>
          <html>
          <body style="font-family:-apple-system,sans-serif;background:#fafaf9;padding:20px;">
            <div style="max-width:480px;margin:0 auto;background:white;border-radius:16px;overflow:hidden;border:1px solid #e7e5e4;">
              <div style="background:#065f46;padding:24px;text-align:center;">
                <h1 style="color:white;margin:0;font-size:20px;">🌿 Stack Ritual</h1>
              </div>
              <div style="padding:24px;">
                <h2 style="color:#1c1917;margin-top:0;">Hi ${firstName} — time to reorder!</h2>
                <p style="color:#6b7280;">You're running low on the following supplements:</p>
                <table style="width:100%;border-collapse:collapse;">
                  <thead>
                    <tr style="text-align:left;">
                      <th style="padding:8px 0;color:#9ca3af;font-size:12px;font-weight:600">Supplement</th>
                      <th style="padding:8px 0;color:#9ca3af;font-size:12px;font-weight:600">Remaining</th>
                      <th style="padding:8px 0;color:#9ca3af;font-size:12px;font-weight:600">Action</th>
                    </tr>
                  </thead>
                  <tbody>${itemRows}</tbody>
                </table>
                <a href="https://stackritual.com/dashboard/stack" style="display:block;background:#065f46;color:white;text-align:center;padding:14px;border-radius:12px;text-decoration:none;font-weight:600;margin-top:20px;">
                  View My Stack
                </a>
              </div>
              <div style="background:#fafaf9;padding:16px;text-align:center;border-top:1px solid #e7e5e4;">
                <p style="color:#a8a29e;font-size:11px;margin:0;">
                  <a href="https://stackritual.com/share" style="color: #065f46; font-weight: 600; text-decoration: none;">Love Stack Ritual? Share the app with a friend</a><br><br>
                  ⚕️ Nothing on Stack Ritual constitutes medical advice.<br>
                  <a href="https://stackritual.com/dashboard/profile" style="color:#a8a29e;">Manage email preferences</a>
                </p>
              </div>
            </div>
          </body>
          </html>
        `,
      });

      // Stamp the cooldown timestamp on every item included in this user's email
      const itemIds = items.map(i => i.id);
      const { error: updateErr } = await supabaseAdmin
        .from("user_stacks")
        .update({ last_low_supply_alert_sent_at: new Date().toISOString() })
        .in("id", itemIds);
      if (updateErr) {
        console.error(`[cron/low-supply] cooldown stamp failed for user ${userId}:`, updateErr);
      }

      sent++;
    } catch (e) {
      console.error(`Error sending low supply alert to ${userId}:`, e);
    }
  }

  return NextResponse.json({ message: "done", sent });
}
```

The two material changes from the existing file:
1. Added `cooldownCutoff` calculation + the `.or()` filter on `last_low_supply_alert_sent_at`.
2. Added the `email_unsubscribed_all` selection and check (early-skip), plus the bulk-update of `last_low_supply_alert_sent_at` after a successful send.

- [ ] **Step 2: Lint check**

Run: `npm run lint 2>&1 | grep "low-supply"`
Expected: no NEW errors.

- [ ] **Step 3: Build check**

Run: `npm run build 2>&1 | tail -10`
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/cron/low-supply/route.ts
git commit -m "$(cat <<'EOF'
feat(emails): add 14-day cooldown to low-supply alerts

Items at quantity ≤ 14 currently re-alert every day until restocked,
producing 14 daily emails for stuck-low items. Add a per-item cooldown
that suppresses re-alerts for 14 days after a successful send. Stamp
last_low_supply_alert_sent_at on every item included in the email.
Also short-circuit when email_unsubscribed_all is set on the profile.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: `email_marketing` two-way sync + backfill

**Files:**
- Modify: `src/app/api/cron/campaign-queue/route.ts`
- Modify: `src/app/api/email/settings/route.ts`
- Modify: `src/app/api/newsletter/unsubscribe/route.ts`
- Create: `src/app/api/admin/backfill-email-marketing/route.ts`

- [ ] **Step 1: Update `/api/cron/campaign-queue/route.ts` — defensive Clerk lookup**

In `src/app/api/cron/campaign-queue/route.ts`, add a Clerk import alongside the existing imports:

```ts
import { clerkClient } from "@clerk/nextjs/server";
```

Inside the per-enrollment loop, immediately after the `if (enr.subscriber.unsubscribed_at) ...` block (which marks the enrollment stopped and `continue`s), add the defensive profile check. The existing code reads:

```ts
      if (enr.subscriber.unsubscribed_at) {
        await supabaseAdmin.from("campaign_enrollments").update({ status: "stopped" }).eq("id", enr.id);
        continue;
      }
```

After it, insert:

```ts
      // Defensive read: if a matching SR user has email_marketing=false or
      // email_unsubscribed_all=true, skip. Two-way sync at write time should
      // make unsubscribed_at reflect this already, but the double-check keeps
      // a single source of truth for sending decisions.
      const subscriberEmail = enr.subscriber.email.toLowerCase();
      const client = await clerkClient();
      let matchingProfile: { email_marketing: boolean | null; email_unsubscribed_all: boolean } | null = null;
      try {
        const userList = await client.users.getUserList({ emailAddress: [subscriberEmail], limit: 1 });
        const userData = userList.data ?? userList;
        const matchedUserId = (Array.isArray(userData) ? userData[0]?.id : undefined) as string | undefined;
        if (matchedUserId) {
          const { data: profile } = await supabaseAdmin
            .from("user_profiles")
            .select("email_marketing, email_unsubscribed_all")
            .eq("user_id", matchedUserId)
            .maybeSingle();
          matchingProfile = profile as typeof matchingProfile;
        }
      } catch (e) {
        // Clerk lookup failure is non-fatal; fall back to subscriber-table-only gating.
        console.warn("[cron/campaign-queue] Clerk lookup failed for", subscriberEmail, e);
      }
      if (matchingProfile?.email_unsubscribed_all === true) continue;
      if (matchingProfile?.email_marketing === false) continue;
```

The `client.users.getUserList({ emailAddress: [...] })` returns `{ data: [...], totalCount }` in newer Clerk versions, or a bare array in older ones — the cast handles both shapes.

- [ ] **Step 2: Update `/api/email/settings/route.ts` — accept new field, sync writes**

Replace the entire body of `src/app/api/email/settings/route.ts` with:

```ts
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { currentUser } from "@clerk/nextjs/server";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data } = await supabaseAdmin
    .from("user_profiles")
    .select("email_reminders_enabled, email_consolidated_summary, email_weekly_summary, email_marketing, email_unsubscribed_all")
    .eq("user_id", userId)
    .single();

  return NextResponse.json({ settings: data });
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as {
    email_reminders_enabled?: boolean;
    email_consolidated_summary?: boolean;
    email_weekly_summary?: boolean;
    email_marketing?: boolean;
    email_unsubscribed_all?: boolean;
  };

  // Read current state so we can detect flips of email_marketing / email_unsubscribed_all
  const { data: prev } = await supabaseAdmin
    .from("user_profiles")
    .select("email_marketing, email_unsubscribed_all")
    .eq("user_id", userId)
    .maybeSingle();

  const update = {
    user_id: userId,
    email_reminders_enabled: !!body.email_reminders_enabled,
    email_consolidated_summary: !!body.email_consolidated_summary,
    email_weekly_summary: !!body.email_weekly_summary,
    email_marketing: !!body.email_marketing,
    email_unsubscribed_all: !!body.email_unsubscribed_all,
  };
  await supabaseAdmin.from("user_profiles").upsert(update, { onConflict: "user_id" });

  // Two-way sync to newsletter_subscribers when relevant flags flip.
  // Match by lowercased Clerk email.
  const newMarketing = update.email_marketing;
  const newUnsubAll = update.email_unsubscribed_all;
  const prevMarketing = prev?.email_marketing ?? null;
  const prevUnsubAll = prev?.email_unsubscribed_all ?? false;

  const marketingFlipped = newMarketing !== prevMarketing;
  const unsubAllJustEnabled = newUnsubAll === true && prevUnsubAll === false;

  if (marketingFlipped || unsubAllJustEnabled) {
    const user = await currentUser();
    const email = user?.emailAddresses?.[0]?.emailAddress?.toLowerCase().trim();
    if (email) {
      const { data: subscriber } = await supabaseAdmin
        .from("newsletter_subscribers")
        .select("id")
        .eq("email", email)
        .maybeSingle();
      if (subscriber) {
        // Decide what state the subscriber row should be in.
        // - email_unsubscribed_all just turned on → unsubscribed_at = now()
        // - email_marketing flipped to false → unsubscribed_at = now()
        // - email_marketing flipped to true (and unsub_all is OFF) → clear unsubscribed_at
        if (unsubAllJustEnabled || (marketingFlipped && newMarketing === false)) {
          await supabaseAdmin
            .from("newsletter_subscribers")
            .update({ unsubscribed_at: new Date().toISOString() })
            .eq("id", subscriber.id);
        } else if (marketingFlipped && newMarketing === true && newUnsubAll === false) {
          await supabaseAdmin
            .from("newsletter_subscribers")
            .update({ unsubscribed_at: null })
            .eq("id", subscriber.id);
        }
      }
    }
  }

  return NextResponse.json({ message: "saved" });
}
```

- [ ] **Step 3: Update `/api/newsletter/unsubscribe/route.ts` — reverse sync to profile**

Replace the entire body of `src/app/api/newsletter/unsubscribe/route.ts` with:

```ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { clerkClient } from "@clerk/nextjs/server";

export async function POST(req: NextRequest) {
  const { token } = await req.json();
  if (!token || typeof token !== "string") {
    return NextResponse.json({ error: "Token required" }, { status: 400 });
  }

  const { data: sub } = await supabaseAdmin
    .from("newsletter_subscribers")
    .select("id, email")
    .eq("unsubscribe_token", token)
    .maybeSingle();

  if (!sub) return NextResponse.json({ error: "Invalid token" }, { status: 404 });

  await supabaseAdmin
    .from("newsletter_subscribers")
    .update({ unsubscribed_at: new Date().toISOString() })
    .eq("id", sub.id);

  // Mark any active enrollments as stopped
  await supabaseAdmin
    .from("campaign_enrollments")
    .update({ status: "stopped" })
    .eq("subscriber_id", sub.id)
    .eq("status", "active");

  // Reverse sync: if a matching SR user exists, flip their email_marketing
  // toggle to false so the in-app UI reflects the unsubscribe.
  try {
    const subEmail = sub.email?.toLowerCase().trim();
    if (subEmail) {
      const client = await clerkClient();
      const userList = await client.users.getUserList({ emailAddress: [subEmail], limit: 1 });
      const userData = userList.data ?? userList;
      const matchedUserId = (Array.isArray(userData) ? userData[0]?.id : undefined) as string | undefined;
      if (matchedUserId) {
        await supabaseAdmin
          .from("user_profiles")
          .update({ email_marketing: false })
          .eq("user_id", matchedUserId);
      }
    }
  } catch (e) {
    console.warn("[newsletter/unsubscribe] reverse sync failed", e);
  }

  return NextResponse.json({ message: "unsubscribed" });
}
```

- [ ] **Step 4: Create `/api/admin/backfill-email-marketing/route.ts` (one-off)**

```ts
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { clerkClient } from "@clerk/nextjs/server";

const ADMIN_USER_IDS = process.env.ADMIN_USER_IDS?.split(",") || [];

// One-off backfill. For every user_profiles row with email_marketing=true,
// look up the user's email in Clerk, find a matching newsletter_subscribers
// row, and if that subscriber is unsubscribed, flip the profile to match.
// Run once after deploy. Delete this file after running.
export async function POST() {
  const { userId } = await auth();
  if (!userId || !ADMIN_USER_IDS.includes(userId)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { data: profiles } = await supabaseAdmin
    .from("user_profiles")
    .select("user_id")
    .eq("email_marketing", true);

  if (!profiles || profiles.length === 0) {
    return NextResponse.json({ checked: 0, flipped: 0 });
  }

  const client = await clerkClient();
  let checked = 0;
  let flipped = 0;
  let errors = 0;

  for (const p of profiles) {
    checked++;
    try {
      const user = await client.users.getUser(p.user_id);
      const email = user.emailAddresses?.[0]?.emailAddress?.toLowerCase().trim();
      if (!email) continue;
      const { data: sub } = await supabaseAdmin
        .from("newsletter_subscribers")
        .select("unsubscribed_at")
        .eq("email", email)
        .maybeSingle();
      if (sub?.unsubscribed_at) {
        await supabaseAdmin
          .from("user_profiles")
          .update({ email_marketing: false })
          .eq("user_id", p.user_id);
        flipped++;
      }
    } catch (e) {
      errors++;
      console.error("[backfill-email-marketing] error for", p.user_id, e);
    }
  }

  return NextResponse.json({ checked, flipped, errors });
}
```

- [ ] **Step 5: Lint check**

Run: `npm run lint 2>&1 | grep -E "(campaign-queue|email/settings|newsletter/unsubscribe|backfill-email-marketing)" | head -20`
Expected: no NEW errors.

- [ ] **Step 6: Build check**

Run: `npm run build 2>&1 | tail -10`
Expected: build succeeds.

- [ ] **Step 7: Commit**

```bash
git add src/app/api/cron/campaign-queue/route.ts src/app/api/email/settings/route.ts src/app/api/newsletter/unsubscribe/route.ts src/app/api/admin/backfill-email-marketing/route.ts
git commit -m "$(cat <<'EOF'
feat(emails): two-way sync between email_marketing and subscriber.unsubscribed_at

The user-profile email_marketing toggle has been a no-op — campaign-queue
only consulted newsletter_subscribers.unsubscribed_at. Now the two stay
in sync at write time: in-app toggle off → also flip subscriber row;
email-link unsubscribe → also flip profile. Campaign-queue defensively
reads both via a Clerk email lookup. New one-off admin endpoint backfills
inconsistent existing rows; delete after running.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 8: Tell the user to run the backfill manually**

Pause and tell the user:
> "After this commit deploys (or in your dev session against prod data), run the backfill once: `curl -X POST https://stackritual.com/api/admin/backfill-email-marketing -H "Cookie: <admin-session-cookie>"` (or the equivalent local curl in dev). It returns `{ checked, flipped, errors }`. After it finishes, I'll delete the route in Task 4. Confirm when you've run it."

Wait for "ok ran it" before continuing.

---

### Task 4: Master unsubscribe toggle (5 cron filters + UI)

**Files:**
- Modify: `src/app/api/cron/daily-reminders/route.ts`
- Modify: `src/app/api/cron/weekly-summary/route.ts`
- Modify: `src/app/api/cron/birthday-emails/route.ts`
- Modify: `src/components/EmailSettings.tsx`
- Delete: `src/app/api/admin/backfill-email-marketing/route.ts` (cleanup from Task 3)

(`/api/cron/low-supply/route.ts` and `/api/cron/campaign-queue/route.ts` were already updated in earlier tasks to consult `email_unsubscribed_all`.)

- [ ] **Step 1: Update `/api/cron/daily-reminders/route.ts`**

In `src/app/api/cron/daily-reminders/route.ts`, find the existing user_profiles select:

```ts
  const { data: profiles } = await supabaseAdmin
    .from("user_profiles")
    .select("user_id, email_reminders_enabled, email_consolidated_summary")
    .eq("email_reminders_enabled", true);
```

Replace with:

```ts
  const { data: profiles } = await supabaseAdmin
    .from("user_profiles")
    .select("user_id, email_reminders_enabled, email_consolidated_summary, email_unsubscribed_all")
    .eq("email_reminders_enabled", true)
    .eq("email_unsubscribed_all", false);
```

(The DB-level filter is more efficient than per-row JS; matches the existing pattern.)

- [ ] **Step 2: Update `/api/cron/weekly-summary/route.ts`**

Find the existing user_profiles select:

```ts
  const { data: profiles } = await supabaseAdmin
    .from("user_profiles")
    .select("user_id, terms_accepted_at, email_weekly_summary")
    .not("terms_accepted_at", "is", null);
```

Replace with:

```ts
  const { data: profiles } = await supabaseAdmin
    .from("user_profiles")
    .select("user_id, terms_accepted_at, email_weekly_summary, email_unsubscribed_all")
    .not("terms_accepted_at", "is", null)
    .eq("email_unsubscribed_all", false);
```

- [ ] **Step 3: Update `/api/cron/birthday-emails/route.ts`**

Find the existing select:

```ts
  const { data: rows, error } = await supabaseAdmin
    .from("user_profiles")
    .select("user_id, birth_month, birth_day, timezone, last_birthday_email_year")
    .not("birth_month", "is", null)
    .not("birth_day", "is", null)
    .not("timezone", "is", null)
    .or(`last_birthday_email_year.is.null,last_birthday_email_year.lt.${currentYear}`);
```

Replace with:

```ts
  const { data: rows, error } = await supabaseAdmin
    .from("user_profiles")
    .select("user_id, birth_month, birth_day, timezone, last_birthday_email_year, email_unsubscribed_all")
    .not("birth_month", "is", null)
    .not("birth_day", "is", null)
    .not("timezone", "is", null)
    .eq("email_unsubscribed_all", false)
    .or(`last_birthday_email_year.is.null,last_birthday_email_year.lt.${currentYear}`);
```

- [ ] **Step 4: Update `EmailSettings.tsx` — add master toggle**

Replace the entire contents of `src/components/EmailSettings.tsx` with:

```tsx
"use client";

import { useState, useEffect } from "react";

interface EmailPrefs {
  email_reminders_enabled: boolean;
  email_consolidated_summary: boolean;
  email_weekly_summary: boolean;
  email_marketing: boolean;
  email_unsubscribed_all: boolean;
}

export default function EmailSettings({ isPlusOrPro }: { isPlusOrPro: boolean }) {
  const [open, setOpen] = useState(false);
  const [prefs, setPrefs] = useState<EmailPrefs>({
    email_reminders_enabled: false,
    email_consolidated_summary: false,
    email_weekly_summary: true,
    email_marketing: false,
    email_unsubscribed_all: false,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      fetch("/api/email/settings")
        .then(r => r.json())
        .then(d => { if (d.settings) setPrefs(prev => ({ ...prev, ...d.settings })); });
    }
  }, [open]);

  async function handleSave() {
    setSaving(true);
    const res = await fetch("/api/email/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(prefs),
    });
    setSaving(false);
    if (res.ok) setOpen(false);
  }

  const Toggle = ({ value, onChange, disabled = false }: { value: boolean; onChange: (v: boolean) => void; disabled?: boolean }) => (
    <button onClick={() => !disabled && onChange(!value)}
      disabled={disabled}
      className={`w-12 h-6 rounded-full transition-colors flex-shrink-0 ${value ? "bg-emerald-600" : "bg-stone-300"} ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}>
      <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform mx-0.5 ${value ? "translate-x-6" : "translate-x-0"}`} />
    </button>
  );

  const allDisabled = prefs.email_unsubscribed_all;

  return (
    <>
      <button onClick={() => setOpen(true)}
        className="flex items-center justify-between px-4 py-4 w-full hover:bg-stone-50 transition-colors">
        <div className="flex items-center gap-3">
          <span className="text-xl">✉️</span>
          <span className="font-medium text-stone-900 text-sm">Email preferences</span>
        </div>
        <span className="text-stone-300">›</span>
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center p-4 pb-8">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-stone-900">Email Preferences</h2>
              <button onClick={() => setOpen(false)} className="text-stone-400 hover:text-stone-700 text-xl">✕</button>
            </div>

            {/* Master unsubscribe */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start justify-between">
              <div className="flex-1 pr-4">
                <div className="font-medium text-stone-900 text-sm">Unsubscribe from all emails</div>
                <div className="text-xs text-stone-600 mt-0.5">
                  {allDisabled
                    ? "Individual settings preserved — turn this off to use them again."
                    : "Master switch — turn off every email type at once."}
                </div>
              </div>
              <Toggle
                value={prefs.email_unsubscribed_all}
                onChange={v => setPrefs(p => ({ ...p, email_unsubscribed_all: v }))}
              />
            </div>

            <div className={`space-y-1 ${allDisabled ? "opacity-50 pointer-events-none" : ""}`}>
              {/* Daily reminders */}
              <div className={`flex items-start justify-between bg-stone-50 rounded-xl px-4 py-3 ${!isPlusOrPro ? "opacity-50" : ""}`}>
                <div className="flex-1 pr-4">
                  <div className="font-medium text-stone-900 text-sm">Daily reminders</div>
                  <div className="text-xs text-stone-500 mt-0.5">
                    {isPlusOrPro ? "Email when it's time to take your supplements" : "Plus & Pro feature"}
                  </div>
                </div>
                <Toggle
                  value={isPlusOrPro ? prefs.email_reminders_enabled : false}
                  onChange={v => isPlusOrPro && setPrefs(p => ({ ...p, email_reminders_enabled: v }))}
                  disabled={allDisabled}
                />
              </div>

              {/* Consolidated daily summary (sub-option) */}
              {isPlusOrPro && prefs.email_reminders_enabled && (
                <div className="flex items-start justify-between bg-stone-50 rounded-xl px-4 py-3 ml-6">
                  <div className="flex-1 pr-4">
                    <div className="font-medium text-stone-900 text-sm">One summary email per day</div>
                    <div className="text-xs text-stone-500 mt-0.5">
                      Get a single morning email listing your whole day instead of one per timeframe
                    </div>
                  </div>
                  <Toggle
                    value={prefs.email_consolidated_summary}
                    onChange={v => setPrefs(p => ({ ...p, email_consolidated_summary: v }))}
                    disabled={allDisabled}
                  />
                </div>
              )}

              {/* Weekly summary */}
              <div className={`flex items-start justify-between bg-stone-50 rounded-xl px-4 py-3 ${!isPlusOrPro ? "opacity-50" : ""}`}>
                <div className="flex-1 pr-4">
                  <div className="font-medium text-stone-900 text-sm">Weekly summary</div>
                  <div className="text-xs text-stone-500 mt-0.5">
                    {isPlusOrPro ? "Monday recap of your completion rate and streak" : "Plus & Pro feature"}
                  </div>
                </div>
                <Toggle
                  value={isPlusOrPro ? prefs.email_weekly_summary : false}
                  onChange={v => isPlusOrPro && setPrefs(p => ({ ...p, email_weekly_summary: v }))}
                  disabled={allDisabled}
                />
              </div>

              {/* Marketing */}
              <div className="flex items-start justify-between bg-stone-50 rounded-xl px-4 py-3">
                <div className="flex-1 pr-4">
                  <div className="font-medium text-stone-900 text-sm">Newsletter & tips</div>
                  <div className="text-xs text-stone-500 mt-0.5">Supplement tips, new features, and health insights</div>
                </div>
                <Toggle
                  value={prefs.email_marketing}
                  onChange={v => setPrefs(p => ({ ...p, email_marketing: v }))}
                  disabled={allDisabled}
                />
              </div>
            </div>

            <p className="text-xs text-stone-400 text-center">
              Emails come from hello@stackritual.com. You can unsubscribe anytime.
            </p>

            <div className="flex gap-3">
              <button onClick={() => setOpen(false)}
                className="flex-1 border border-stone-200 text-stone-600 py-3 rounded-xl font-medium text-sm hover:bg-stone-50 transition-colors">
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 bg-emerald-700 text-white py-3 rounded-xl font-semibold text-sm hover:bg-emerald-800 transition-colors disabled:opacity-60">
                {saving ? "Saving..." : "Save preferences"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
```

(Two notable diffs from the existing file: new master toggle at top with amber styling; the existing toggles section gets `opacity-50 pointer-events-none` when `allDisabled` is true, and each individual `Toggle` now accepts `disabled` to suppress click; the marketing toggle label updates from "Tips & updates" to "Newsletter & tips" to better reflect what it actually gates.)

- [ ] **Step 5: Delete the one-off backfill endpoint**

```bash
rm src/app/api/admin/backfill-email-marketing/route.ts
```

(This step assumes the user has already run the backfill in Task 3 step 8 and confirmed.)

- [ ] **Step 6: Lint check**

Run: `npm run lint 2>&1 | grep -E "(daily-reminders|weekly-summary|birthday-emails|EmailSettings)" | head -20`
Expected: no NEW errors.

- [ ] **Step 7: Build check**

Run: `npm run build 2>&1 | tail -10`
Expected: build succeeds.

- [ ] **Step 8: Commit**

```bash
git add src/app/api/cron/daily-reminders/route.ts src/app/api/cron/weekly-summary/route.ts src/app/api/cron/birthday-emails/route.ts src/components/EmailSettings.tsx src/app/api/admin/backfill-email-marketing/route.ts
git commit -m "$(cat <<'EOF'
feat(emails): master unsubscribe toggle + remove one-off backfill route

New master "Unsubscribe from all emails" toggle on user_profiles. Daily
reminders, weekly summary, and birthday cron each now filter out users
with email_unsubscribed_all=true at the SQL level. EmailSettings UI
visually disables the four individual toggles when the master is on,
preserving the user's underlying preferences. Also removes the backfill
route now that it has been run once.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Stack card simplification + analysis confirmation modal

**Files:**
- Modify: `src/components/StackAnalysisCard.tsx`
- Modify: `src/app/dashboard/analysis/page.tsx`

- [ ] **Step 1: Update `StackAnalysisCard.tsx` — collapse fresh/stale into single "View analysis"**

In `src/components/StackAnalysisCard.tsx`, locate the existing post-analysis render branch (the part that handles `analysis !== null`). The existing code reads:

```tsx
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-stone-900">✨ Stack analysis</h3>
      <p className="mt-1 text-sm text-stone-600">
        Last analyzed {relativeDate(analysis.created_at)}
        {stack_changed_since
          ? ` · ${totalChanges} item${totalChanges === 1 ? "" : "s"} changed since`
          : ""}
      </p>
      <div className="mt-3 flex gap-2">
        <Link
          href="/dashboard/analysis"
          className="rounded-lg bg-emerald-700 px-3 py-1.5 text-sm font-medium text-white"
        >
          {stack_changed_since ? "Re-analyze" : "View results"}
        </Link>
      </div>
    </div>
  );
```

Replace with:

```tsx
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-stone-900">✨ Stack analysis</h3>
      <p className="mt-1 text-sm text-stone-600">
        Last analyzed {relativeDate(analysis.created_at)}
        {stack_changed_since
          ? ` · ${totalChanges} item${totalChanges === 1 ? "" : "s"} changed since`
          : ""}
      </p>
      <div className="mt-3 flex gap-2">
        <Link
          href="/dashboard/analysis"
          className="rounded-lg bg-emerald-700 px-3 py-1.5 text-sm font-medium text-white"
        >
          View analysis
        </Link>
      </div>
    </div>
  );
```

(Single change: button label is now always "View analysis". The "X items changed since" hint stays as informational text.)

- [ ] **Step 2: Add confirmation modal to `/dashboard/analysis/page.tsx`**

In `src/app/dashboard/analysis/page.tsx`:

a) Near the other state declarations, add:

```tsx
  const [showReanalyzeConfirm, setShowReanalyzeConfirm] = useState(false);
```

b) Find the existing Re-analyze button block (the conditional that renders only when `(!a || latest?.stack_changed_since)`). The current button reads:

```tsx
      {(!a || latest?.stack_changed_since) ? (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleRun}
            disabled={running}
            className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white disabled:bg-stone-300"
          >
            {running ? "Analyzing..." : a ? "Re-analyze" : "Analyze my stack"}
          </button>
        </div>
      ) : null}
```

Replace with:

```tsx
      {(!a || latest?.stack_changed_since) ? (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => {
              if (a) {
                setShowReanalyzeConfirm(true);
              } else {
                handleRun();
              }
            }}
            disabled={running}
            className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white disabled:bg-stone-300"
          >
            {running ? "Analyzing..." : a ? "Re-analyze" : "Analyze my stack"}
          </button>
        </div>
      ) : null}
```

c) Add the confirmation modal JSX. Find the line where the disclaimer modal renders (`{showDisclaimer ? <AnalysisDisclaimerModal ... /> : null}`) and add the new modal right after it:

```tsx
      {showReanalyzeConfirm ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-stone-900">
              Re-analyze your stack?
            </h2>
            <p className="mt-3 text-sm text-stone-700">
              Your current analysis and any follow-up questions you&apos;ve
              asked will be replaced with a new analysis based on your
              updated stack.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowReanalyzeConfirm(false)}
                className="rounded-lg px-4 py-2 text-sm text-stone-700 hover:bg-stone-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowReanalyzeConfirm(false);
                  handleRun();
                }}
                disabled={running}
                className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white disabled:bg-stone-300"
              >
                {running ? "Analyzing..." : "Re-analyze"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
```

- [ ] **Step 3: Lint + build**

Run: `npm run lint 2>&1 | grep -E "(StackAnalysisCard|dashboard/analysis)" | head -10`
Expected: no NEW errors.

Run: `npm run build 2>&1 | tail -10`
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/components/StackAnalysisCard.tsx src/app/dashboard/analysis/page.tsx
git commit -m "$(cat <<'EOF'
feat(analysis): single 'View analysis' CTA on stack card + confirm before re-analyze

Stack page card now always shows "View analysis" once an analysis exists,
regardless of whether the stack has changed. The "X items changed since"
hint stays as info but no longer drives a different button. Re-analyze
decisions move to the analysis page itself, where clicking Re-analyze
on an existing analysis now shows a confirmation modal warning that the
current analysis and saved follow-up Q&As will be replaced.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: Printable analysis

**Files:**
- Modify: `src/app/dashboard/analysis/page.tsx`
- Modify: `src/components/AnalysisFindingCard.tsx`
- Modify: `src/components/AnalysisRecommendationCard.tsx`

- [ ] **Step 1: Update analysis page — Print button + print-only header + useUser**

In `src/app/dashboard/analysis/page.tsx`:

a) Add the `useUser` import alongside the existing client imports near the top:

```tsx
import { useUser } from "@clerk/nextjs";
```

b) Inside the component body, near the other state declarations, add:

```tsx
  const { user } = useUser();
  const [printedDate] = useState(() => new Date().toLocaleDateString());
```

c) Compute display name. Place this just after the `useUser` line:

```tsx
  const printName = (() => {
    const first = user?.firstName ?? "";
    const last = user?.lastName ?? "";
    const full = `${first} ${last}`.trim();
    if (full) return full;
    const email = user?.primaryEmailAddress?.emailAddress ?? "";
    const local = email.split("@")[0] ?? "";
    return local || "Stack Ritual user";
  })();
```

d) Add the print-only header block. Place it inside the main JSX just below the top `<TopNav />` and the back-link, but above the page `<h1>`. Use Tailwind's `hidden print:block`:

```tsx
      <div className="hidden print:block mb-4 text-sm text-stone-700">
        <div><span className="font-semibold">For:</span> {printName}</div>
        <div><span className="font-semibold">Printed:</span> {printedDate}</div>
        <hr className="my-2 border-stone-300" />
      </div>
```

e) Add the Print button near the Re-analyze button. The existing button block (after Task 5) wraps both states. Add the Print button as a sibling, with `print:hidden` so it doesn't print itself:

```tsx
      {a ? (
        <div className="mt-2 print:hidden">
          <button
            type="button"
            onClick={() => window.print()}
            className="text-xs text-stone-600 hover:text-emerald-700 hover:underline"
          >
            Print 🖨️
          </button>
        </div>
      ) : null}
```

f) Add `print:hidden` to the chrome elements that shouldn't print. Specifically:

- The Re-analyze button container (the `<div className="mt-4 flex flex-wrap items-center gap-3">`) — change to `mt-4 flex flex-wrap items-center gap-3 print:hidden`.
- The `<TopNav />` and `<BottomNav />` — wrap each existing usage in the analysis page in a `print:hidden` div. Find the JSX line `<TopNav />` and replace with `<div className="print:hidden"><TopNav /></div>`. Do the same for `<BottomNav />`. Don't modify the TopNav/BottomNav components themselves — other pages don't need this change.
- The cap counter `<p>` (`{a && isPro && followupCount > 0 ? ...`) — add `print:hidden` to its className.
- The "💡 Personalize your analysis" demographics-banner — add `print:hidden` to its className.
- Error states (the `error` JSX blocks) — add `print:hidden` to their containers.
- The disclaimer banner (`<div className="mt-6 rounded-xl border border-stone-200 bg-white p-4 text-xs text-stone-600">`) — keep visible on print (no `print:hidden`).
- The disclaimer + reanalyze-confirm modals stay as-is (they only render when `showDisclaimer` / `showReanalyzeConfirm` is true; they wouldn't be open during print anyway).

- [ ] **Step 2: Update `AnalysisFindingCard.tsx` — print-friendly behavior**

In `src/components/AnalysisFindingCard.tsx`, find the wrapper `<div className={`mb-3 rounded-xl border p-4 ${SEVERITY_STYLES[sev]}`}>` and add `break-inside-avoid` to it:

```tsx
    <div className={`mb-3 rounded-xl border p-4 break-inside-avoid ${SEVERITY_STYLES[sev]}`}>
```

Then find the "Ask UI" wrapper block (the `<div className="mt-3 border-t border-stone-200 pt-3">` that contains the locked-state link, expanded textarea, etc.) and add `print:hidden` to it:

```tsx
      <div className="mt-3 border-t border-stone-200 pt-3 print:hidden">
```

The Q&A history block (`{followups.length > 0 ? ...`) stays as-is — no `print:hidden`, since saved Q&As should print.

- [ ] **Step 3: Update `AnalysisRecommendationCard.tsx`**

Same pattern. Wrapper:

```tsx
    <div className="mb-3 rounded-xl border border-stone-200 bg-white p-4 break-inside-avoid">
```

Ask UI wrapper:

```tsx
      <div className="mt-3 border-t border-stone-200 pt-3 print:hidden">
```

The "Look up in Research →" Link — keep visible on print (it's text-relevant). Q&A history block stays as-is.

- [ ] **Step 4: Lint + build**

Run: `npm run lint 2>&1 | grep -E "(dashboard/analysis|AnalysisFindingCard|AnalysisRecommendationCard)" | head -10`
Expected: no NEW errors.

Run: `npm run build 2>&1 | tail -10`
Expected: build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/app/dashboard/analysis/page.tsx src/components/AnalysisFindingCard.tsx src/components/AnalysisRecommendationCard.tsx
git commit -m "$(cat <<'EOF'
feat(analysis): printable analysis page with user name + print date

Add a Print button on the analysis page that uses window.print() with a
@media-print friendly layout. Print includes a header block (For: name,
Printed: date), all five sections, saved follow-up Q&As, and the
disclaimer. Hidden on print: nav, action buttons, follow-up Ask UI,
counter, banners, error states. Cards get break-inside-avoid so
findings don't split across pages.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: Final QA pass + push

**Files:** none modified — verification only.

- [ ] **Step 1: Build + lint sweep**

Run:

```bash
npm run lint 2>&1 | tail -5
npm run build 2>&1 | tail -10
```

Expected: lint shows no NEW errors compared to a baseline (the project has ~63 pre-existing errors). Build succeeds.

- [ ] **Step 2: QA matrix**

In `npm run dev`, walk these. Mark only when verified.

- [ ] **Low-supply cooldown** — set a stack item to `quantity_remaining=8` and `low_supply_alert=true`, trigger `/api/cron/low-supply` manually with the CRON_SECRET. Confirm one email sent. Trigger again — confirm `sent=0` (cooldown active). Manually `update user_stacks set last_low_supply_alert_sent_at = now() - interval '15 days' where id = '...';` and trigger again — alert fires (cooldown elapsed).
- [ ] **`email_marketing` in-app off** — toggle in profile to off. POST. Verify `newsletter_subscribers.unsubscribed_at` is now set for the matching subscriber row. Trigger `/api/cron/campaign-queue` (with at least one active enrollment for that subscriber) — confirm send is skipped.
- [ ] **`email_marketing` back on** — toggle on. Verify subscriber row's `unsubscribed_at` cleared.
- [ ] **Email-link unsubscribe** — POST `/api/newsletter/unsubscribe` with the user's unsubscribe_token. Verify `user_profiles.email_marketing` flipped to false.
- [ ] **No subscriber row** — pick a user not in `newsletter_subscribers`. Toggle `email_marketing` in profile — confirm no error.
- [ ] **Master unsubscribe ON** — toggle in EmailSettings. Confirm individual toggles visually disable. Verify `email_unsubscribed_all=true` in DB. Verify `newsletter_subscribers.unsubscribed_at` set for matching subscriber row. Trigger every cron (`low-supply`, `daily-reminders`, `weekly-summary`, `birthday-emails`, `campaign-queue`) — confirm user is skipped in each.
- [ ] **Master unsubscribe OFF** — toggle off. Verify individual settings preserved. Subscriber row's `unsubscribed_at` is NOT auto-cleared (intentional asymmetry).
- [ ] **Stack card simplified** — visit `/dashboard/stack` with a fresh analysis: button reads "View analysis". Edit stack so it goes stale; visit again: button still reads "View analysis"; "X items changed since" hint visible.
- [ ] **Re-analyze confirmation** — on the analysis page with stack changed, click Re-analyze. Modal appears. Cancel → no run, modal closes. Re-analyze → run starts, modal closes.
- [ ] **First-ever analysis** — bypass the modal: a brand-new analysis run (where `a === null`) goes straight to `handleRun` without the confirmation.
- [ ] **Print** — open the analysis page (Pro account, with at least one follow-up Q&A saved). Click Print. Verify in the print preview:
  - Header shows "For: <name>" and "Printed: <today>"
  - All five sections render with their findings
  - Saved Q&A pairs render under each finding
  - Follow-up Ask textareas + buttons hidden
  - Cap counter, banners, nav, action buttons hidden
  - Disclaimer present at the bottom
  - No section header orphaned at the bottom of a page
- [ ] **Backfill route deleted** — `ls src/app/api/admin/backfill-email-marketing/route.ts` returns "no such file" (cleaned up in Task 4).

- [ ] **Step 3: Push only after the user signs off**

When all matrix items pass AND the user gives explicit go-ahead:

```bash
git push origin main
```

Per the project's "test in local before pushing" rule, this push happens ONLY after manual QA passes and the user confirms.
