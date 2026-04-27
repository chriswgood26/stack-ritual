# Stack Analysis Follow-ups, Demographics, Re-analyze Gating — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Three coupled changes to the existing AI Stack Analysis feature: (1) hide the "Re-analyze" button when the stack is unchanged and remove the 3/day manual-rerun cap; (2) collect optional sex + birthday on `user_profiles` and feed sex + a derived age band into the analysis prompt, plus a Today-page birthday banner and once-per-year birthday email; (3) Pro-only per-finding follow-up Q&A capped at 20 per analysis.

**Architecture:** Additive only. New columns on `user_profiles`, one new table (`analysis_followups`), a new pure helper (`age-band.ts`), one new lib module (`analysis-followups.ts`) for the per-finding model call, three new API routes, one new hourly cron, and additions to existing analysis components/pages. Removal of the rate-limit plumbing is the only deletion.

**Tech Stack:** Next.js 16 App Router · Clerk auth · Supabase (`supabaseAdmin` service role) · Anthropic SDK (`claude-sonnet-4-6`) · Resend · Tailwind 4 · Vercel cron.

> **No automated tests in this project** (see `CLAUDE.md`). Verification steps use `npm run lint`, `npm run build`, manual `curl` against the dev server, and browser checks. Each task ends with a commit.
>
> **Don't push to origin/main during implementation.** The user is testing locally before pushing — final push happens only after the full QA pass in Task 10.

**Spec:** `docs/superpowers/specs/2026-04-26-stack-analysis-followups-design.md`

---

## File Structure

| File | Status | Responsibility |
|------|--------|----------------|
| `database-user-demographics.sql` | new | `sex`, `birth_month`, `birth_day`, `birth_year` on `user_profiles` |
| `database-birthday-email-tracking.sql` | new | `last_birthday_email_year` on `user_profiles` |
| `database-analysis-followups.sql` | new | `analysis_followups` table + RLS + indexes |
| `src/lib/age-band.ts` | new | Pure: `birthYearToAgeBand(year, today)` → 6-band string or null |
| `src/lib/analysis-types.ts` | modify | Drop `MANUAL_RERUN_DAILY_CAP`. Add `Demographics`, `AgeBand`, `Followup`. Bump `PROMPT_VERSION` to 2. Add `FOLLOWUPS_PER_ANALYSIS_CAP=20` and `FOLLOWUP_PROMPT_VERSION=1` |
| `src/lib/analysis.ts` | modify | Accept optional `user` param; append demographic clause to system prompt |
| `src/lib/analysis-followups.ts` | new | `runFollowup(finding, demographics, question)` — Anthropic call with cached system block |
| `src/lib/emails.ts` | modify | Add `sendBirthdayEmail(to, firstName)` |
| `src/app/api/analysis/run/route.ts` | modify | Drop rate-limit branch, add `409 nothing_to_analyze`, load demographics, pass to `runStackAnalysis` |
| `src/app/api/analysis/latest/route.ts` | modify | Drop `rate_limit` field; add `followups` array |
| `src/app/api/analysis/disclaimer/accept/route.ts` | modify | Accept optional demographics in body, persist alongside disclaimer |
| `src/app/api/analysis/followups/route.ts` | new | `POST` — gates, validate, call model, persist, return |
| `src/app/api/profile/demographics/route.ts` | new | `PUT` — update demographic columns from profile page |
| `src/app/api/profile/demographics-status/route.ts` | new | `GET` — small helper for the existing-user nudge banner: returns `{ has_any_demographics: boolean }` |
| `src/app/api/me/plan/route.ts` | new | `GET` — returns `{ plan: 'free' \| 'plus' \| 'pro' }` for client-side gating of the followup UI |
| `src/app/api/cron/birthday-emails/route.ts` | new | Hourly. Sends to users whose local 8am matches birthday this year |
| `src/app/dashboard/analysis/page.tsx` | modify | Gate "Re-analyze" on `stack_changed_since`. Drop rate-limit text. Cap counter. Group followups into cards. Existing-user demographics banner |
| `src/components/AnalysisDisclaimerModal.tsx` | modify | Add optional sex + birthday inputs; submit alongside disclaimer accept |
| `src/components/AnalysisFindingCard.tsx` | modify | Add Pro-gated follow-up panel |
| `src/components/AnalysisRecommendationCard.tsx` | modify | Same |
| `src/components/StackAnalysisCard.tsx` | modify | Drop rate-limit message; gate "Re-analyze" CTA on `stack_changed_since` |
| `src/components/PersonalSettings.tsx` | new | Profile-page client component for editing demographics |
| `src/app/dashboard/profile/page.tsx` | modify | Render `<PersonalSettings />` with current values |
| `src/app/dashboard/page.tsx` | modify | Render birthday banner when local date matches `birth_month`/`birth_day` |
| `src/lib/birthday.ts` | new | Pure helper: `isUserBirthdayToday(profile, tz, now)` |
| `vercel.json` | modify | Add `0 * * * *` cron for `/api/cron/birthday-emails` |

---

### Task 1: Database migrations

**Files:**
- Create: `database-user-demographics.sql`
- Create: `database-birthday-email-tracking.sql`
- Create: `database-analysis-followups.sql`

- [ ] **Step 1: Write `database-user-demographics.sql`**

```sql
-- Demographics for AI Stack Analysis personalization.
-- All fields nullable. Sex stores 'male' | 'female' | NULL (NULL = "prefer not to say").
-- Birthday columns are independently nullable so the user can fill any subset
-- (e.g., month + day only enables birthday celebration without age personalization).
-- See docs/superpowers/specs/2026-04-26-stack-analysis-followups-design.md

alter table user_profiles
  add column if not exists sex text check (sex in ('male','female')),
  add column if not exists birth_month smallint check (birth_month between 1 and 12),
  add column if not exists birth_day   smallint check (birth_day between 1 and 31),
  add column if not exists birth_year  smallint check (birth_year between 1900 and 2026);
```

- [ ] **Step 2: Write `database-birthday-email-tracking.sql`**

```sql
-- Tracks the most recent year a birthday email was successfully sent to the user.
-- Used by /api/cron/birthday-emails to dedupe across hourly runs and DST edges.
alter table user_profiles
  add column if not exists last_birthday_email_year smallint;
```

- [ ] **Step 3: Write `database-analysis-followups.sql`**

```sql
-- Per-finding follow-up Q&A on a stack analysis (Pro feature).
-- One row per question. (analysis_id, section, finding_index) identifies a
-- specific finding within an immutable analysis JSON. Cap of 20 followups
-- per analysis is enforced in /api/analysis/followups.
-- See docs/superpowers/specs/2026-04-26-stack-analysis-followups-design.md

create table if not exists analysis_followups (
  id uuid primary key default gen_random_uuid(),
  analysis_id uuid not null references stack_analyses(id) on delete cascade,
  user_id text not null,

  section text not null check (section in ('synergies','interactions','timing','redundancies','recommendations')),
  finding_index int not null,

  question text not null,
  answer text not null,

  created_at timestamptz not null default now(),

  -- observability / cost
  model text not null,
  prompt_version int not null default 1,
  input_tokens int,
  output_tokens int,
  cached_input_tokens int,
  duration_ms int
);

create index if not exists analysis_followups_analysis_idx
  on analysis_followups (analysis_id, created_at);
create index if not exists analysis_followups_user_idx
  on analysis_followups (user_id);

alter table analysis_followups enable row level security;

create policy "users read own followups"
  on analysis_followups for select
  using (auth.jwt() ->> 'sub' = user_id);
-- writes are server-only via supabaseAdmin; no insert policy
```

- [ ] **Step 4: Tell the user to run all three in Supabase**

Pause and tell the user:
> "Three migrations are ready: `database-user-demographics.sql`, `database-birthday-email-tracking.sql`, `database-analysis-followups.sql`. Per the project's manual-migrations rule, please run them in Supabase in that order, then confirm so I continue. (`alter table … add column if not exists` is idempotent; the followup table uses `create table if not exists` and `create index if not exists`, so re-running is safe.)"

Wait for "ok ran them" before continuing.

- [ ] **Step 5: Commit**

```bash
git add database-user-demographics.sql database-birthday-email-tracking.sql database-analysis-followups.sql
git commit -m "$(cat <<'EOF'
feat(analysis): db migrations for demographics, birthday tracking, followups

Three additive migrations: optional sex/birthday on user_profiles for AI
analysis personalization and birthday celebration; last_birthday_email_year
for cron dedupe; analysis_followups table for Pro per-finding Q&A.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Re-analyze gating + rate-limit removal

**Files:**
- Modify: `src/lib/analysis-types.ts`
- Modify: `src/app/api/analysis/run/route.ts`
- Modify: `src/app/api/analysis/latest/route.ts`
- Modify: `src/app/dashboard/analysis/page.tsx`
- Modify: `src/components/StackAnalysisCard.tsx`

- [ ] **Step 1: Drop the rate-limit constants and field from `src/lib/analysis-types.ts`**

In `src/lib/analysis-types.ts`, remove the line `export const MANUAL_RERUN_DAILY_CAP = 3;` (last line of the file) and remove the `rate_limit` field from `LatestAnalysisResponse`. The updated `LatestAnalysisResponse` should read:

```ts
export type LatestAnalysisResponse = {
  analysis: AnalysisRow | null;
  stack_changed_since: boolean;
  changes_summary: ChangesSummary;
  disclaimer: {
    accepted: boolean;
    version: number | null;
    current_version: number;
  };
};
```

(Leave `CURRENT_DISCLAIMER_VERSION`, `PROMPT_VERSION`, `ANALYSIS_MODEL` in place. Task 3 bumps `PROMPT_VERSION` and adds new constants.)

- [ ] **Step 2: Update `/api/analysis/run/route.ts` — drop the rate-limit branch, add `nothing_to_analyze`**

Make these edits to `src/app/api/analysis/run/route.ts`:

a) Update the import block at the top:

```ts
import {
  CURRENT_DISCLAIMER_VERSION,
  type AnalysisRunTrigger,
  type StackSnapshotItem,
} from "@/lib/analysis-types";
```

(Removes `MANUAL_RERUN_DAILY_CAP` from the import.)

b) Replace the trigger-classification block. The existing block reads:

```ts
  let trigger: AnalysisRunTrigger;
  if (!latest) {
    trigger = "initial";
  } else {
    const changes = diffSnapshot(
      (latest.stack_snapshot as StackSnapshotItem[]) ?? [],
      stack,
    );
    trigger = changesSummaryHasChanges(changes) ? "stack_changed" : "manual_rerun";
  }

  if (trigger === "manual_rerun") {
    const startOfDayUtc = new Date();
    startOfDayUtc.setUTCHours(0, 0, 0, 0);
    const { count: usedToday } = await supabaseAdmin
      .from("stack_analyses")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("trigger", "manual_rerun")
      .gte("created_at", startOfDayUtc.toISOString());
    if ((usedToday ?? 0) >= MANUAL_RERUN_DAILY_CAP) {
      const tomorrow = new Date();
      tomorrow.setUTCHours(24, 0, 0, 0);
      return NextResponse.json(
        { error: "rate_limited", retry_after: tomorrow.toISOString() },
        { status: 429 },
      );
    }
  }
