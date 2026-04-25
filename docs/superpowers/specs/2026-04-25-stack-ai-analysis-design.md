# AI Stack Analysis

**Date:** 2026-04-25
**Status:** Approved (design)

## Summary

Add an AI-powered analysis feature for Plus and Pro users that reads the user's current supplement stack and produces a structured breakdown across five sections: synergies, interactions, timing optimization, redundancies, and recommended additions. Analysis runs on demand from a CTA on `/dashboard/stack` and renders on a new `/dashboard/analysis` page. Results are persisted; the UI shows when the stack has changed since the last run and offers a free re-analysis in that case. Manual re-runs (when the stack hasn't changed) are capped at 3 per day per user. A first-run safety modal records server-side disclaimer acceptance before any analysis can run.

## Tier gating

- **Free:** entry-point card on `/dashboard/stack` shows a locked state with an upgrade prompt. The API rejects with `403 plan_required, plan: 'plus'` (matching the existing `/api/supplements/scan` pattern).
- **Plus and Pro:** full access. This feature finally fulfills the existing Plus-tier "interactions checker" promise.

## Trigger model

- **On-demand button** with smart cache.
- After the first analysis, the results page persists. The Stack page CTA shows last-analyzed date and, if applicable, "N items changed since last analysis."
- **The initial run** (no prior `stack_analyses` row for the user) is always allowed.
- **Stack-changed re-runs are free** (don't count against the daily cap).
- **Manual re-runs (stack unchanged)** are capped at **3 per day per user**.

The `trigger` column on each `stack_analyses` row is set as follows:
- No prior row for user → `'initial'`
- Current `user_stacks` differs from latest `stack_snapshot` → `'stack_changed'`
- Otherwise → `'manual_rerun'` (and gated by the daily cap)

## Input data (v1)

Stack only — name, dose, timing, frequency, brand, notes — for items where `is_active = true AND is_paused = false`. Paused items are surfaced in the analysis page header ("Analyzing 8 active items. 2 paused items not included.") but not sent to the model.

Mood correlation, community experiences, goals, and DNA testing results are out of scope for v1 — see Future work.

## Output sections (v1)

1. **Synergies** — pairs/groups in the stack that work well together.
2. **Interactions** — items that reduce each other's effectiveness, compete for absorption, or shouldn't be co-administered. Each finding has a severity (`info` | `caution` | `warning`).
3. **Timing** — concrete suggestions to move items to a different time of day for better effect.
4. **Redundancies** — multiple items targeting the same mechanism.
5. **Recommendations** — additions worth considering, with hybrid grounding (see below).

Empty sections still render with a "no [X] flagged" placeholder.

## Recommendations grounding (hybrid)

The model produces recommendations freely by name. Server-side post-processing matches each recommendation against the `supplements` catalog with this priority:

1. Exact case-insensitive match on `name` or `slug` → use it.
2. Otherwise, longest substring match against `name` (case-insensitive) → use it.
3. Otherwise, no match.

- **Match** → result includes `catalog_match: { supplement_id, slug }`. UI shows an "Add to stack" CTA.
- **No match** → `catalog_match: null`. UI shows a "Search to add" CTA, which routes into the existing user-submitted-supplements flow.

## Safety / medical-advice posture

- **System prompt** instructs the model to hedge (use "may," "research suggests," "consider"), reference mechanisms when known, never invent citations, and never recommend brands.
- **UI** shows a single clean disclaimer banner at the top of `/dashboard/analysis` ("Informational only. Talk to your doctor before changing what you take.") rather than per-item legalese.
- **First-run modal** with a required "I understand" checkbox before the first analysis can run. Acceptance is **recorded server-side** with a timestamp and version number (see Schema).
- The disclaimer gate is enforced on `POST /api/analysis/run`. Even if the modal were bypassed client-side, the API rejects with `403 disclaimer_required`.

## Architecture

```
/dashboard/stack
   └─ "Analyze my stack" CTA card
         (variants: free / never-run / fresh / stale / rate-limited)
         │
         ▼
/dashboard/analysis
   ├─ First-run safety modal (if disclaimer not accepted)
   ├─ Header: stack count + last analyzed + Re-analyze button
   ├─ Disclaimer banner
   └─ Five collapsible sections, in this order:
        Synergies · Interactions · Timing · Redundancies · Recommendations

POST /api/analysis/run
   1. auth() → require Clerk userId
   2. Plan check: subscriptions.plan ∈ {plus, pro}, status='active'
   3. Disclaimer gate: user_profiles.analysis_disclaimer_version >= current
   4. Empty-stack guard: at least one active, non-paused item
   5. Rate-limit check: stack-changed → free; else <3 manual_rerun rows today
   6. Build prompt (cached system block) + user message from stack
   7. Call Anthropic claude-sonnet-4-6 with tool_use forcing JSON shape
   8. Parse tool_use.input → analysis
   9. Ground recommendations against `supplements` catalog
  10. Insert into `stack_analyses` (with stack snapshot, token usage, trigger)
  11. Return analysis JSON

GET /api/analysis/latest
   - Loads most-recent stack_analyses row for user
   - Diffs stack_snapshot vs current user_stacks → changes_summary
       added    = items in user_stacks not in snapshot (by supplement_id+name)
       removed  = items in snapshot not in user_stacks
       modified = same item, different dose / timing / frequency / brand
   - stack_changed_since = (added + removed + modified) > 0
   - Returns analysis + stack_changed_since + rate_limit usage today

POST /api/analysis/disclaimer/accept
   - Body: { version: number }
   - Sets user_profiles.analysis_disclaimer_accepted_at = now()
   - Sets user_profiles.analysis_disclaimer_version = body.version
```

## Database schema

Two manual SQL migrations to run in Supabase, in order.

### 1. `database-stack-analyses.sql`

```sql
create table if not exists stack_analyses (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  created_at timestamptz not null default now(),

  -- input snapshot (used to compute "X items changed since")
  stack_snapshot jsonb not null,
  stack_item_count int not null,

  -- model output (post-grounded)
  analysis jsonb not null,
  model text not null,
  prompt_version int not null default 1,

  -- per-run audit of disclaimer state at time of run
  disclaimer_version_at_run int not null,

  -- observability / cost
  input_tokens int,
  output_tokens int,
  cached_input_tokens int,
  duration_ms int,

  -- run classification (drives rate limiter)
  trigger text not null check (trigger in ('initial','stack_changed','manual_rerun'))
);

create index stack_analyses_user_created_idx
  on stack_analyses (user_id, created_at desc);

alter table stack_analyses enable row level security;

create policy "users read own analyses"
  on stack_analyses for select
  using (auth.jwt() ->> 'sub' = user_id);
-- writes are server-only via supabaseAdmin; no insert policy
```

### 2. `database-analysis-disclaimer.sql`

```sql
alter table user_profiles
  add column if not exists analysis_disclaimer_accepted_at timestamptz,
  add column if not exists analysis_disclaimer_version int;
```

`current_version` starts at `1` in code (`src/lib/analysis.ts`). When the disclaimer wording materially changes, bump the constant; users with a lower stored version get re-prompted.

## API contracts

### `POST /api/analysis/run`

Request: no body.

Response 200:
```ts
{
  id: string,
  created_at: string,
  trigger: 'initial' | 'stack_changed' | 'manual_rerun',
  stack_item_count: number,
  analysis: {
    synergies:        Finding[],
    interactions:     Finding[],   // each has severity
    timing:           Finding[],
    redundancies:     Finding[],
    recommendations:  Recommendation[]
  }
}
```

Error responses:
- `403 plan_required` `{ plan: 'plus' }` — free user
- `403 disclaimer_required` `{ current_version: 1 }`
- `409 empty_stack`
- `429 rate_limited` `{ retry_after: ISO-string }`
- `500 analysis_failed`

(Both 403 codes share the status; the JSON `error` field discriminates.)

Types:
```ts
type Finding = {
  title: string,
  body: string,
  severity?: 'info' | 'caution' | 'warning',  // interactions only
  involves: string[]   // supplement names from the user's stack
}

type Recommendation = {
  name: string,
  body: string,
  catalog_match: { supplement_id: string, slug: string } | null
}
```

### `GET /api/analysis/latest`

Response 200:
```ts
{
  analysis: { ...same shape as /run response... } | null,
  stack_changed_since: boolean,
  changes_summary: { added: number, removed: number, modified: number },
  rate_limit: { manual_runs_used_today: number, daily_cap: 3 },
  disclaimer: { accepted: boolean, version: number | null, current_version: 1 }
}
```

### `POST /api/analysis/disclaimer/accept`

Request body: `{ version: number }`
Response 200: `{ ok: true, accepted_at: ISO-string }`

## LLM call

- **Model:** `claude-sonnet-4-6` (same as the existing label scanner).
- **Prompt caching:** system prompt + JSON schema use `cache_control: ephemeral`. Same cache key across all users for high hit rate.
- **Structured output:** single tool `submit_stack_analysis` whose schema mirrors the response `analysis` shape. Forces well-formed JSON without prose wrapping.
- **`prompt_version`** stored on every `stack_analyses` row. Bump when the prompt or schema materially changes.

### System prompt (sketch — final wording during implementation)

```
You are a supplement-stack analyst. The user will give you a JSON list of
supplements they currently take, with doses, timing, and frequency.

Produce a structured analysis with five sections:
  1. synergies        — pairs/groups in their stack that work well together
  2. interactions     — items that reduce each other's effectiveness, compete
                        for absorption, or shouldn't be co-administered
  3. timing           — concrete suggestions to move items to a different
                        time of day for better effect
  4. redundancies     — multiple items targeting the same mechanism
  5. recommendations  — additions worth considering, given gaps in the stack

CONSTRAINTS:
- Reference research mechanisms when known; never invent citations.
- Frame all guidance as informational, not medical. Use "may", "research
  suggests", "consider", not absolutes.
- Recommend supplement categories or commonly-known compound names, not
  brands.
- If the stack is empty or has only one item, return mostly-empty arrays
  and a note in `recommendations` only.
- Output MUST conform to the submit_stack_analysis tool schema.
```

## UI

### Stack page entry-point card

Top of `/dashboard/stack`, above the supplement list. State variants:

- **Free user** — locked state: "Stack analysis is a Plus feature." with `[Upgrade]` CTA.
- **Plus/Pro, never run** — single CTA: "Analyze my stack — Get an AI breakdown of synergies, interactions, and recommendations."
- **Plus/Pro, fresh (stack unchanged since last run)** — "Last analyzed [relative date]. View results."
- **Plus/Pro, stale (stack changed since last run)** — "Last analyzed [relative date]. **N items changed since.** Re-analyze."
- **Plus/Pro, rate-limited** — "You've used today's re-runs. Stack changes refresh free, or come back tomorrow."

### Analysis page

`/dashboard/analysis`:

- Back link to Stack.
- Header: "Stack Analysis" + "Based on N supplements · Analyzed [date]" + `[ Re-analyze ]`.
- If paused items exist: small subtext "M paused items not included."
- Disclaimer banner.
- Five collapsible sections in fixed order. Each section header always renders, even with zero findings.
- Recommendation rows show either `[ Add to stack ]` (when `catalog_match` populated) or `[ Search to add ]` (when null, routes into the existing search/submit flow).
- Loading state during a re-run: skeleton with section headers and shimmering rows. Don't block the rest of the page.
- Error state: "Couldn't run analysis right now. Try again in a moment." with retry button. Failures don't decrement the daily cap.

### First-run safety modal

Shown the first time the user visits `/dashboard/analysis` if `analysis_disclaimer_version < current_version` on their `user_profiles` row.

- Body: "This analysis is informational, not medical advice. Talk to your doctor before adding, removing, or changing any supplement."
- Required `[ ] I understand` checkbox.
- `[Cancel]` (closes modal, no analysis runs) and `[Continue]` (disabled until checkbox ticked).
- On Continue: `POST /api/analysis/disclaimer/accept` with the current version, then proceed.

## Edge cases

- **Free user hits API directly** → 402.
- **Empty stack** (zero active, non-paused items) → 409. Stack page card shows "Add supplements first" instead of the analyze CTA. The Analysis page shouldn't be reachable in this state, but the API still defends.
- **Single-item stack** → allowed. LLM returns mostly-empty arrays + a `recommendations` block. UI renders empty-section placeholders.
- **Paused/inactive items** → excluded from the prompt; surfaced in the page header.
- **User-submitted-supplement entries** (pending or approved) → included in the prompt by name. No slug, no catalog match for the entry itself.
- **Custom-name freehand entries** → treated like user-submitted; LLM gets name + dose + timing.
- **Manual cap hit** → 429 with `retry_after`. Card shows the rate-limit message. Stack-changed re-runs ignore the cap.
- **Anthropic API error / timeout** → 500 `analysis_failed`. Logged. Doesn't decrement the cap.
- **Malformed tool_use response** → same 500 path. Tool-use makes this unlikely.
- **Stack changes between page load and "Re-analyze" click** → fine. The API always reads `user_stacks` fresh. Displayed "X items changed" hint may be slightly stale; not a real problem.
- **Modal dismissed without ticking** → analysis doesn't run; modal reappears on next visit. Acceptance is sticky once recorded.

## Build sequence

Each step leaves the app in a working, reviewable state.

1. **DB migrations** — write `database-stack-analyses.sql` and `database-analysis-disclaimer.sql`. User runs them manually in Supabase, in order. App doesn't depend on them yet.
2. **`src/lib/analysis.ts`** — pure server module: build prompt, call Anthropic with prompt caching + tool_use, parse, ground recommendations against catalog. Single function, no HTTP layer.
3. **`POST /api/analysis/run` + `GET /api/analysis/latest`** — wire `lib/analysis.ts` behind Clerk auth, plan check, disclaimer gate, rate limiter, persistence.
4. **`POST /api/analysis/disclaimer/accept`** — small, isolated endpoint.
5. **`/dashboard/analysis` page + first-run modal** — fetches `/latest`, renders results, handles `403 disclaimer_required`, calls `/run` on user click. Includes loading skeleton and error states.
6. **Stack-page entry-point card** — all state variants on `/dashboard/stack`.
7. **Polish + manual QA** — empty stack, paused items, free-user redirect, rate-limit retry messaging, mobile layout. End-to-end as a Plus user and a Pro user.

## Cost

Per-call estimate at Sonnet 4.6 ($3/M input, $15/M output) with prompt caching active:

- Typical user (~10 supplements): ~$0.025–0.04/call.
- Power user (30+ supplements): ~$0.07/call.
- Realistic per-user/year (~30 runs): ~$1.00–1.50.
- Worst-case ceiling (3 manual re-runs/day, 365 days): ~$44/yr — far below subscription value, and effectively no one will hit it.

## Future work (v2 and beyond)

- **Mood correlation** — feed last ~30 days of mood scores + checkoff history into the prompt for "your mood is higher on days you take X" insights. Differentiator that leverages existing data.
- **DNA testing results** — incorporate genotype/SNP data as a context block in the prompt. Significant PII / consent / data-source decisions to be made; deserves its own brainstorm.
- **Goal-setter** — ask the user what they're optimizing for (sleep, energy, longevity, etc.) and add a "gaps for stated goals" section.
- **Stack at-a-glance score** — a 1-2 sentence header summary of overall stack health.
- **Stack-change notifications** — surface a Today-page card when the user has made meaningful changes since their last analysis ("you've added 3 new supplements — re-run analysis?").
- **Community experiences in context** — surface aggregate ratings from the `experiences` table for stack items as additional input to the LLM.