```

Replace it entirely with:

```ts
  let trigger: AnalysisRunTrigger;
  if (!latest) {
    trigger = "initial";
  } else {
    const changes = diffSnapshot(
      (latest.stack_snapshot as StackSnapshotItem[]) ?? [],
      stack,
    );
    if (!changesSummaryHasChanges(changes)) {
      // Stack hasn't changed since the last analysis. The UI hides the
      // Re-analyze button in this state; this branch defends against direct
      // API calls.
      return NextResponse.json(
        { error: "nothing_to_analyze" },
        { status: 409 },
      );
    }
    trigger = "stack_changed";
  }
```

- [ ] **Step 3: Update `/api/analysis/latest/route.ts` — drop the `rate_limit` field**

In `src/app/api/analysis/latest/route.ts`:

a) Update the import block:

```ts
import {
  CURRENT_DISCLAIMER_VERSION,
  type LatestAnalysisResponse,
  type StackSnapshotItem,
} from "@/lib/analysis-types";
```

(Removes `MANUAL_RERUN_DAILY_CAP`.)

b) Delete the entire "Manual re-runs used today" block:

```ts
  // Manual re-runs used today (for the rate-limit display)
  const startOfDayUtc = new Date();
  startOfDayUtc.setUTCHours(0, 0, 0, 0);
  const { count: manualRunsToday } = await supabaseAdmin
    .from("stack_analyses")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("trigger", "manual_rerun")
    .gte("created_at", startOfDayUtc.toISOString());
```

c) Update the response body — remove the `rate_limit` field:

```ts
  const body: LatestAnalysisResponse = {
    analysis: latest
      ? {
          id: latest.id,
          created_at: latest.created_at,
          trigger: latest.trigger,
          stack_item_count: latest.stack_item_count,
          analysis: latest.analysis,
        }
      : null,
    stack_changed_since: latest
      ? changesSummaryHasChanges(changes)
      : false,
    changes_summary: changes,
    disclaimer: {
      accepted: disclaimerAccepted,
      version: disclaimerVersion,
      current_version: CURRENT_DISCLAIMER_VERSION,
    },
  };
```

- [ ] **Step 4: Update `/dashboard/analysis/page.tsx` — gate Re-analyze, drop rate-limit messaging**

In `src/app/dashboard/analysis/page.tsx`:

a) The button + counter block currently reads:

```tsx
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleRun}
          disabled={running}
          className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white disabled:bg-stone-300"
        >
          {running ? "Analyzing..." : a ? "Re-analyze" : "Analyze my stack"}
        </button>
        {latest ? (
          <span className="text-xs text-stone-500">
            {latest.rate_limit.manual_runs_used_today}/
            {latest.rate_limit.daily_cap} manual re-runs used today
          </span>
        ) : null}
      </div>
```

Replace it with:

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

b) Delete the rate-limited error block — remove this entire section:

```tsx
      {error === "rate_limited" ? (
        <p className="mt-3 text-sm text-amber-700">
          You&apos;ve used today&apos;s manual re-runs. Stack changes refresh
          free, or come back tomorrow.
        </p>
      ) : null}
```

c) In `handleRun`, remove the 429 special case. The existing block reads:

```tsx
      if (res.status === 429) {
        setError("rate_limited");
        return;
      }
```

Delete it entirely.

d) The error-display fallback line — `{error && !["rate_limited", "empty_stack"].includes(error) ? (` — should be simplified to:

```tsx
      {error && error !== "empty_stack" ? (
```

- [ ] **Step 5: Update `StackAnalysisCard.tsx` — drop rate-limit message**

In `src/components/StackAnalysisCard.tsx`, delete the `capUsed` const and the `capUsed` JSX block. The existing fragment:

```tsx
  const { analysis, stack_changed_since, changes_summary, rate_limit } = data;
  const capUsed =
    rate_limit.manual_runs_used_today >= rate_limit.daily_cap &&
    !stack_changed_since;
```

becomes:

```tsx
  const { analysis, stack_changed_since, changes_summary } = data;
```

And delete this block entirely:

```tsx
      {capUsed ? (
        <p className="mt-2 text-xs text-amber-700">
          Daily re-runs used. Stack changes refresh free, or come back tomorrow.
        </p>
      ) : null}
```

The existing CTA already keys correctly off `stack_changed_since` for the "Re-analyze" / "View results" label — no change needed there.

- [ ] **Step 6: Lint check**

Run: `npm run lint 2>&1 | grep -E "(analysis|StackAnalysisCard)" | head -30`
Expected: no new errors in any file modified in this task. (Pre-existing repo-wide lint errors in other files are out of scope.)

- [ ] **Step 7: Manual test in dev server**

Run: `npm run dev`

In a Pro/Plus account with a non-empty stack:
1. Visit `/dashboard/analysis`. If a fresh analysis exists (stack hasn't changed since last run), confirm the Re-analyze button is **hidden**. Confirm no rate-limit counter is shown.
2. Edit your stack (e.g., add or pause an item). Re-visit `/dashboard/analysis`. Confirm the Re-analyze button now **appears** and the page shows "X items changed since."
3. Test direct API defense: with stack unchanged, run:
   ```bash
   curl -X POST http://localhost:3000/api/analysis/run \
     -H "Cookie: $(your dev cookie here)" \
     -i
   ```
   Expected: HTTP 409 with `{"error":"nothing_to_analyze"}`.
4. On `/dashboard/stack`, confirm the StackAnalysisCard still renders correctly (View results when fresh; Re-analyze when stale; no "Daily re-runs used" message ever).

- [ ] **Step 8: Commit**

```bash
git add src/lib/analysis-types.ts src/app/api/analysis/run/route.ts src/app/api/analysis/latest/route.ts src/app/dashboard/analysis/page.tsx src/components/StackAnalysisCard.tsx
git commit -m "$(cat <<'EOF'
feat(analysis): hide re-analyze when stack unchanged; drop manual-rerun cap

Stack analysis no longer shows the Re-analyze button when the stack hasn't
changed since the last analysis — there's no point re-running the same
input. The 3/day manual-rerun cap and its plumbing are removed since
nothing produces a manual_rerun trigger anymore. Direct /api/analysis/run
calls with unchanged stack now return 409 nothing_to_analyze.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Demographics types + age-band helper + analysis prompt update

**Files:**
- Create: `src/lib/age-band.ts`
- Modify: `src/lib/analysis-types.ts`
- Modify: `src/lib/analysis.ts`

- [ ] **Step 1: Create `src/lib/age-band.ts`**

```ts
// Pure: derive an age band from a birth year. Used by the analysis route
// to send a coarse age signal (not exact age) to the LLM.
//
// Returns null when:
//  - birthYear is null/undefined
//  - derived age is < 18 (per spec: minors get generic analysis, no
//    demographic personalization)

export type AgeBand =
  | "18-24"
  | "25-34"
  | "35-44"
  | "45-54"
  | "55-64"
  | "65+";

export function birthYearToAgeBand(
  birthYear: number | null | undefined,
  today: Date = new Date(),
): AgeBand | null {
  if (birthYear == null) return null;
  const age = today.getFullYear() - birthYear;
  if (age < 18) return null;
  if (age <= 24) return "18-24";
  if (age <= 34) return "25-34";
  if (age <= 44) return "35-44";
  if (age <= 54) return "45-54";
  if (age <= 64) return "55-64";
  return "65+";
}
```

- [ ] **Step 2: Update `src/lib/analysis-types.ts` — add types and bump versions**

Edit `src/lib/analysis-types.ts` to:

a) Re-export the AgeBand type and the Demographics shape near the top of the file (after the `FindingSeverity` line):

```ts
export type Sex = "male" | "female";

export type Demographics = {
  sex: Sex | null;
  birth_month: number | null;
  birth_day: number | null;
  birth_year: number | null;
};

export type AnalysisUserContext = {
  sex: Sex | null;
  age_band:
    | "18-24"
    | "25-34"
    | "35-44"
    | "45-54"
    | "55-64"
    | "65+"
    | null;
};
```

b) Add the `Followup` type near the bottom of the file (before the constants):

```ts
export type Followup = {
  id: string;
  section: keyof AnalysisSections;
  finding_index: number;
  question: string;
  answer: string;
  created_at: string;
};
```

c) Update `LatestAnalysisResponse` to include `followups`:

```ts
export type LatestAnalysisResponse = {
  analysis: AnalysisRow | null;
  stack_changed_since: boolean;
  changes_summary: ChangesSummary;
  followups: Followup[];
  disclaimer: {
    accepted: boolean;
    version: number | null;
    current_version: number;
  };
};
```

d) Bump `PROMPT_VERSION` from 1 to 2 and add new constants:

```ts
export const CURRENT_DISCLAIMER_VERSION = 1;
export const PROMPT_VERSION = 2;
export const ANALYSIS_MODEL = "claude-sonnet-4-6";
export const FOLLOWUPS_PER_ANALYSIS_CAP = 20;
export const FOLLOWUP_PROMPT_VERSION = 1;
```

- [ ] **Step 3: Update `src/lib/analysis.ts` — accept user context, append demographic prompt clause**

Make these edits to `src/lib/analysis.ts`:

a) The `SYSTEM_PROMPT` constant currently ends with `f) Output channel...`. Append a new clause `g)` immediately before the closing backtick. The new tail of the prompt should read:

```
f) Output channel. Output MUST be exactly one call to the submit_stack_analysis tool. No prose, preamble, or explanation outside the tool call.

g) Demographic personalization. If the request user message JSON includes a "user" object with "sex" and/or "age_band", weight findings and recommendations to that demographic where research supports it (e.g., iron needs for menstruating users; sarcopenia/protein for 55+; bone health for postmenopausal users). When the "user" object is absent, give general guidance with no demographic assumptions.
```

b) Update the function signature and user-message construction. Replace the existing `runStackAnalysis` signature and the JSON.stringify line:

Before:
```ts
export async function runStackAnalysis(
  stack: StackSnapshotItem[],
  catalog: CatalogEntry[],
): Promise<AnalysisRunOutput> {
```

After:
```ts
export async function runStackAnalysis(
  stack: StackSnapshotItem[],
  catalog: CatalogEntry[],
  user: AnalysisUserContext | null = null,
): Promise<AnalysisRunOutput> {
```

Add `AnalysisUserContext` to the imports at the top:

```ts
import type {
  AnalysisSections,
  AnalysisUserContext,
  Recommendation,
  StackSnapshotItem,
} from "./analysis-types";
```

c) Update the `userMessage` construction to include the user block when present. Replace:

```ts
  const userMessage = JSON.stringify({
    stack: stack.map(s => ({
      name: s.name,
      dose: s.dose,
      timing: s.timing,
      frequency: s.frequency,
      brand: s.brand,
      notes: s.notes,
    })),
  });
```

With:

```ts
  const includeUser =
    user !== null && (user.sex !== null || user.age_band !== null);
  const userMessage = JSON.stringify({
    stack: stack.map(s => ({
      name: s.name,
      dose: s.dose,
      timing: s.timing,
      frequency: s.frequency,
      brand: s.brand,
      notes: s.notes,
    })),
    ...(includeUser ? { user: { sex: user!.sex, age_band: user!.age_band } } : {}),
  });
```

- [ ] **Step 4: Lint check**

Run: `npm run lint 2>&1 | grep -E "(age-band|analysis-types|analysis\.ts)" | head -20`
Expected: no new errors.

- [ ] **Step 5: Build check**

Run: `npm run build 2>&1 | tail -30`
Expected: build succeeds. (Type changes ripple through callers; this verifies the analysis-run route still typechecks even though it doesn't yet pass `user`.)

- [ ] **Step 6: Commit**

```bash
git add src/lib/age-band.ts src/lib/analysis-types.ts src/lib/analysis.ts
git commit -m "$(cat <<'EOF'
feat(analysis): demographics types + age-band helper + prompt clause

Add Demographics/AnalysisUserContext/Followup types. New age-band helper
derives a 6-band age string from birth year (null for under-18). Analysis
system prompt gains a demographic-personalization clause and an optional
user block in the request JSON. PROMPT_VERSION bumps to 2; historical
rows stay attributable to the older prompt.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: API extensions — disclaimer/accept, profile/demographics, analysis/run loads demographics

**Files:**
- Modify: `src/app/api/analysis/disclaimer/accept/route.ts`
- Create: `src/app/api/profile/demographics/route.ts`
- Modify: `src/app/api/analysis/run/route.ts`

- [ ] **Step 1: Extend `disclaimer/accept` to accept demographics**

Replace the entire body of `src/app/api/analysis/disclaimer/accept/route.ts` with:

```ts
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { CURRENT_DISCLAIMER_VERSION } from "@/lib/analysis-types";

type Body = {
  version?: number;
  sex?: "male" | "female" | null;
  birth_month?: number | null;
  birth_day?: number | null;
  birth_year?: number | null;
};

function clean<T extends number | string | null>(v: T, ok: (x: NonNullable<T>) => boolean): T | null {
  if (v === null || v === undefined) return null;
  return ok(v as NonNullable<T>) ? v : null;
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as Body;
  const version = Number(body.version);
  if (!Number.isFinite(version) || version < 1) {
    return NextResponse.json({ error: "version required" }, { status: 400 });
  }
  if (version > CURRENT_DISCLAIMER_VERSION) {
    return NextResponse.json({ error: "unknown_version" }, { status: 400 });
  }

  // Demographics — optional; sanitize. Anything invalid becomes null
  // rather than a 400, so a typo can't block disclaimer acceptance.
  const sex = clean(body.sex ?? null, (v) => v === "male" || v === "female");
  const birth_month = clean(body.birth_month ?? null, (v) => v >= 1 && v <= 12);
  const birth_day = clean(body.birth_day ?? null, (v) => v >= 1 && v <= 31);
  const birth_year = clean(body.birth_year ?? null, (v) => v >= 1900 && v <= 2026);

  const acceptedAt = new Date().toISOString();
  const update: Record<string, unknown> = {
    analysis_disclaimer_accepted_at: acceptedAt,
    analysis_disclaimer_version: version,
  };
  // Only write demographic columns when the caller actually supplied them
  // (so this endpoint stays backwards compatible with any old client).
  if ("sex" in body) update.sex = sex;
  if ("birth_month" in body) update.birth_month = birth_month;
  if ("birth_day" in body) update.birth_day = birth_day;
  if ("birth_year" in body) update.birth_year = birth_year;

  const { error } = await supabaseAdmin
    .from("user_profiles")
    .update(update)
    .eq("user_id", userId);

  if (error) {
    console.error("disclaimer accept failed", error);
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, accepted_at: acceptedAt });
}
```

- [ ] **Step 2: Create `src/app/api/profile/demographics/route.ts`**

```ts
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

type Body = {
  sex?: "male" | "female" | null;
  birth_month?: number | null;
  birth_day?: number | null;
  birth_year?: number | null;
};

function clean<T extends number | string | null>(v: T, ok: (x: NonNullable<T>) => boolean): T | null {
  if (v === null || v === undefined) return null;
  return ok(v as NonNullable<T>) ? v : null;
}

export async function PUT(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as Body;

  const sex = clean(body.sex ?? null, (v) => v === "male" || v === "female");
  const birth_month = clean(body.birth_month ?? null, (v) => v >= 1 && v <= 12);
  const birth_day = clean(body.birth_day ?? null, (v) => v >= 1 && v <= 31);
  const birth_year = clean(body.birth_year ?? null, (v) => v >= 1900 && v <= 2026);

  const { error } = await supabaseAdmin
    .from("user_profiles")
    .update({ sex, birth_month, birth_day, birth_year })
    .eq("user_id", userId);

  if (error) {
    console.error("demographics update failed", error);
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: Update `/api/analysis/run` to load and pass demographics**

In `src/app/api/analysis/run/route.ts`:

a) Update the `user_profiles` select (currently fetching just the disclaimer version) to also load demographics. Replace:

```ts
  const { data: profile } = await supabaseAdmin
    .from("user_profiles")
    .select("analysis_disclaimer_version")
    .eq("user_id", userId)
    .single();
  const disclaimerVersion = profile?.analysis_disclaimer_version ?? null;
```

With:

```ts
  const { data: profile } = await supabaseAdmin
    .from("user_profiles")
    .select("analysis_disclaimer_version, sex, birth_year")
    .eq("user_id", userId)
    .single();
  const disclaimerVersion = profile?.analysis_disclaimer_version ?? null;
```

b) Add the import at the top:

```ts
import { birthYearToAgeBand } from "@/lib/age-band";
```

And add `AnalysisUserContext` to the existing types import:

```ts
import {
  CURRENT_DISCLAIMER_VERSION,
  type AnalysisRunTrigger,
  type AnalysisUserContext,
  type StackSnapshotItem,
} from "@/lib/analysis-types";
```

c) Just above the `// Call the model` comment, build the user context. Insert:

```ts
  const userContext: AnalysisUserContext | null = profile
    ? {
        sex: (profile.sex as "male" | "female" | null) ?? null,
        age_band: birthYearToAgeBand(profile.birth_year),
      }
    : null;
```

d) Update the call to `runStackAnalysis` to pass `userContext`. The existing line:

```ts
    result = await runStackAnalysis(stack, catalog);
```

becomes:

```ts
    result = await runStackAnalysis(stack, catalog, userContext);
```

- [ ] **Step 4: Lint + build**

Run: `npm run lint 2>&1 | grep -E "(disclaimer/accept|profile/demographics|analysis/run)" | head -20`
Expected: no new errors.

Run: `npm run build 2>&1 | tail -20`
Expected: build succeeds.

- [ ] **Step 5: Manual test in dev server**

With dev server running:

1. As a Plus/Pro user, hit the demographics endpoint:
   ```bash
   curl -X PUT http://localhost:3000/api/profile/demographics \
     -H "Content-Type: application/json" \
     -H "Cookie: $(your dev cookie)" \
     -d '{"sex":"female","birth_month":3,"birth_day":15,"birth_year":1990}'
   ```
   Expected: `{"ok":true}`. Verify in Supabase that the row updated.

2. Edit your stack (so re-analyze is allowed) and trigger an analysis from the UI. In the dev server logs, confirm the `[analysis] claude-sonnet-4-6 stop=...` log line — the analysis should run successfully. The user message body isn't logged but the run will work; the prompt change is verified via the next browser test (after Task 5).

3. Re-PUT with `{"sex":null,"birth_year":null,"birth_month":null,"birth_day":null}` — confirm the row clears.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/analysis/disclaimer/accept/route.ts src/app/api/profile/demographics/route.ts src/app/api/analysis/run/route.ts
git commit -m "$(cat <<'EOF'
feat(analysis): wire demographics into disclaimer accept, run, and profile

The disclaimer-accept endpoint now persists optional sex + birthday fields
alongside disclaimer acceptance. New PUT /api/profile/demographics lets
users edit them later. /api/analysis/run loads the user's demographics,
derives an age band, and passes the user context to runStackAnalysis.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Demographics modal supplement + Profile Personal section + existing-user banner

**Files:**
- Modify: `src/components/AnalysisDisclaimerModal.tsx`
- Create: `src/components/PersonalSettings.tsx`
- Modify: `src/app/dashboard/profile/page.tsx`
- Modify: `src/app/dashboard/analysis/page.tsx`

- [ ] **Step 1: Extend `AnalysisDisclaimerModal.tsx` with optional demographics inputs**

Replace the entire contents of `src/components/AnalysisDisclaimerModal.tsx` with:

```tsx
"use client";

import { useState } from "react";
import { CURRENT_DISCLAIMER_VERSION } from "@/lib/analysis-types";

type Props = {
  onAccepted: () => void;
  onCancel: () => void;
};

export default function AnalysisDisclaimerModal({ onAccepted, onCancel }: Props) {
  const [understood, setUnderstood] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [sex, setSex] = useState<"" | "male" | "female">("");
  const [birthMonth, setBirthMonth] = useState("");
  const [birthDay, setBirthDay] = useState("");
  const [birthYear, setBirthYear] = useState("");

  function parseIntOrNull(s: string): number | null {
    if (!s.trim()) return null;
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  }

  async function handleContinue() {
    if (!understood || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/analysis/disclaimer/accept", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          version: CURRENT_DISCLAIMER_VERSION,
          sex: sex === "" ? null : sex,
          birth_month: parseIntOrNull(birthMonth),
          birth_day: parseIntOrNull(birthDay),
          birth_year: parseIntOrNull(birthYear),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      onAccepted();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-semibold text-stone-900">
          Before we analyze your stack
        </h2>
        <p className="mt-3 text-sm text-stone-700">
          This analysis is informational, not medical advice. We&apos;ll
          generate an AI summary based on what you&apos;ve logged.
        </p>
        <p className="mt-2 text-sm text-stone-700">
          Talk to your doctor before adding, removing, or changing any
          supplement.
        </p>

        <label className="mt-4 flex items-start gap-2 text-sm text-stone-800">
          <input
            type="checkbox"
            className="mt-0.5"
            checked={understood}
            onChange={e => setUnderstood(e.target.checked)}
          />
          <span>I understand</span>
        </label>

        <div className="mt-5 border-t border-stone-200 pt-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">
            Optional — for personalized results
          </p>

          <label className="mt-3 block text-sm">
            <span className="text-stone-700">Biological sex</span>
            <select
              value={sex}
              onChange={e => setSex(e.target.value as "" | "male" | "female")}
              className="mt-1 block w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
            >
              <option value="">Prefer not to say</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </label>

          <div className="mt-3">
            <span className="text-sm text-stone-700">Birthday</span>
            <div className="mt-1 grid grid-cols-3 gap-2">
              <input
                type="number"
                min={1}
                max={12}
                placeholder="MM"
                value={birthMonth}
                onChange={e => setBirthMonth(e.target.value)}
                className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
              />
              <input
                type="number"
                min={1}
                max={31}
                placeholder="DD"
                value={birthDay}
                onChange={e => setBirthDay(e.target.value)}
                className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
              />
              <input
                type="number"
                min={1900}
                max={2026}
                placeholder="YYYY"
                value={birthYear}
                onChange={e => setBirthYear(e.target.value)}
                className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
              />
            </div>
            <p className="mt-1 text-xs text-stone-500">
              Year unlocks age-personalized analysis. Skip the year and we&apos;ll just send you a happy birthday note.
            </p>
          </div>
        </div>

        {error ? (
          <p className="mt-3 text-sm text-red-600">Couldn&apos;t save: {error}</p>
        ) : null}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg px-4 py-2 text-sm text-stone-700 hover:bg-stone-100"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleContinue}
            disabled={!understood || submitting}
            className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white disabled:bg-stone-300"
          >
            {submitting ? "Saving..." : "Continue"}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create `src/components/PersonalSettings.tsx`**

```tsx
"use client";

import { useState } from "react";

type Props = {
  initial: {
    sex: "male" | "female" | null;
    birth_month: number | null;
    birth_day: number | null;
    birth_year: number | null;
  };
};

export default function PersonalSettings({ initial }: Props) {
  const [sex, setSex] = useState<"" | "male" | "female">(initial.sex ?? "");
  const [birthMonth, setBirthMonth] = useState(initial.birth_month != null ? String(initial.birth_month) : "");
  const [birthDay, setBirthDay] = useState(initial.birth_day != null ? String(initial.birth_day) : "");
  const [birthYear, setBirthYear] = useState(initial.birth_year != null ? String(initial.birth_year) : "");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  function parseIntOrNull(s: string): number | null {
    if (!s.trim()) return null;
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  }

  async function handleSave() {
    if (saving) return;
    setSaving(true);
    setStatus("idle");
    setErrorMsg(null);
    try {
      const res = await fetch("/api/profile/demographics", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sex: sex === "" ? null : sex,
          birth_month: parseIntOrNull(birthMonth),
          birth_day: parseIntOrNull(birthDay),
          birth_year: parseIntOrNull(birthYear),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      setStatus("saved");
    } catch (e) {
      setStatus("error");
      setErrorMsg(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-white border border-stone-200 rounded-2xl p-5">
      <h3 className="font-semibold text-stone-900">Personal</h3>
      <p className="mt-1 text-xs text-stone-500">
        Optional — used to personalize your stack analysis and to send you a happy birthday note.
      </p>

      <label className="mt-4 block text-sm">
        <span className="text-stone-700">Biological sex</span>
        <select
          value={sex}
          onChange={e => setSex(e.target.value as "" | "male" | "female")}
          className="mt-1 block w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
        >
          <option value="">Prefer not to say</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
        </select>
      </label>

      <div className="mt-3">
        <span className="text-sm text-stone-700">Birthday</span>
        <div className="mt-1 grid grid-cols-3 gap-2">
          <input
            type="number"
            min={1}
            max={12}
            placeholder="MM"
            value={birthMonth}
            onChange={e => setBirthMonth(e.target.value)}
            className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
          />
          <input
            type="number"
            min={1}
            max={31}
            placeholder="DD"
            value={birthDay}
            onChange={e => setBirthDay(e.target.value)}
            className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
          />
          <input
            type="number"
            min={1900}
            max={2026}
            placeholder="YYYY"
            value={birthYear}
            onChange={e => setBirthYear(e.target.value)}
            className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
          />
        </div>
        <p className="mt-1 text-xs text-stone-500">
          Year unlocks age-personalized stack analysis. Leave blank for celebration only.
        </p>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white disabled:bg-stone-300"
        >
          {saving ? "Saving..." : "Save"}
        </button>
        {status === "saved" ? <span className="text-xs text-emerald-700">Saved.</span> : null}
        {status === "error" ? <span className="text-xs text-red-600">{errorMsg}</span> : null}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Render `<PersonalSettings />` on `/dashboard/profile`**

In `src/app/dashboard/profile/page.tsx`:

a) Add the import near the top alongside the other component imports:

```ts
import PersonalSettings from "@/components/PersonalSettings";
```

b) Update the data-fetch — the page currently selects `subscription` columns; extend the user_profiles fetch. Find the `Promise.all` block that fetches `subscription`/`stackItems`/`latestRelease`, and add a new sibling fetch for the demographics:

```ts
    supabaseAdmin
      .from("user_profiles")
      .select("sex, birth_month, birth_day, birth_year")
      .eq("user_id", userId)
      .maybeSingle(),
```

Then destructure the result:

```ts
  const [
    { data: myExperiences },
    { data: subscription },
    { data: stackItems },
    { data: latestRelease },
    { data: profileRow },
  ] = await Promise.all([
    // ... (existing four)
    supabaseAdmin
      .from("user_profiles")
      .select("sex, birth_month, birth_day, birth_year")
      .eq("user_id", userId)
      .maybeSingle(),
  ]);
```

c) Render the component. The natural placement is just below the existing "Profile card" block but above SMS/email settings. Add inside the main `<div className="max-w-lg mx-auto px-4 py-6 space-y-5">` wrapper:

```tsx
        <PersonalSettings
          initial={{
            sex: (profileRow?.sex as "male" | "female" | null) ?? null,
            birth_month: profileRow?.birth_month ?? null,
            birth_day: profileRow?.birth_day ?? null,
            birth_year: profileRow?.birth_year ?? null,
          }}
        />
```

The `space-y-5` parent already handles vertical spacing.

- [ ] **Step 4: Add the existing-user upgrade banner on `/dashboard/analysis`**

In `src/app/dashboard/analysis/page.tsx`:

a) Add a new piece of state near the other state declarations in the `AnalysisPage` component:

```tsx
  const [showDemoBanner, setShowDemoBanner] = useState(false);
```

b) Inside the `load` callback, after the `setLatest(data)` and `if (!data.disclaimer.accepted) setShowDisclaimer(true);` lines, add:

```tsx
      // Existing-user demographics nudge: disclaimer accepted but no
      // demographics set yet AND user hasn't dismissed the banner before.
      if (data.disclaimer.accepted) {
        try {
          const dismissed = typeof window !== "undefined" && window.localStorage.getItem("sr.demographics_banner_dismissed") === "1";
          if (!dismissed) {
            const profileRes = await fetch("/api/profile/demographics-status", { credentials: "include" });
            if (profileRes.ok) {
              const status = await profileRes.json() as { has_any_demographics: boolean };
              setShowDemoBanner(!status.has_any_demographics);
            }
          }
        } catch {
          // best-effort; banner just won't render
        }
      }
```

> Note for the implementer: this references a small read-only endpoint we'll add at `/api/profile/demographics-status` for an honest "does this user have any demographic columns set" check. Add that endpoint as part of this step (see step 5).

c) Render the banner. Just below the `<h1>Stack Analysis</h1>` line and before the `<p className="mt-1...">Based on...</p>` block, insert:

```tsx
      {showDemoBanner ? (
        <div className="mt-3 flex items-start justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <span>
            💡 Personalize your analysis — add age & sex on your{" "}
            <Link href="/dashboard/profile" className="underline font-medium">
              profile
            </Link>
            .
          </span>
          <button
            type="button"
            onClick={() => {
              setShowDemoBanner(false);
              if (typeof window !== "undefined") {
                window.localStorage.setItem("sr.demographics_banner_dismissed", "1");
              }
            }}
            className="text-amber-900 hover:text-amber-950"
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      ) : null}
```

- [ ] **Step 5: Create `/api/profile/demographics-status/route.ts`**

```ts
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data } = await supabaseAdmin
    .from("user_profiles")
    .select("sex, birth_month, birth_day, birth_year")
    .eq("user_id", userId)
    .maybeSingle();

  const hasAny =
    !!data &&
    (data.sex !== null ||
      data.birth_month !== null ||
      data.birth_day !== null ||
      data.birth_year !== null);

  return NextResponse.json({ has_any_demographics: hasAny });
}
```

(Add this to the `File Structure` mental model — the implementer should also include it in the next commit.)

- [ ] **Step 6: Lint + build**

Run: `npm run lint 2>&1 | grep -E "(AnalysisDisclaimerModal|PersonalSettings|profile/demographics|dashboard/analysis|dashboard/profile)" | head -30`
Expected: no new errors.

Run: `npm run build 2>&1 | tail -10`
Expected: build succeeds.

- [ ] **Step 7: Manual test in dev server**

1. **First-run user (or with disclaimer reset):** delete your row's `analysis_disclaimer_version` in Supabase, then visit `/dashboard/analysis`. The modal should now show the disclaimer + the optional sex/birthday inputs. Tick "I understand," fill in birthday with year, click Continue. Verify the row is updated in Supabase with `sex`, `birth_month`, `birth_day`, `birth_year`.

2. **Profile editing:** visit `/dashboard/profile`. The new "Personal" card should render with your saved values. Change sex to "Prefer not to say" (clears it) and clear birthday year. Click Save → "Saved." appears. Verify Supabase row reflects the changes.

3. **Existing-user banner:** in Supabase, set all four demographic columns to null but leave `analysis_disclaimer_version=1`. Clear `localStorage.sr.demographics_banner_dismissed`. Visit `/dashboard/analysis` — the amber banner should appear linking to profile. Click ✕ — banner disappears and `localStorage` entry is set. Refresh — banner stays hidden.

4. **Run analysis with demographics:** with sex='female' and birth_year=1985 set, edit your stack to make it dirty, then click Re-analyze. The run should succeed and the response should reflect demographic-aware framing in some sections (subjective check; rerun a few times if not obvious).

- [ ] **Step 8: Commit**

```bash
git add src/components/AnalysisDisclaimerModal.tsx src/components/PersonalSettings.tsx src/app/dashboard/profile/page.tsx src/app/dashboard/analysis/page.tsx src/app/api/profile/demographics-status/route.ts
git commit -m "$(cat <<'EOF'
feat(analysis): demographics in disclaimer modal + profile page + nudge banner

The first-run analysis modal now collects optional sex and birthday
alongside the disclaimer. Profile page gets a new 'Personal' section to
edit later. Returning users (already accepted disclaimer at v1, no
demographics set) see a dismissible banner on the analysis page nudging
them to add demographics. Banner dismissal persists in localStorage.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: Birthday celebration — Today banner + email template + hourly cron

**Files:**
- Create: `src/lib/birthday.ts`
- Modify: `src/lib/emails.ts`
- Create: `src/app/api/cron/birthday-emails/route.ts`
- Modify: `src/app/dashboard/page.tsx`
- Modify: `vercel.json`

- [ ] **Step 1: Create `src/lib/birthday.ts`**

```ts
// Pure helpers for birthday celebration logic.
// Computing "is today the user's birthday in their timezone" requires the
// user's timezone string (IANA, e.g. "America/Los_Angeles"). We use
// Intl.DateTimeFormat to extract local date parts.

export type BirthdayProfile = {
  birth_month: number | null;
  birth_day: number | null;
  timezone: string | null;
};

function getLocalParts(tz: string, now: Date): { month: number; day: number; hour: number } | null {
  try {
    const fmt = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      hour12: false,
    });
    const parts = Object.fromEntries(
      fmt.formatToParts(now).map(p => [p.type, p.value]),
    ) as Record<string, string>;
    const month = Number(parts.month);
    const day = Number(parts.day);
    const hour = Number(parts.hour);
    if (!Number.isFinite(month) || !Number.isFinite(day) || !Number.isFinite(hour)) return null;
    return { month, day, hour };
  } catch {
    return null;
  }
}

export function isUserBirthdayToday(
  profile: BirthdayProfile,
  now: Date = new Date(),
): boolean {
  if (profile.birth_month == null || profile.birth_day == null) return false;
  if (!profile.timezone) return false;
  const local = getLocalParts(profile.timezone, now);
  if (!local) return false;
  return local.month === profile.birth_month && local.day === profile.birth_day;
}

export function userLocalHour(timezone: string, now: Date = new Date()): number | null {
  const local = getLocalParts(timezone, now);
  return local?.hour ?? null;
}
```

- [ ] **Step 2: Append `sendBirthdayEmail` to `src/lib/emails.ts`**

Append to the end of the file (after the last existing function):

```ts
// Birthday email — sent once per year on the user's birthday by
// /api/cron/birthday-emails. Year stamp in user_profiles.last_birthday_email_year
// guarantees one email per user per year.
export async function sendBirthdayEmail(to: string, firstName: string) {
  const greeting = firstName ? firstName : "friend";
  return resend.emails.send({
    from: getFromEmail(),
    to,
    subject: "🎉 Happy birthday from Stack Ritual",
    html: `
      <!DOCTYPE html>
      <html>
      <body style="font-family: -apple-system, sans-serif; background: #fafaf9; padding: 20px;">
        <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; border: 1px solid #e7e5e4;">
          <div style="background: #065f46; padding: 24px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 20px;">🎉 Happy Birthday!</h1>
          </div>
          <div style="padding: 24px;">
            <h2 style="color: #1c1917; margin-top: 0;">Hi ${greeting},</h2>
            <p style="color: #44403c; line-height: 1.6;">Wishing you a happy birthday from everyone at Stack Ritual. Thanks for being part of the journey — here's to another year of feeling your best.</p>
            <a href="https://stackritual.com/dashboard" style="display: inline-block; background: #065f46; color: white; padding: 12px 18px; border-radius: 12px; text-decoration: none; font-weight: 600; margin-top: 12px;">
              Open the app →
            </a>
          </div>
          <div style="background: #fafaf9; padding: 16px; text-align: center; border-top: 1px solid #e7e5e4;">
            <p style="color: #a8a29e; font-size: 11px; margin: 0;">stackritual.com</p>
          </div>
        </div>
      </body>
      </html>
    `,
  });
}
```

- [ ] **Step 3: Create `src/app/api/cron/birthday-emails/route.ts`**

```ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { sendBirthdayEmail } from "@/lib/emails";
import { userLocalHour } from "@/lib/birthday";

// Hourly cron. Sends a single birthday email per user per year.
// A user receives an email when:
//   1. They have birth_month and birth_day set.
//   2. They have a timezone configured.
//   3. Their local hour right now is 8.
//   4. Their local month/day matches birth_month/birth_day.
//   5. last_birthday_email_year is null or < current calendar year.
// We update last_birthday_email_year only on a successful Resend send,
// so a Resend outage will retry the next hour.

export async function GET() {
  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ skipped: "no_resend_key" });
  }

  const now = new Date();
  const currentYear = now.getFullYear();

  // Pull all candidates: anyone with birthday + timezone + email and a
  // year stamp that's not this year yet. Filtering local-hour and
  // local-date is per-row in JS (timezone math).
  const { data: rows, error } = await supabaseAdmin
    .from("user_profiles")
    .select("user_id, email, first_name, birth_month, birth_day, timezone, last_birthday_email_year")
    .not("birth_month", "is", null)
    .not("birth_day", "is", null)
    .not("timezone", "is", null)
    .or(`last_birthday_email_year.is.null,last_birthday_email_year.lt.${currentYear}`);

  if (error) {
    console.error("[cron/birthday-emails] supabase query failed", error);
    return NextResponse.json({ error: "query_failed" }, { status: 500 });
  }

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const row of rows ?? []) {
    const tz = row.timezone as string;
    const localHour = userLocalHour(tz, now);
    if (localHour !== 8) {
      skipped++;
      continue;
    }
    // Check local month/day. Using Intl directly to avoid loading another helper.
    const fmt = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      month: "numeric",
      day: "numeric",
    });
    const parts = Object.fromEntries(
      fmt.formatToParts(now).map(p => [p.type, p.value]),
    ) as Record<string, string>;
    const localMonth = Number(parts.month);
    const localDay = Number(parts.day);
    if (localMonth !== row.birth_month || localDay !== row.birth_day) {
      skipped++;
      continue;
    }

    if (!row.email) {
      skipped++;
      continue;
    }

    try {
      await sendBirthdayEmail(row.email as string, (row.first_name as string | null) || "");
      const { error: updateErr } = await supabaseAdmin
        .from("user_profiles")
        .update({ last_birthday_email_year: currentYear })
        .eq("user_id", row.user_id);
      if (updateErr) {
        console.error("[cron/birthday-emails] year stamp update failed", row.user_id, updateErr);
      }
      sent++;
    } catch (e) {
      console.error("[cron/birthday-emails] send failed", row.user_id, e);
      failed++;
    }
  }

  console.log(`[cron/birthday-emails] hour=${now.toISOString()} sent=${sent} skipped=${skipped} failed=${failed}`);
  return NextResponse.json({ sent, skipped, failed });
}
```

> Implementer note: confirm the `user_profiles` table has `email` and `first_name` columns. If those names differ in this codebase, adjust the SELECT and the row-field references. (Check `src/lib/emails.ts` callers like `sendDailyReminderEmail` to see the convention.)

- [ ] **Step 4: Add the birthday banner to `/dashboard/page.tsx` (Today)**

In `src/app/dashboard/page.tsx`, near the top of the component body (just after `if (!user) return null;` and `const userId = user.id;`), add a profile fetch and a banner render:

```tsx
  // Birthday banner: render only on the user's birthday in their timezone.
  const { data: bdayProfile } = await supabaseAdmin
    .from("user_profiles")
    .select("birth_month, birth_day, timezone")
    .eq("user_id", userId)
    .maybeSingle();
```

And import the helper at the top of the file:

```ts
import { isUserBirthdayToday } from "@/lib/birthday";
```

In the JSX, just below the `<TopNav />` and above the existing main content `<div>`, insert:

```tsx
      {bdayProfile && isUserBirthdayToday({
        birth_month: bdayProfile.birth_month ?? null,
        birth_day: bdayProfile.birth_day ?? null,
        timezone: bdayProfile.timezone ?? null,
      }) ? (
        <div className="max-w-lg mx-auto px-4 pt-4">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            🎉 Happy birthday{firstName ? `, ${firstName}` : ""}! Wishing you a great year ahead.
          </div>
        </div>
      ) : null}
```

> Implementer note: the surrounding page wrapper structure may already include a `max-w-lg mx-auto px-4` pattern for the main content. Match the existing wrapper width so the banner aligns with the rest of the page.

- [ ] **Step 5: Add the cron entry to `vercel.json`**

Edit `vercel.json` to add a new cron entry inside the `crons` array (append before the closing `]`):

```json
    {
      "path": "/api/cron/birthday-emails",
      "schedule": "0 * * * *"
    }
```

- [ ] **Step 6: Lint + build**

Run: `npm run lint 2>&1 | grep -E "(birthday|cron/birthday|dashboard/page)" | head -20`
Expected: no new errors.

Run: `npm run build 2>&1 | tail -10`
Expected: build succeeds.

- [ ] **Step 7: Manual test in dev server**

1. **Today banner.** In Supabase, set your `birth_month` and `birth_day` to today's local month/day, ensure `timezone` is set. Visit `/dashboard` — banner appears. Set them to a different day → banner gone.

2. **Cron — local-hour gate (off-hour).** While your local time is **not** 8am:
   ```bash
   curl http://localhost:3000/api/cron/birthday-emails
   ```
   Expected response: `{"sent":0,"skipped":<n>,"failed":0}`. No email sent.

3. **Cron — full path.** Optional one-time test if your local time is 8am AND your birthday is today: clear `last_birthday_email_year` for your row. Hit the endpoint. Confirm email arrives + `last_birthday_email_year` is now `2026`. Hit again — `sent=0`.

4. **Cron — year-stamp dedupe.** Set `last_birthday_email_year=2026` for your row. Hit endpoint. Expected: `sent=0` (your row is filtered out by the SQL `or` clause).

- [ ] **Step 8: Commit**

```bash
git add src/lib/birthday.ts src/lib/emails.ts src/app/api/cron/birthday-emails/route.ts src/app/dashboard/page.tsx vercel.json
git commit -m "$(cat <<'EOF'
feat(birthday): today-page banner + hourly cron + birthday email template

When the user's birth month/day match today in their timezone, the Today
page shows a celebratory banner. A new hourly cron fires once a year per
user at their local 8am, sending a happy-birthday email via Resend.
Year stamp on user_profiles.last_birthday_email_year prevents duplicate
sends across hourly retries.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: Followups lib + API + extending /latest

**Files:**
- Create: `src/lib/analysis-followups.ts`
- Create: `src/app/api/analysis/followups/route.ts`
- Modify: `src/app/api/analysis/latest/route.ts`

- [ ] **Step 1: Create `src/lib/analysis-followups.ts`**

```ts
import Anthropic from "@anthropic-ai/sdk";
import {
  ANALYSIS_MODEL,
  FOLLOWUP_PROMPT_VERSION,
  type AnalysisUserContext,
  type Finding,
  type Recommendation,
} from "./analysis-types";

const SYSTEM_PROMPT = `You are answering a follow-up question about ONE finding from a Stack Ritual stack analysis.

The user message JSON contains:
  - "finding": the specific finding the user is asking about (title, body, optional severity, "involves" supplement names)
  - "user": optional demographic context (sex, age_band) — apply when relevant
  - "question": the user's question

CONSTRAINTS — apply strictly:

a) Stay scoped to the one finding. Don't drift into the rest of the stack or other findings.

b) Brevity. 1–3 sentences. No filler. No restating the finding back to the user.

c) Tone. Informational, not medical. Use "may", "research suggests", "consider", "evidence indicates" — not absolutes. Never say "you should". This is not a prescription.

d) Truth. Reference research mechanisms when you know them; never invent citations or paper names. If you're not confident in a claim, drop it rather than hedge it into mush.

e) No brand names. Recommend by common compound name only.

f) Demographic awareness. If user.sex or user.age_band is present, weight the answer to that demographic where research supports it.

g) Output channel. Return ONLY the answer prose. No JSON, no preamble, no "Sure!", no "Great question."`;

export type FollowupRunOutput = {
  answer: string;
  inputTokens: number;
  outputTokens: number;
  cachedInputTokens: number;
  durationMs: number;
  model: string;
  promptVersion: number;
};

export async function runFollowup(
  finding: Finding | Omit<Recommendation, "catalog_match">,
  user: AnalysisUserContext | null,
  question: string,
): Promise<FollowupRunOutput> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY not configured");
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const startedAt = Date.now();

  const includeUser =
    user !== null && (user.sex !== null || user.age_band !== null);

  const userMessage = JSON.stringify({
    finding,
    ...(includeUser ? { user: { sex: user!.sex, age_band: user!.age_band } } : {}),
    question,
  });

  const response = await anthropic.messages.create({
    model: ANALYSIS_MODEL,
    max_tokens: 1024,
    system: [
      {
        type: "text",
        text: SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: userMessage }],
  });

  const durationMs = Date.now() - startedAt;
  const usage = response.usage as {
    input_tokens: number;
    output_tokens: number;
    cache_read_input_tokens?: number;
    cache_creation_input_tokens?: number;
  };
  console.log(
    `[followup] ${ANALYSIS_MODEL} stop=${response.stop_reason} ` +
      `dur=${durationMs}ms in=${usage.input_tokens} out=${usage.output_tokens} ` +
      `cache_read=${usage.cache_read_input_tokens ?? 0}`,
  );

  const textBlock = response.content.find(b => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Model returned no text block");
  }

  return {
    answer: textBlock.text.trim(),
    inputTokens: usage.input_tokens,
    outputTokens: usage.output_tokens,
    cachedInputTokens: usage.cache_read_input_tokens ?? 0,
    durationMs,
    model: ANALYSIS_MODEL,
    promptVersion: FOLLOWUP_PROMPT_VERSION,
  };
}
```

- [ ] **Step 2: Create `src/app/api/analysis/followups/route.ts`**

```ts
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { birthYearToAgeBand } from "@/lib/age-band";
import { runFollowup } from "@/lib/analysis-followups";
import {
  FOLLOWUPS_PER_ANALYSIS_CAP,
  type AnalysisSections,
  type AnalysisUserContext,
} from "@/lib/analysis-types";

type Body = {
  analysis_id?: string;
  section?: keyof AnalysisSections;
  finding_index?: number;
  question?: string;
};

const VALID_SECTIONS = new Set<keyof AnalysisSections>([
  "synergies",
  "interactions",
  "timing",
  "redundancies",
  "recommendations",
]);

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as Body;
  const analysisId = body.analysis_id;
  const section = body.section;
  const findingIndex = body.finding_index;
  const question = (body.question ?? "").trim();

  if (!analysisId || typeof analysisId !== "string") {
    return NextResponse.json({ error: "analysis_id required" }, { status: 400 });
  }
  if (!section || !VALID_SECTIONS.has(section)) {
    return NextResponse.json({ error: "section invalid" }, { status: 400 });
  }
  if (typeof findingIndex !== "number" || !Number.isInteger(findingIndex) || findingIndex < 0) {
    return NextResponse.json({ error: "finding_index invalid" }, { status: 400 });
  }
  if (!question) {
    return NextResponse.json({ error: "question required" }, { status: 400 });
  }
  if (question.length > 500) {
    return NextResponse.json({ error: "question too long" }, { status: 400 });
  }

  // Plan gate — Pro only
  const { data: sub } = await supabaseAdmin
    .from("subscriptions")
    .select("plan, status")
    .eq("user_id", userId)
    .single();
  const isPro = sub?.plan === "pro" && sub?.status === "active";
  if (!isPro) {
    return NextResponse.json({ error: "plan_required", plan: "pro" }, { status: 403 });
  }

  // Ownership + finding existence
  const { data: analysisRow } = await supabaseAdmin
    .from("stack_analyses")
    .select("id, user_id, analysis")
    .eq("id", analysisId)
    .maybeSingle();
  if (!analysisRow || analysisRow.user_id !== userId) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const sections = analysisRow.analysis as AnalysisSections;
  const findingArr = sections[section];
  if (!Array.isArray(findingArr) || findingIndex >= findingArr.length) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const finding = findingArr[findingIndex];

  // Cap gate
  const { count: existingCount } = await supabaseAdmin
    .from("analysis_followups")
    .select("id", { count: "exact", head: true })
    .eq("analysis_id", analysisId);
  if ((existingCount ?? 0) >= FOLLOWUPS_PER_ANALYSIS_CAP) {
    return NextResponse.json(
      { error: "cap_reached", used: existingCount, cap: FOLLOWUPS_PER_ANALYSIS_CAP },
      { status: 409 },
    );
  }

  // Demographics for the model
  const { data: profile } = await supabaseAdmin
    .from("user_profiles")
    .select("sex, birth_year")
    .eq("user_id", userId)
    .maybeSingle();
  const userContext: AnalysisUserContext = {
    sex: (profile?.sex as "male" | "female" | null) ?? null,
    age_band: birthYearToAgeBand(profile?.birth_year ?? null),
  };

  // Call the model
  let result;
  try {
    result = await runFollowup(finding, userContext, question);
  } catch (e) {
    const detail = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
    console.error("[analysis/followups] LLM call failed —", detail, e);
    return NextResponse.json(
      {
        error: "followup_failed",
        detail: process.env.NODE_ENV === "production" ? undefined : detail,
      },
      { status: 500 },
    );
  }

  // Persist
  const { data: inserted, error: insertError } = await supabaseAdmin
    .from("analysis_followups")
    .insert({
      analysis_id: analysisId,
      user_id: userId,
      section,
      finding_index: findingIndex,
      question,
      answer: result.answer,
      model: result.model,
      prompt_version: result.promptVersion,
      input_tokens: result.inputTokens,
      output_tokens: result.outputTokens,
      cached_input_tokens: result.cachedInputTokens,
      duration_ms: result.durationMs,
    })
    .select("id, question, answer, created_at, section, finding_index")
    .single();

  if (insertError || !inserted) {
    console.error("persist followup failed", insertError);
    return NextResponse.json({ error: "followup_failed" }, { status: 500 });
  }

  return NextResponse.json(inserted);
}

// Long-running model call — match the analysis route ceiling.
export const maxDuration = 60;
```

- [ ] **Step 3: Update `/api/analysis/latest/route.ts` to return followups**

In `src/app/api/analysis/latest/route.ts`:

a) Below the `// Latest analysis row` block (which sets `latest`), add a parallel fetch for followups:

```ts
  // Followups for the latest analysis (if any)
  const { data: followupRows } = latest
    ? await supabaseAdmin
        .from("analysis_followups")
        .select("id, section, finding_index, question, answer, created_at")
        .eq("analysis_id", latest.id)
        .order("created_at", { ascending: true })
    : { data: [] as Array<{ id: string; section: string; finding_index: number; question: string; answer: string; created_at: string }> };
```

b) Update the `body` object — add the `followups` field:

```ts
  const body: LatestAnalysisResponse = {
    analysis: latest
      ? {
          id: latest.id,
          created_at: latest.created_at,
          trigger: latest.trigger,
          stack_item_count: latest.stack_item_count,
          analysis: latest.analysis,
        }
      : null,
    stack_changed_since: latest
      ? changesSummaryHasChanges(changes)
      : false,
    changes_summary: changes,
    followups: (followupRows ?? []) as LatestAnalysisResponse["followups"],
    disclaimer: {
      accepted: disclaimerAccepted,
      version: disclaimerVersion,
      current_version: CURRENT_DISCLAIMER_VERSION,
    },
  };
```

- [ ] **Step 4: Lint + build**

Run: `npm run lint 2>&1 | grep -E "(analysis-followups|api/analysis/followups|api/analysis/latest)" | head -20`
Expected: no new errors.

Run: `npm run build 2>&1 | tail -10`
Expected: build succeeds.

- [ ] **Step 5: Manual test (curl-only — UI lands in Task 8)**

With dev server running, in a Pro account that has at least one analysis:

1. **Pro path:**
   ```bash
   curl -X POST http://localhost:3000/api/analysis/followups \
     -H "Content-Type: application/json" \
     -H "Cookie: $(your dev cookie)" \
     -d '{"analysis_id":"<your latest analysis id>","section":"synergies","finding_index":0,"question":"Why does this matter for me?"}'
   ```
   Expected: 200 with `{ id, question, answer, created_at, section, finding_index }`.

2. **Plus path:** temporarily set your subscription `plan='plus'` in Supabase. Repeat the curl. Expected: 403 `plan_required`.

3. **Cap:** loop the Pro request 21 times against the same analysis_id. Expected: first 20 succeed, 21st returns 409 `cap_reached`.

4. **Latest endpoint:** GET `/api/analysis/latest`. Expected: response body includes `followups` array with your saved Q&As.

- [ ] **Step 6: Commit**

```bash
git add src/lib/analysis-followups.ts src/app/api/analysis/followups/route.ts src/app/api/analysis/latest/route.ts
git commit -m "$(cat <<'EOF'
feat(analysis): pro-only per-finding followup endpoint

New /api/analysis/followups POST gates on plan='pro', validates ownership
and finding existence, enforces a 20-per-analysis cap, calls the model
with a focused single-finding prompt (no tool_use, plain prose), and
persists telemetry. /api/analysis/latest now returns the followups array
for the latest analysis so the UI can render Q&A history in one fetch.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 8: Followups UI in finding/recommendation cards + analysis page wiring

**Files:**
- Modify: `src/components/AnalysisFindingCard.tsx`
- Modify: `src/components/AnalysisRecommendationCard.tsx`
- Modify: `src/app/dashboard/analysis/page.tsx`

- [ ] **Step 1: Replace `AnalysisFindingCard.tsx` with followup-aware version**

Replace the entire contents of `src/components/AnalysisFindingCard.tsx` with:

```tsx
"use client";

import { useState } from "react";
import type { Finding, Followup } from "@/lib/analysis-types";

const SEVERITY_STYLES = {
  info: "border-stone-200 bg-white",
  caution: "border-amber-200 bg-amber-50",
  warning: "border-red-200 bg-red-50",
} as const;

const SEVERITY_LABEL = {
  info: "Info",
  caution: "Caution",
  warning: "Warning",
} as const;

type Props = {
  finding: Finding;
  /** Section + index identify this finding for follow-up persistence. */
  section: "synergies" | "interactions" | "timing" | "redundancies";
  findingIndex: number;
  analysisId: string | null;
  followups: Followup[];
  /** Pro tier required for follow-ups. */
  isPro: boolean;
  /** Free/Plus see locked state. */
  planLocked: boolean;
  /** Hits 20 across all findings on this analysis. */
  capReached: boolean;
  /** Disable input while a re-analyze is in flight. */
  reanalyzing: boolean;
  /** Called after a successful follow-up so the page can re-fetch /latest. */
  onFollowupCreated: () => void;
};

export default function AnalysisFindingCard({
  finding,
  section,
  findingIndex,
  analysisId,
  followups,
  isPro,
  planLocked,
  capReached,
  reanalyzing,
  onFollowupCreated,
}: Props) {
  const sev = finding.severity ?? "info";
  const [expanded, setExpanded] = useState(false);
  const [question, setQuestion] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAsk() {
    if (!analysisId || submitting || !question.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/analysis/followups", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          analysis_id: analysisId,
          section,
          finding_index: findingIndex,
          question: question.trim(),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      setQuestion("");
      setExpanded(false);
      onFollowupCreated();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to ask");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={`mb-3 rounded-xl border p-4 ${SEVERITY_STYLES[sev]}`}>
      <div className="flex items-start justify-between gap-3">
        <h4 className="text-sm font-semibold text-stone-900">{finding.title}</h4>
        {finding.severity ? (
          <span className="rounded-full bg-white/70 px-2 py-0.5 text-xs font-medium text-stone-700">
            {SEVERITY_LABEL[sev]}
          </span>
        ) : null}
      </div>
      <p className="mt-2 text-sm text-stone-700">{finding.body}</p>
      {finding.involves.length > 0 ? (
        <p className="mt-2 text-xs text-stone-500">
          Involves: {finding.involves.join(", ")}
        </p>
      ) : null}

      {/* Followups */}
      {followups.length > 0 ? (
        <div className="mt-4 space-y-3 border-t border-stone-200 pt-3">
          {followups.map(f => (
            <div key={f.id}>
              <p className="text-xs text-stone-500 italic">Q: {f.question}</p>
              <p className="mt-1 text-sm text-stone-700">{f.answer}</p>
            </div>
          ))}
        </div>
      ) : null}

      {/* Ask UI */}
      <div className="mt-3 border-t border-stone-200 pt-3">
        {planLocked ? (
          <a href="/dashboard/profile" className="text-xs text-stone-500 hover:underline">
            🔒 Ask follow-ups — Pro feature
          </a>
        ) : !isPro ? null : capReached ? (
          <p className="text-xs text-stone-500">Follow-up cap reached for this analysis.</p>
        ) : !expanded ? (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            disabled={reanalyzing}
            className="text-xs text-emerald-700 hover:underline disabled:text-stone-400"
          >
            Ask a follow-up →
          </button>
        ) : (
          <div>
            <textarea
              value={question}
              onChange={e => setQuestion(e.target.value.slice(0, 500))}
              placeholder="What do you want to know about this finding?"
              rows={2}
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
              disabled={submitting || reanalyzing}
            />
            <div className="mt-1 flex items-center justify-between gap-2">
              <span className="text-xs text-stone-400">{question.length}/500</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setExpanded(false);
                    setQuestion("");
                    setError(null);
                  }}
                  className="rounded-lg px-3 py-1.5 text-xs text-stone-700 hover:bg-stone-100"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAsk}
                  disabled={submitting || !question.trim() || reanalyzing}
                  className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-medium text-white disabled:bg-stone-300"
                >
                  {submitting ? "Asking..." : "Ask"}
                </button>
              </div>
            </div>
            {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Replace `AnalysisRecommendationCard.tsx` with followup-aware version**

Replace the entire contents of `src/components/AnalysisRecommendationCard.tsx` with:

```tsx
"use client";

import Link from "next/link";
import { useState } from "react";
import type { Followup, Recommendation } from "@/lib/analysis-types";

type Props = {
  rec: Recommendation;
  findingIndex: number;
  analysisId: string | null;
  followups: Followup[];
  isPro: boolean;
  planLocked: boolean;
  capReached: boolean;
  reanalyzing: boolean;
  onFollowupCreated: () => void;
};

export default function AnalysisRecommendationCard({
  rec,
  findingIndex,
  analysisId,
  followups,
  isPro,
  planLocked,
  capReached,
  reanalyzing,
  onFollowupCreated,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const [question, setQuestion] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAsk() {
    if (!analysisId || submitting || !question.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/analysis/followups", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          analysis_id: analysisId,
          section: "recommendations",
          finding_index: findingIndex,
          question: question.trim(),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      setQuestion("");
      setExpanded(false);
      onFollowupCreated();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to ask");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mb-3 rounded-xl border border-stone-200 bg-white p-4">
      <h4 className="text-sm font-semibold text-stone-900">{rec.name}</h4>
      <p className="mt-2 text-sm text-stone-700">{rec.body}</p>

      <div className="mt-3">
        <Link
          href={`/dashboard/search?q=${encodeURIComponent(rec.name)}`}
          className="inline-block rounded-lg bg-emerald-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-800"
        >
          Look up in Research →
        </Link>
      </div>

      {/* Followups */}
      {followups.length > 0 ? (
        <div className="mt-4 space-y-3 border-t border-stone-200 pt-3">
          {followups.map(f => (
            <div key={f.id}>
              <p className="text-xs text-stone-500 italic">Q: {f.question}</p>
              <p className="mt-1 text-sm text-stone-700">{f.answer}</p>
            </div>
          ))}
        </div>
      ) : null}

      {/* Ask UI */}
      <div className="mt-3 border-t border-stone-200 pt-3">
        {planLocked ? (
          <a href="/dashboard/profile" className="text-xs text-stone-500 hover:underline">
            🔒 Ask follow-ups — Pro feature
          </a>
        ) : !isPro ? null : capReached ? (
          <p className="text-xs text-stone-500">Follow-up cap reached for this analysis.</p>
        ) : !expanded ? (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            disabled={reanalyzing}
            className="text-xs text-emerald-700 hover:underline disabled:text-stone-400"
          >
            Ask a follow-up →
          </button>
        ) : (
          <div>
            <textarea
              value={question}
              onChange={e => setQuestion(e.target.value.slice(0, 500))}
              placeholder="What do you want to know about this recommendation?"
              rows={2}
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
              disabled={submitting || reanalyzing}
            />
            <div className="mt-1 flex items-center justify-between gap-2">
              <span className="text-xs text-stone-400">{question.length}/500</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setExpanded(false);
                    setQuestion("");
                    setError(null);
                  }}
                  className="rounded-lg px-3 py-1.5 text-xs text-stone-700 hover:bg-stone-100"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAsk}
                  disabled={submitting || !question.trim() || reanalyzing}
                  className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-medium text-white disabled:bg-stone-300"
                >
                  {submitting ? "Asking..." : "Ask"}
                </button>
              </div>
            </div>
            {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Wire up the analysis page**

In `src/app/dashboard/analysis/page.tsx`:

a) Add a fetch for the user's plan. Near the top of the component, declare:

```tsx
  const [plan, setPlan] = useState<"free" | "plus" | "pro" | null>(null);
```

In the `load` callback, after `setLatest(data)`, add a sibling fetch for plan:

```tsx
      try {
        const planRes = await fetch("/api/me/plan", { credentials: "include" });
        if (planRes.ok) {
          const j = await planRes.json() as { plan: "free" | "plus" | "pro" };
          setPlan(j.plan);
        }
      } catch {
        // best-effort
      }
```

> Implementer note: this requires a tiny helper endpoint `/api/me/plan` returning `{ plan }`. Add it as part of this step (see step 4).

b) Compute followup-related props. After `const a = latest?.analysis ?? null;`:

```tsx
  const followups = latest?.followups ?? [];
  const followupCount = followups.length;
  const capReached = followupCount >= 20;
  const isPro = plan === "pro";
  const planLocked = plan !== "pro";

  function followupsFor(section: "synergies" | "interactions" | "timing" | "redundancies" | "recommendations", idx: number) {
    return followups.filter(f => f.section === section && f.finding_index === idx);
  }
```

c) Where the page currently renders the section bodies, replace each `.map` block with the new prop set. Example for the synergies section — the existing code:

```tsx
            {a.analysis.synergies.map((f, i) => (
              <AnalysisFindingCard key={i} finding={f} />
            ))}
```

becomes:

```tsx
            {a.analysis.synergies.map((f, i) => (
              <AnalysisFindingCard
                key={i}
                finding={f}
                section="synergies"
                findingIndex={i}
                analysisId={a.id}
                followups={followupsFor("synergies", i)}
                isPro={isPro}
                planLocked={planLocked}
                capReached={capReached}
                reanalyzing={running}
                onFollowupCreated={load}
              />
            ))}
```

Repeat the same shape for `interactions`, `timing`, `redundancies` (with the matching `section` literal).

For recommendations — the existing code:

```tsx
            {a.analysis.recommendations.map((rec, i) => (
              <AnalysisRecommendationCard key={i} rec={rec} />
            ))}
```

becomes:

```tsx
            {a.analysis.recommendations.map((rec, i) => (
              <AnalysisRecommendationCard
                key={i}
                rec={rec}
                findingIndex={i}
                analysisId={a.id}
                followups={followupsFor("recommendations", i)}
                isPro={isPro}
                planLocked={planLocked}
                capReached={capReached}
                reanalyzing={running}
                onFollowupCreated={load}
              />
            ))}
```

d) Add a follow-up usage indicator in the page header. Just above the disclaimer banner block (the `<div className="mt-6 rounded-xl border border-stone-200 bg-white p-4 text-xs text-stone-600">`), add:

```tsx
      {a && isPro ? (
        <p className="mt-3 text-xs text-stone-500">
          {followupCount}/20 follow-ups used on this analysis.
        </p>
      ) : null}
```

- [ ] **Step 4: Create `/api/me/plan/route.ts`**

```ts
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { data } = await supabaseAdmin
    .from("subscriptions")
    .select("plan, status")
    .eq("user_id", userId)
    .maybeSingle();
  const isActive = data?.status === "active";
  const plan: "free" | "plus" | "pro" =
    isActive && (data?.plan === "plus" || data?.plan === "pro")
      ? data.plan
      : "free";
  return NextResponse.json({ plan });
}
```

- [ ] **Step 5: Lint + build**

Run: `npm run lint 2>&1 | grep -E "(AnalysisFindingCard|AnalysisRecommendationCard|dashboard/analysis|api/me/plan)" | head -30`
Expected: no new errors.

Run: `npm run build 2>&1 | tail -10`
Expected: build succeeds.

- [ ] **Step 6: Manual test in dev server**

In a Pro account with at least one analysis:

1. Visit `/dashboard/analysis`. Below each finding/recommendation, the "Ask a follow-up →" link is visible.
2. Click it on a synergy. Type a question, click Ask. Within ~5s, the answer appears under the question. Counter at top reads "1/20 follow-ups used on this analysis."
3. Refresh. The Q&A persists.
4. Edit your stack and re-analyze. The new analysis page shows 0/20 — old Q&As are not visible (they're attached to the old analysis row).

In a Plus account:

5. The "🔒 Ask follow-ups — Pro feature" link appears in place of the input. Clicking sends to /dashboard/profile.

In a Free account:

6. Same locked state as Plus (plan check is `pro` only).

- [ ] **Step 7: Commit**

```bash
git add src/components/AnalysisFindingCard.tsx src/components/AnalysisRecommendationCard.tsx src/app/dashboard/analysis/page.tsx src/app/api/me/plan/route.ts
git commit -m "$(cat <<'EOF'
feat(analysis): per-finding follow-up panel on analysis page (pro feature)

Each finding and recommendation card now has an inline 'Ask a follow-up'
panel for Pro users. Free/Plus users see a locked state. Existing Q&A
pairs render above the input. Cap counter at the page header tracks
usage against the 20-per-analysis limit. The panel is disabled while a
re-analyze is in flight.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 9: Final QA pass

**Files:** none modified — this is verification only.

- [ ] **Step 1: Build + lint sweep**

Run:

```bash
npm run lint 2>&1 | tail -20
npm run build 2>&1 | tail -20
```

Expected: lint shows no NEW errors compared to a fresh `git stash && npm run lint && git stash pop` baseline. Build succeeds.

- [ ] **Step 2: QA matrix**

In `npm run dev`, walk through each row. Mark only when verified.

- [ ] Re-analyze button hidden when stack unchanged on `/dashboard/analysis` and `/dashboard/stack` card.
- [ ] Re-analyze button visible after editing stack; "X items changed" line accurate.
- [ ] `curl POST /api/analysis/run` with unchanged stack returns `409 nothing_to_analyze`.
- [ ] First-run modal shows demographics inputs; skipping all fields still allows Continue.
- [ ] Sex + birthday from the modal land in `user_profiles`.
- [ ] Profile "Personal" section loads current values, saves successfully, clears successfully.
- [ ] Analysis run with sex='female', birth_year=1985 succeeds; output shows demographic-aware framing on at least one finding.
- [ ] Analysis run with all demographics null succeeds and produces generic output.
- [ ] Existing-user banner appears for users with no demographics; dismissal persists in localStorage.
- [ ] Today-page banner appears when birth_month/day match current local date; hidden otherwise.
- [ ] `curl GET /api/cron/birthday-emails` returns sane counts. (Don't expect a real send unless conditions are met.)
- [ ] Pro user sees "Ask a follow-up →" on every finding/recommendation card.
- [ ] Submitting a follow-up question shows the answer within ~10s; counter increments.
- [ ] 20th follow-up succeeds; 21st returns `409 cap_reached` (test via curl).
- [ ] Plus user sees "🔒 Ask follow-ups — Pro feature" link instead of input.
- [ ] Free user sees the same locked state.
- [ ] After re-analyze, the new analysis starts fresh at 0/20 follow-ups; old followups stay in DB attached to old `analysis_id`.

- [ ] **Step 3: Push only after the user signs off**

When all matrix items are checked AND the user gives explicit go-ahead:

```bash
git push origin main
```

Per the user's earlier "test in local before pushing" instruction, this push happens ONLY after manual QA passes and the user confirms.
