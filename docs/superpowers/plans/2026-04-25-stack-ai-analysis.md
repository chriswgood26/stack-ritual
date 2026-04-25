# AI Stack Analysis Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the AI stack-analysis feature for Plus and Pro users — a five-section LLM analysis (synergies, interactions, timing, redundancies, recommendations) with on-demand re-runs, smart cache, server-recorded disclaimer, and hybrid catalog grounding for recommended additions.

**Architecture:** Two new Supabase tables / columns (`stack_analyses`, plus disclaimer columns on `user_profiles`). A pure server module `src/lib/analysis.ts` calls Anthropic Sonnet 4.6 with prompt caching + tool_use, parses the structured response, and grounds recommendations against the `supplements` catalog. Three API routes (`/run`, `/latest`, `/disclaimer/accept`) wire the lib into Clerk-authed Plus/Pro endpoints. A new `/dashboard/analysis` page renders results with collapsible sections, and a CTA card on `/dashboard/stack` is the entry point.

**Tech Stack:** Next.js 16 App Router · Clerk auth · Supabase (with `supabaseAdmin` service role) · Anthropic SDK (`@anthropic-ai/sdk`, already installed) · Tailwind 4 · Stripe-driven `subscriptions` table for plan gating.

> **No automated tests in this project** (see `CLAUDE.md`). Verification steps use `npm run build`, `npm run lint`, manual `curl` against the dev server, and browser checks. Each task ends with a commit.

**Spec:** `docs/superpowers/specs/2026-04-25-stack-ai-analysis-design.md`

---

## File Structure

| File | Responsibility |
|------|----------------|
| `database-stack-analyses.sql` | Create `stack_analyses` table + RLS policy + index |
| `database-analysis-disclaimer.sql` | Add `analysis_disclaimer_accepted_at` + `analysis_disclaimer_version` to `user_profiles` |
| `src/lib/analysis-types.ts` | Shared TS types: `Finding`, `Recommendation`, `AnalysisResult`, etc. (importable by client + server) |
| `src/lib/analysis-diff.ts` | Pure helpers to diff a stack snapshot against current `user_stacks` rows |
| `src/lib/analysis-grounding.ts` | Pure helper to match LLM-named recommendations against the `supplements` catalog |
| `src/lib/analysis.ts` | Anthropic call (prompt caching + tool_use) + orchestration; uses the above |
| `src/app/api/analysis/run/route.ts` | `POST` — gates, calls `lib/analysis`, persists, returns |
| `src/app/api/analysis/latest/route.ts` | `GET` — returns latest analysis + diff + rate-limit + disclaimer status |
| `src/app/api/analysis/disclaimer/accept/route.ts` | `POST` — records disclaimer acceptance |
| `src/components/AnalysisDisclaimerModal.tsx` | First-run safety modal |
| `src/components/AnalysisFindingCard.tsx` | Renders a single `Finding` (used by 4 of 5 sections) |
| `src/components/AnalysisRecommendationCard.tsx` | Renders a single `Recommendation` with `Add to stack` / `Search to add` CTA |
| `src/components/AnalysisSection.tsx` | Collapsible section wrapper (header + body + empty placeholder) |
| `src/app/dashboard/analysis/page.tsx` | Analysis page (client component) — fetches, renders sections, handles re-run |
| `src/components/StackAnalysisCard.tsx` | Stack-page entry-point card (all state variants) |
| `src/app/dashboard/stack/page.tsx` | Modify to render `<StackAnalysisCard />` at the top |

---

### Task 1: Create the `stack_analyses` migration file

**Files:**
- Create: `database-stack-analyses.sql`

- [ ] **Step 1: Write the migration**

```sql
-- Stack Analysis: stores one row per AI analysis run.
-- One row per (user, run). Latest row is what the analysis page renders.
-- See docs/superpowers/specs/2026-04-25-stack-ai-analysis-design.md

create table if not exists stack_analyses (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  created_at timestamptz not null default now(),

  -- input snapshot (used to compute "X items changed since last run")
  stack_snapshot jsonb not null,
  stack_item_count int not null,

  -- model output (post-grounded against `supplements`)
  analysis jsonb not null,
  model text not null,
  prompt_version int not null default 1,

  -- per-run audit of disclaimer state at the time of the run
  disclaimer_version_at_run int not null,

  -- observability / cost
  input_tokens int,
  output_tokens int,
  cached_input_tokens int,
  duration_ms int,

  -- run classification (drives rate limiter on /run)
  trigger text not null check (trigger in ('initial','stack_changed','manual_rerun'))
);

create index if not exists stack_analyses_user_created_idx
  on stack_analyses (user_id, created_at desc);

alter table stack_analyses enable row level security;

create policy "users read own analyses"
  on stack_analyses for select
  using (auth.jwt() ->> 'sub' = user_id);

-- Writes are server-only via supabaseAdmin (service role); no insert policy needed.
```

- [ ] **Step 2: Tell the user to run this migration**

The user runs migrations manually in the Supabase SQL editor (per project convention). After running, the user can verify with:

```sql
select column_name, data_type from information_schema.columns
  where table_name = 'stack_analyses' order by ordinal_position;
```

Expected: 13 columns, including `stack_snapshot jsonb`, `analysis jsonb`, `trigger text`.

- [ ] **Step 3: Commit**

```bash
git add database-stack-analyses.sql
git commit -m "feat(analysis): add stack_analyses table for AI stack analysis"
```

---

### Task 2: Create the disclaimer columns migration

**Files:**
- Create: `database-analysis-disclaimer.sql`

- [ ] **Step 1: Write the migration**

```sql
-- AI Stack Analysis: records when (and which version of) the safety disclaimer
-- the user accepted. Required gate on POST /api/analysis/run.

alter table user_profiles
  add column if not exists analysis_disclaimer_accepted_at timestamptz,
  add column if not exists analysis_disclaimer_version int;
```

- [ ] **Step 2: Tell the user to run this migration**

After running, verify with:

```sql
select column_name, data_type from information_schema.columns
  where table_name = 'user_profiles'
    and column_name like 'analysis_disclaimer%';
```

Expected: two rows.

- [ ] **Step 3: Commit**

```bash
git add database-analysis-disclaimer.sql
git commit -m "feat(analysis): add disclaimer acceptance columns to user_profiles"
```

---

### Task 3: Define shared analysis types

**Files:**
- Create: `src/lib/analysis-types.ts`

- [ ] **Step 1: Write the types file**

```ts
// Shared types for AI stack analysis.
// Importable by client and server (no runtime deps).

export type FindingSeverity = "info" | "caution" | "warning";

export type Finding = {
  title: string;
  body: string;
  severity?: FindingSeverity; // present on interactions; optional elsewhere
  involves: string[];          // supplement names from the user's stack
};

export type Recommendation = {
  name: string;
  body: string;
  catalog_match: { supplement_id: string; slug: string } | null;
};

export type AnalysisSections = {
  synergies: Finding[];
  interactions: Finding[];
  timing: Finding[];
  redundancies: Finding[];
  recommendations: Recommendation[];
};

export type StackSnapshotItem = {
  supplement_id: string | null; // null for user-submitted / freehand entries
  name: string;
  dose: string | null;
  timing: string | null;
  frequency: string | null;
  brand: string | null;
  notes: string | null;
};

export type AnalysisRunTrigger = "initial" | "stack_changed" | "manual_rerun";

export type AnalysisRow = {
  id: string;
  created_at: string;
  trigger: AnalysisRunTrigger;
  stack_item_count: number;
  analysis: AnalysisSections;
};

export type ChangesSummary = {
  added: number;
  removed: number;
  modified: number;
};

export type LatestAnalysisResponse = {
  analysis: AnalysisRow | null;
  stack_changed_since: boolean;
  changes_summary: ChangesSummary;
  rate_limit: { manual_runs_used_today: number; daily_cap: number };
  disclaimer: {
    accepted: boolean;
    version: number | null;
    current_version: number;
  };
};

export const CURRENT_DISCLAIMER_VERSION = 1;
export const PROMPT_VERSION = 1;
export const ANALYSIS_MODEL = "claude-sonnet-4-6";
export const MANUAL_RERUN_DAILY_CAP = 3;
```

- [ ] **Step 2: Type-check**

```bash
npm run build
```

Expected: build succeeds (types compile).

- [ ] **Step 3: Commit**

```bash
git add src/lib/analysis-types.ts
git commit -m "feat(analysis): add shared analysis types"
```

---

### Task 4: Implement the stack diff helper

**Files:**
- Create: `src/lib/analysis-diff.ts`

- [ ] **Step 1: Write the diff helper**

```ts
import type { ChangesSummary, StackSnapshotItem } from "./analysis-types";

/**
 * Build a key for a stack item. Prefers supplement_id; falls back to a
 * normalized name for user-submitted/freehand entries.
 */
function itemKey(item: StackSnapshotItem): string {
  if (item.supplement_id) return `id:${item.supplement_id}`;
  return `name:${item.name.trim().toLowerCase()}`;
}

function isModified(a: StackSnapshotItem, b: StackSnapshotItem): boolean {
  return (
    (a.dose ?? "") !== (b.dose ?? "") ||
    (a.timing ?? "") !== (b.timing ?? "") ||
    (a.frequency ?? "") !== (b.frequency ?? "") ||
    (a.brand ?? "") !== (b.brand ?? "")
  );
}

export function diffSnapshot(
  snapshot: StackSnapshotItem[],
  current: StackSnapshotItem[],
): ChangesSummary {
  const snapByKey = new Map(snapshot.map(i => [itemKey(i), i]));
  const curByKey = new Map(current.map(i => [itemKey(i), i]));

  let added = 0;
  let removed = 0;
  let modified = 0;

  for (const [key, cur] of curByKey) {
    const prev = snapByKey.get(key);
    if (!prev) {
      added += 1;
    } else if (isModified(prev, cur)) {
      modified += 1;
    }
  }
  for (const key of snapByKey.keys()) {
    if (!curByKey.has(key)) removed += 1;
  }

  return { added, removed, modified };
}

export function changesSummaryHasChanges(c: ChangesSummary): boolean {
  return c.added + c.removed + c.modified > 0;
}
```

- [ ] **Step 2: Type-check**

```bash
npm run build
```

Expected: success.

- [ ] **Step 3: Commit**

```bash
git add src/lib/analysis-diff.ts
git commit -m "feat(analysis): add stack diff helper"
```

---

### Task 5: Implement the recommendation grounding helper

**Files:**
- Create: `src/lib/analysis-grounding.ts`

- [ ] **Step 1: Write the grounding helper**

```ts
import type { Recommendation } from "./analysis-types";

export type CatalogEntry = {
  id: string;
  name: string;
  slug: string;
};

/**
 * Match an LLM-suggested name against the supplements catalog.
 *
 * Priority:
 *   1. Exact case-insensitive match on `name` or `slug`
 *   2. Longest substring match against `name` (case-insensitive)
 *   3. No match
 */
export function matchCatalog(
  name: string,
  catalog: CatalogEntry[],
): CatalogEntry | null {
  const needle = name.trim().toLowerCase();
  if (!needle) return null;

  let exact: CatalogEntry | null = null;
  let bestSubstr: { entry: CatalogEntry; len: number } | null = null;

  for (const entry of catalog) {
    const en = entry.name.toLowerCase();
    const es = entry.slug.toLowerCase();
    if (en === needle || es === needle) {
      exact = entry;
      break;
    }
    if (en.includes(needle) || needle.includes(en)) {
      const overlapLen = Math.min(en.length, needle.length);
      if (!bestSubstr || overlapLen > bestSubstr.len) {
        bestSubstr = { entry, len: overlapLen };
      }
    }
  }

  if (exact) return exact;
  if (bestSubstr) return bestSubstr.entry;
  return null;
}

/**
 * Populate `catalog_match` on each recommendation. Catalog should already
 * be filtered to a reasonable set (e.g., all of `supplements`); the matching
 * is O(recs * catalog) which is fine for our scale.
 */
export function groundRecommendations(
  recs: Omit<Recommendation, "catalog_match">[],
  catalog: CatalogEntry[],
): Recommendation[] {
  return recs.map(rec => {
    const match = matchCatalog(rec.name, catalog);
    return {
      ...rec,
      catalog_match: match
        ? { supplement_id: match.id, slug: match.slug }
        : null,
    };
  });
}
```

- [ ] **Step 2: Type-check**

```bash
npm run build
```

Expected: success.

- [ ] **Step 3: Commit**

```bash
git add src/lib/analysis-grounding.ts
git commit -m "feat(analysis): add recommendation catalog grounding"
```

---

### Task 6: Implement the core analysis lib (Anthropic call)

**Files:**
- Create: `src/lib/analysis.ts`

- [ ] **Step 1: Write the analysis module**

```ts
import Anthropic from "@anthropic-ai/sdk";
import type {
  AnalysisSections,
  Recommendation,
  StackSnapshotItem,
} from "./analysis-types";
import { ANALYSIS_MODEL, PROMPT_VERSION } from "./analysis-types";
import { groundRecommendations, type CatalogEntry } from "./analysis-grounding";

const SYSTEM_PROMPT = `You are a supplement-stack analyst. The user will give you a JSON list of supplements they currently take, with doses, timing, and frequency.

Produce a structured analysis with five sections:
  1. synergies        — pairs/groups in their stack that work well together
  2. interactions     — items that reduce each other's effectiveness, compete for absorption, or shouldn't be co-administered
  3. timing           — concrete suggestions to move items to a different time of day for better effect
  4. redundancies     — multiple items targeting the same mechanism
  5. recommendations  — additions worth considering, given gaps in the stack

CONSTRAINTS:
- Reference research mechanisms when known; never invent citations.
- Frame all guidance as informational, not medical. Use "may", "research suggests", "consider", not absolutes.
- Recommend supplement categories or commonly-known compound names, not brands.
- Severity on interactions: "info" (worth knowing), "caution" (separate by 2h, etc.), "warning" (avoid co-administration).
- "involves" arrays must contain names exactly as they appear in the user's stack.
- If the stack is empty or has only one item, return mostly-empty arrays and a note in recommendations only.
- Output MUST be a single call to the submit_stack_analysis tool. No prose outside the tool call.`;

const ANALYSIS_TOOL = {
  name: "submit_stack_analysis",
  description:
    "Submit the structured stack analysis. Call this exactly once with the full result.",
  input_schema: {
    type: "object",
    required: ["synergies", "interactions", "timing", "redundancies", "recommendations"],
    properties: {
      synergies: { type: "array", items: { $ref: "#/$defs/finding" } },
      interactions: {
        type: "array",
        items: {
          type: "object",
          required: ["title", "body", "severity", "involves"],
          properties: {
            title: { type: "string" },
            body: { type: "string" },
            severity: { type: "string", enum: ["info", "caution", "warning"] },
            involves: { type: "array", items: { type: "string" } },
          },
        },
      },
      timing: { type: "array", items: { $ref: "#/$defs/finding" } },
      redundancies: { type: "array", items: { $ref: "#/$defs/finding" } },
      recommendations: {
        type: "array",
        items: {
          type: "object",
          required: ["name", "body"],
          properties: {
            name: { type: "string" },
            body: { type: "string" },
          },
        },
      },
    },
    $defs: {
      finding: {
        type: "object",
        required: ["title", "body", "involves"],
        properties: {
          title: { type: "string" },
          body: { type: "string" },
          involves: { type: "array", items: { type: "string" } },
        },
      },
    },
  },
} as const;

export type AnalysisRunOutput = {
  analysis: AnalysisSections;
  inputTokens: number;
  outputTokens: number;
  cachedInputTokens: number;
  durationMs: number;
  model: string;
  promptVersion: number;
};

export async function runStackAnalysis(
  stack: StackSnapshotItem[],
  catalog: CatalogEntry[],
): Promise<AnalysisRunOutput> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY not configured");
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const startedAt = Date.now();

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

  const response = await anthropic.messages.create({
    model: ANALYSIS_MODEL,
    max_tokens: 4096,
    system: [
      {
        type: "text",
        text: SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    tools: [ANALYSIS_TOOL],
    tool_choice: { type: "tool", name: ANALYSIS_TOOL.name },
    messages: [{ role: "user", content: userMessage }],
  });

  const durationMs = Date.now() - startedAt;

  const toolUseBlock = response.content.find(b => b.type === "tool_use");
  if (!toolUseBlock || toolUseBlock.type !== "tool_use") {
    throw new Error("Model did not call submit_stack_analysis tool");
  }

  const raw = toolUseBlock.input as {
    synergies: AnalysisSections["synergies"];
    interactions: AnalysisSections["interactions"];
    timing: AnalysisSections["timing"];
    redundancies: AnalysisSections["redundancies"];
    recommendations: Omit<Recommendation, "catalog_match">[];
  };

  const grounded = groundRecommendations(raw.recommendations, catalog);

  const analysis: AnalysisSections = {
    synergies: raw.synergies ?? [],
    interactions: raw.interactions ?? [],
    timing: raw.timing ?? [],
    redundancies: raw.redundancies ?? [],
    recommendations: grounded,
  };

  return {
    analysis,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
    cachedInputTokens:
      (response.usage as { cache_read_input_tokens?: number })
        .cache_read_input_tokens ?? 0,
    durationMs,
    model: ANALYSIS_MODEL,
    promptVersion: PROMPT_VERSION,
  };
}
```

- [ ] **Step 2: Type-check**

```bash
npm run build
```

Expected: success.

- [ ] **Step 3: Commit**

```bash
git add src/lib/analysis.ts
git commit -m "feat(analysis): add core analysis lib with prompt caching + tool_use"
```

---

### Task 7: Implement `GET /api/analysis/latest`

**Files:**
- Create: `src/app/api/analysis/latest/route.ts`

- [ ] **Step 1: Write the route**

```ts
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import {
  CURRENT_DISCLAIMER_VERSION,
  MANUAL_RERUN_DAILY_CAP,
  type LatestAnalysisResponse,
  type StackSnapshotItem,
} from "@/lib/analysis-types";
import { diffSnapshot, changesSummaryHasChanges } from "@/lib/analysis-diff";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Plan check (Plus or Pro)
  const { data: sub } = await supabaseAdmin
    .from("subscriptions")
    .select("plan, status")
    .eq("user_id", userId)
    .single();

  const plan = sub?.plan;
  const status = sub?.status;
  const isPaid =
    (plan === "plus" || plan === "pro") && status === "active";
  if (!isPaid) {
    return NextResponse.json(
      { error: "plan_required", plan: "plus" },
      { status: 403 },
    );
  }

  // Disclaimer status
  const { data: profile } = await supabaseAdmin
    .from("user_profiles")
    .select("analysis_disclaimer_version")
    .eq("user_id", userId)
    .single();

  const disclaimerVersion = profile?.analysis_disclaimer_version ?? null;
  const disclaimerAccepted =
    disclaimerVersion !== null &&
    disclaimerVersion >= CURRENT_DISCLAIMER_VERSION;

  // Latest analysis row
  const { data: latest } = await supabaseAdmin
    .from("stack_analyses")
    .select("id, created_at, trigger, stack_item_count, stack_snapshot, analysis")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Current active stack
  const { data: stackRows } = await supabaseAdmin
    .from("user_stacks")
    .select(
      "supplement_id, custom_name, dose, timing, frequency_type, brand, notes",
    )
    .eq("user_id", userId)
    .eq("is_active", true)
    .eq("is_paused", false);

  const currentStack: StackSnapshotItem[] = (stackRows ?? []).map(r => ({
    supplement_id: r.supplement_id ?? null,
    name: r.custom_name ?? "",
    dose: r.dose ?? null,
    timing: r.timing ?? null,
    frequency: r.frequency_type ?? null,
    brand: r.brand ?? null,
    notes: r.notes ?? null,
  }));

  // Manual re-runs used today (for the rate-limit display)
  const startOfDayUtc = new Date();
  startOfDayUtc.setUTCHours(0, 0, 0, 0);
  const { count: manualRunsToday } = await supabaseAdmin
    .from("stack_analyses")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("trigger", "manual_rerun")
    .gte("created_at", startOfDayUtc.toISOString());

  const changes = latest
    ? diffSnapshot(
        (latest.stack_snapshot as StackSnapshotItem[]) ?? [],
        currentStack,
      )
    : { added: 0, removed: 0, modified: 0 };

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
    rate_limit: {
      manual_runs_used_today: manualRunsToday ?? 0,
      daily_cap: MANUAL_RERUN_DAILY_CAP,
    },
    disclaimer: {
      accepted: disclaimerAccepted,
      version: disclaimerVersion,
      current_version: CURRENT_DISCLAIMER_VERSION,
    },
  };

  return NextResponse.json(body);
}
```

> **Note on `user_stacks` columns:** the names above (`supplement_id`, `custom_name`, `dose`, `timing`, `frequency_type`, `brand`, `notes`) match the spec's data-model summary. If actual column names differ, adjust the `select` and the mapping. Run `select column_name from information_schema.columns where table_name = 'user_stacks';` in Supabase to confirm. **The agent must verify this before moving on.**

- [ ] **Step 2: Type-check**

```bash
npm run build
```

Expected: success. If `user_stacks` columns don't match, fix the mapping and rebuild.

- [ ] **Step 3: Manual verification (free user)**

Start the dev server:

```bash
npm run dev
```

In another terminal, sign in as a Free-tier test user in the browser and copy a Clerk session cookie. Then:

```bash
curl -i http://localhost:3000/api/analysis/latest \
  -H "Cookie: <paste your __session cookie>"
```

Expected: `HTTP 403` with body `{"error":"plan_required","plan":"plus"}`.

- [ ] **Step 4: Manual verification (Plus/Pro user, never run)**

Switch to a Plus/Pro test account:

```bash
curl -i http://localhost:3000/api/analysis/latest \
  -H "Cookie: <paste your __session cookie>"
```

Expected: `HTTP 200` with `analysis: null`, `stack_changed_since: false`, `disclaimer.accepted: false`.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/analysis/latest/route.ts
git commit -m "feat(analysis): GET /api/analysis/latest"
```

---

### Task 8: Implement `POST /api/analysis/disclaimer/accept`

**Files:**
- Create: `src/app/api/analysis/disclaimer/accept/route.ts`

- [ ] **Step 1: Write the route**

```ts
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { CURRENT_DISCLAIMER_VERSION } from "@/lib/analysis-types";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as { version?: number };
  const version = Number(body.version);
  if (!Number.isFinite(version) || version < 1) {
    return NextResponse.json({ error: "version required" }, { status: 400 });
  }
  if (version > CURRENT_DISCLAIMER_VERSION) {
    return NextResponse.json(
      { error: "unknown_version" },
      { status: 400 },
    );
  }

  const acceptedAt = new Date().toISOString();
  const { error } = await supabaseAdmin
    .from("user_profiles")
    .update({
      analysis_disclaimer_accepted_at: acceptedAt,
      analysis_disclaimer_version: version,
    })
    .eq("user_id", userId);

  if (error) {
    console.error("disclaimer accept failed", error);
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, accepted_at: acceptedAt });
}
```

- [ ] **Step 2: Manual verification**

```bash
curl -i -X POST http://localhost:3000/api/analysis/disclaimer/accept \
  -H "Content-Type: application/json" \
  -H "Cookie: <Plus/Pro __session cookie>" \
  -d '{"version":1}'
```

Expected: `HTTP 200` with `{"ok":true,"accepted_at":"..."}`.

Verify in Supabase:

```sql
select user_id, analysis_disclaimer_accepted_at, analysis_disclaimer_version
  from user_profiles
  where analysis_disclaimer_version is not null;
```

Expected: row exists with `version = 1` and a recent timestamp.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/analysis/disclaimer/accept/route.ts
git commit -m "feat(analysis): POST /api/analysis/disclaimer/accept"
```

---

### Task 9: Implement `POST /api/analysis/run`

**Files:**
- Create: `src/app/api/analysis/run/route.ts`

- [ ] **Step 1: Write the route**

```ts
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabase, supabaseAdmin } from "@/lib/supabase";
import {
  ANALYSIS_MODEL,
  CURRENT_DISCLAIMER_VERSION,
  MANUAL_RERUN_DAILY_CAP,
  PROMPT_VERSION,
  type AnalysisRunTrigger,
  type StackSnapshotItem,
} from "@/lib/analysis-types";
import { changesSummaryHasChanges, diffSnapshot } from "@/lib/analysis-diff";
import { runStackAnalysis } from "@/lib/analysis";
import type { CatalogEntry } from "@/lib/analysis-grounding";

export async function POST() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Plan gate
  const { data: sub } = await supabaseAdmin
    .from("subscriptions")
    .select("plan, status")
    .eq("user_id", userId)
    .single();
  const isPaid =
    (sub?.plan === "plus" || sub?.plan === "pro") && sub?.status === "active";
  if (!isPaid) {
    return NextResponse.json(
      { error: "plan_required", plan: "plus" },
      { status: 403 },
    );
  }

  // Disclaimer gate
  const { data: profile } = await supabaseAdmin
    .from("user_profiles")
    .select("analysis_disclaimer_version")
    .eq("user_id", userId)
    .single();
  const disclaimerVersion = profile?.analysis_disclaimer_version ?? null;
  if (
    disclaimerVersion === null ||
    disclaimerVersion < CURRENT_DISCLAIMER_VERSION
  ) {
    return NextResponse.json(
      {
        error: "disclaimer_required",
        current_version: CURRENT_DISCLAIMER_VERSION,
      },
      { status: 403 },
    );
  }

  // Load active, non-paused stack
  const { data: stackRows } = await supabaseAdmin
    .from("user_stacks")
    .select(
      "supplement_id, custom_name, dose, timing, frequency_type, brand, notes",
    )
    .eq("user_id", userId)
    .eq("is_active", true)
    .eq("is_paused", false);

  const stack: StackSnapshotItem[] = (stackRows ?? []).map(r => ({
    supplement_id: r.supplement_id ?? null,
    name: r.custom_name ?? "",
    dose: r.dose ?? null,
    timing: r.timing ?? null,
    frequency: r.frequency_type ?? null,
    brand: r.brand ?? null,
    notes: r.notes ?? null,
  }));

  if (stack.length === 0) {
    return NextResponse.json({ error: "empty_stack" }, { status: 409 });
  }

  // Determine trigger and apply rate limiter
  const { data: latest } = await supabaseAdmin
    .from("stack_analyses")
    .select("stack_snapshot, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

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

  // Load catalog (for grounding). Public read on `supplements` is fine.
  const { data: catalogRows } = await supabase
    .from("supplements")
    .select("id, name, slug");
  const catalog: CatalogEntry[] = catalogRows ?? [];

  // Call the model
  let result;
  try {
    result = await runStackAnalysis(stack, catalog);
  } catch (e) {
    console.error("analysis run failed", e);
    return NextResponse.json({ error: "analysis_failed" }, { status: 500 });
  }

  // Persist
  const { data: inserted, error: insertError } = await supabaseAdmin
    .from("stack_analyses")
    .insert({
      user_id: userId,
      stack_snapshot: stack,
      stack_item_count: stack.length,
      analysis: result.analysis,
      model: result.model,
      prompt_version: result.promptVersion,
      disclaimer_version_at_run: disclaimerVersion,
      input_tokens: result.inputTokens,
      output_tokens: result.outputTokens,
      cached_input_tokens: result.cachedInputTokens,
      duration_ms: result.durationMs,
      trigger,
    })
    .select("id, created_at")
    .single();

  if (insertError || !inserted) {
    console.error("persist analysis failed", insertError);
    return NextResponse.json(
      { error: "analysis_failed" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    id: inserted.id,
    created_at: inserted.created_at,
    trigger,
    stack_item_count: stack.length,
    analysis: result.analysis,
  });
}

// Long-running model call — give it room.
export const maxDuration = 60;
```

- [ ] **Step 2: Type-check**

```bash
npm run build
```

Expected: success.

- [ ] **Step 3: Manual verification — happy path**

Sign in as a Plus user in the browser, accept the disclaimer (use the endpoint from Task 8), have a few supplements on `/dashboard/stack`, then:

```bash
curl -i -X POST http://localhost:3000/api/analysis/run \
  -H "Cookie: <Plus __session cookie>"
```

Expected: `HTTP 200` with a JSON body containing `analysis.synergies`, `analysis.interactions`, etc. Allow up to 30s.

Verify in Supabase:

```sql
select id, trigger, stack_item_count, model, input_tokens, output_tokens
  from stack_analyses
  order by created_at desc limit 1;
```

Expected: a row with `trigger = 'initial'` and non-zero token counts.

- [ ] **Step 4: Manual verification — rate limit**

Run the same curl four times in a row without changing the stack. The first three should succeed (one `initial` + two `manual_rerun`). The fourth should return `HTTP 429` with `{"error":"rate_limited", ...}`.

- [ ] **Step 5: Manual verification — empty stack**

Sign in as a Plus user with zero active supplements:

```bash
curl -i -X POST http://localhost:3000/api/analysis/run \
  -H "Cookie: <empty-stack Plus __session cookie>"
```

Expected: `HTTP 409` with `{"error":"empty_stack"}`.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/analysis/run/route.ts
git commit -m "feat(analysis): POST /api/analysis/run with rate limiter and catalog grounding"
```

---

### Task 10: Build the disclaimer modal component

**Files:**
- Create: `src/components/AnalysisDisclaimerModal.tsx`

- [ ] **Step 1: Write the component**

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

  async function handleContinue() {
    if (!understood || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/analysis/disclaimer/accept", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ version: CURRENT_DISCLAIMER_VERSION }),
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
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
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

- [ ] **Step 2: Type-check**

```bash
npm run build
```

Expected: success.

- [ ] **Step 3: Commit**

```bash
git add src/components/AnalysisDisclaimerModal.tsx
git commit -m "feat(analysis): disclaimer modal with server-recorded acceptance"
```

---

### Task 11: Build the section + finding + recommendation components

**Files:**
- Create: `src/components/AnalysisSection.tsx`
- Create: `src/components/AnalysisFindingCard.tsx`
- Create: `src/components/AnalysisRecommendationCard.tsx`

- [ ] **Step 1: Write `AnalysisSection.tsx`**

```tsx
"use client";

import { useState, type ReactNode } from "react";

type Props = {
  title: string;
  count: number;
  emptyMessage: string;
  defaultOpen?: boolean;
  children: ReactNode;
};

export default function AnalysisSection({
  title,
  count,
  emptyMessage,
  defaultOpen = true,
  children,
}: Props) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="border-b border-stone-200 py-4">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-center justify-between text-left"
      >
        <h3 className="text-base font-semibold text-stone-900">
          {title}{" "}
          <span className="ml-1 rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-600">
            {count}
          </span>
        </h3>
        <span className="text-stone-400">{open ? "−" : "+"}</span>
      </button>

      {open ? (
        <div className="mt-3">
          {count === 0 ? (
            <p className="text-sm text-stone-500">{emptyMessage}</p>
          ) : (
            children
          )}
        </div>
      ) : null}
    </section>
  );
}
```

- [ ] **Step 2: Write `AnalysisFindingCard.tsx`**

```tsx
import type { Finding } from "@/lib/analysis-types";

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

type Props = { finding: Finding };

export default function AnalysisFindingCard({ finding }: Props) {
  const sev = finding.severity ?? "info";
  return (
    <div
      className={`mb-3 rounded-xl border p-4 ${SEVERITY_STYLES[sev]}`}
    >
      <div className="flex items-start justify-between gap-3">
        <h4 className="text-sm font-semibold text-stone-900">
          {finding.title}
        </h4>
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
    </div>
  );
}
```

- [ ] **Step 3: Write `AnalysisRecommendationCard.tsx`**

```tsx
"use client";

import Link from "next/link";
import { useState } from "react";
import type { Recommendation } from "@/lib/analysis-types";

type Props = {
  rec: Recommendation;
  onAdded?: () => void;
};

export default function AnalysisRecommendationCard({ rec, onAdded }: Props) {
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAdd() {
    if (!rec.catalog_match || adding) return;
    setAdding(true);
    setError(null);
    try {
      const res = await fetch("/api/stack/add", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplement_id: rec.catalog_match.supplement_id,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      setAdded(true);
      onAdded?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add");
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="mb-3 rounded-xl border border-stone-200 bg-white p-4">
      <h4 className="text-sm font-semibold text-stone-900">{rec.name}</h4>
      <p className="mt-2 text-sm text-stone-700">{rec.body}</p>

      {error ? (
        <p className="mt-2 text-xs text-red-600">{error}</p>
      ) : null}

      <div className="mt-3">
        {rec.catalog_match ? (
          added ? (
            <span className="text-sm font-medium text-emerald-700">
              Added to your stack ✓
            </span>
          ) : (
            <button
              type="button"
              onClick={handleAdd}
              disabled={adding}
              className="rounded-lg bg-emerald-700 px-3 py-1.5 text-sm font-medium text-white disabled:bg-stone-300"
            >
              {adding ? "Adding..." : "Add to stack"}
            </button>
          )
        ) : (
          <Link
            href={`/dashboard/search?q=${encodeURIComponent(rec.name)}`}
            className="inline-block rounded-lg border border-stone-300 px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-50"
          >
            Search to add
          </Link>
        )}
      </div>
    </div>
  );
}
```

> **Add-to-stack call:** the body shape `{ supplement_id }` matches the existing `/api/stack/add` route pattern referenced in the explorer findings. If that route requires more fields (e.g., `dose`, `timing`), the agent should adjust by reading `src/app/api/stack/add/route.ts` and pulling sane defaults.

- [ ] **Step 4: Type-check**

```bash
npm run build
```

Expected: success.

- [ ] **Step 5: Commit**

```bash
git add src/components/AnalysisSection.tsx src/components/AnalysisFindingCard.tsx src/components/AnalysisRecommendationCard.tsx
git commit -m "feat(analysis): section, finding, and recommendation components"
```

---

### Task 12: Build the analysis page

**Files:**
- Create: `src/app/dashboard/analysis/page.tsx`

- [ ] **Step 1: Write the page**

```tsx
"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import AnalysisDisclaimerModal from "@/components/AnalysisDisclaimerModal";
import AnalysisSection from "@/components/AnalysisSection";
import AnalysisFindingCard from "@/components/AnalysisFindingCard";
import AnalysisRecommendationCard from "@/components/AnalysisRecommendationCard";
import type { LatestAnalysisResponse } from "@/lib/analysis-types";

export default function AnalysisPage() {
  const [latest, setLatest] = useState<LatestAnalysisResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDisclaimer, setShowDisclaimer] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/analysis/latest", {
        credentials: "include",
      });
      if (res.status === 403) {
        const data = await res.json().catch(() => ({}));
        if (data.error === "plan_required") {
          setError("plan_required");
          return;
        }
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as LatestAnalysisResponse;
      setLatest(data);
      if (!data.disclaimer.accepted) setShowDisclaimer(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleRun() {
    if (running) return;
    setRunning(true);
    setError(null);
    try {
      const res = await fetch("/api/analysis/run", {
        method: "POST",
        credentials: "include",
      });
      if (res.status === 403) {
        const data = await res.json().catch(() => ({}));
        if (data.error === "disclaimer_required") {
          setShowDisclaimer(true);
          return;
        }
      }
      if (res.status === 429) {
        setError("rate_limited");
        return;
      }
      if (res.status === 409) {
        setError("empty_stack");
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to analyze");
    } finally {
      setRunning(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-6">
        <p className="text-sm text-stone-500">Loading analysis...</p>
      </div>
    );
  }

  if (error === "plan_required") {
    return (
      <div className="mx-auto max-w-2xl px-4 py-6">
        <h1 className="text-xl font-semibold">Stack Analysis</h1>
        <p className="mt-3 text-sm text-stone-700">
          Stack analysis is a Plus feature.
        </p>
        <Link
          href="/dashboard/profile"
          className="mt-4 inline-block rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white"
        >
          Upgrade
        </Link>
      </div>
    );
  }

  const a = latest?.analysis ?? null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 pb-28">
      <Link
        href="/dashboard/stack"
        className="text-sm text-stone-600 hover:underline"
      >
        ← Back to Stack
      </Link>

      <h1 className="mt-2 text-2xl font-semibold text-stone-900">
        Stack Analysis
      </h1>

      {a ? (
        <p className="mt-1 text-sm text-stone-600">
          Based on {a.stack_item_count} supplements · Analyzed{" "}
          {new Date(a.created_at).toLocaleDateString()}
        </p>
      ) : (
        <p className="mt-1 text-sm text-stone-600">
          You haven&apos;t run an analysis yet.
        </p>
      )}

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

      {error === "rate_limited" ? (
        <p className="mt-3 text-sm text-amber-700">
          You&apos;ve used today&apos;s manual re-runs. Stack changes refresh
          free, or come back tomorrow.
        </p>
      ) : null}
      {error === "empty_stack" ? (
        <p className="mt-3 text-sm text-amber-700">
          Add some supplements to your stack first.
        </p>
      ) : null}
      {error && !["rate_limited", "empty_stack"].includes(error) ? (
        <p className="mt-3 text-sm text-red-600">
          Couldn&apos;t run analysis right now. Try again in a moment.
        </p>
      ) : null}

      <div className="mt-6 rounded-xl bg-stone-50 p-4 text-xs text-stone-600">
        Informational only. Talk to your doctor before changing what you take.
      </div>

      {a ? (
        <div className="mt-4">
          <AnalysisSection
            title="Synergies"
            count={a.analysis.synergies.length}
            emptyMessage="No synergies flagged in your current stack."
          >
            {a.analysis.synergies.map((f, i) => (
              <AnalysisFindingCard key={i} finding={f} />
            ))}
          </AnalysisSection>

          <AnalysisSection
            title="Interactions"
            count={a.analysis.interactions.length}
            emptyMessage="No interactions flagged in your current stack."
          >
            {a.analysis.interactions.map((f, i) => (
              <AnalysisFindingCard key={i} finding={f} />
            ))}
          </AnalysisSection>

          <AnalysisSection
            title="Timing"
            count={a.analysis.timing.length}
            emptyMessage="No timing changes suggested."
          >
            {a.analysis.timing.map((f, i) => (
              <AnalysisFindingCard key={i} finding={f} />
            ))}
          </AnalysisSection>

          <AnalysisSection
            title="Redundancies"
            count={a.analysis.redundancies.length}
            emptyMessage="No redundancies flagged."
          >
            {a.analysis.redundancies.map((f, i) => (
              <AnalysisFindingCard key={i} finding={f} />
            ))}
          </AnalysisSection>

          <AnalysisSection
            title="Recommended additions"
            count={a.analysis.recommendations.length}
            emptyMessage="No recommendations at this time."
          >
            {a.analysis.recommendations.map((rec, i) => (
              <AnalysisRecommendationCard
                key={i}
                rec={rec}
                onAdded={load}
              />
            ))}
          </AnalysisSection>
        </div>
      ) : null}

      {showDisclaimer ? (
        <AnalysisDisclaimerModal
          onAccepted={() => {
            setShowDisclaimer(false);
            load();
          }}
          onCancel={() => setShowDisclaimer(false)}
        />
      ) : null}
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
npm run build
```

Expected: success.

- [ ] **Step 3: Manual verification — first-run flow**

1. Sign in as a Plus user that has not yet accepted the disclaimer.
2. Visit `http://localhost:3000/dashboard/analysis`.
3. Disclaimer modal appears. Tick "I understand", click Continue.
4. Modal disappears. Page shows "You haven't run an analysis yet" + an "Analyze my stack" button.
5. Click "Analyze my stack". Loading state appears for ~5–15s.
6. Five sections render with findings.

- [ ] **Step 4: Manual verification — re-run + rate limit**

1. Click "Re-analyze" three times in a row (without changing the stack).
2. Each runs successfully.
3. The fourth click shows the "you've used today's manual re-runs" amber message.

- [ ] **Step 5: Commit**

```bash
git add src/app/dashboard/analysis/page.tsx
git commit -m "feat(analysis): /dashboard/analysis page with sections and re-run"
```

---

### Task 13: Build the stack-page entry-point card

**Files:**
- Create: `src/components/StackAnalysisCard.tsx`
- Modify: `src/app/dashboard/stack/page.tsx`

- [ ] **Step 1: Write `StackAnalysisCard.tsx`**

```tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { LatestAnalysisResponse } from "@/lib/analysis-types";

function relativeDate(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const days = Math.floor((now - then) / (1000 * 60 * 60 * 24));
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  return new Date(iso).toLocaleDateString();
}

export default function StackAnalysisCard() {
  const [data, setData] = useState<LatestAnalysisResponse | null>(null);
  const [planLocked, setPlanLocked] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/analysis/latest", {
          credentials: "include",
        });
        if (cancelled) return;
        if (res.status === 403) {
          const body = await res.json().catch(() => ({}));
          if (body.error === "plan_required") {
            setPlanLocked(true);
            return;
          }
        }
        if (!res.ok) return;
        setData((await res.json()) as LatestAnalysisResponse);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return null;

  if (planLocked) {
    return (
      <div className="mb-4 rounded-2xl border border-stone-200 bg-white p-4">
        <h3 className="text-sm font-semibold text-stone-900">
          ✨ AI stack analysis
        </h3>
        <p className="mt-1 text-sm text-stone-600">
          Get an AI breakdown of synergies, interactions, and recommended
          additions. Plus and Pro feature.
        </p>
        <Link
          href="/dashboard/profile"
          className="mt-3 inline-block rounded-lg bg-emerald-700 px-3 py-1.5 text-sm font-medium text-white"
        >
          Upgrade
        </Link>
      </div>
    );
  }

  if (!data) return null;

  const { analysis, stack_changed_since, changes_summary, rate_limit } = data;
  const capUsed =
    rate_limit.manual_runs_used_today >= rate_limit.daily_cap &&
    !stack_changed_since;

  if (!analysis) {
    return (
      <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
        <h3 className="text-sm font-semibold text-emerald-900">
          ✨ Analyze my stack
        </h3>
        <p className="mt-1 text-sm text-emerald-900/80">
          Get an AI breakdown of synergies, interactions, and recommended
          additions.
        </p>
        <Link
          href="/dashboard/analysis"
          className="mt-3 inline-block rounded-lg bg-emerald-700 px-3 py-1.5 text-sm font-medium text-white"
        >
          Analyze my stack
        </Link>
      </div>
    );
  }

  const totalChanges =
    changes_summary.added + changes_summary.removed + changes_summary.modified;

  return (
    <div className="mb-4 rounded-2xl border border-stone-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-stone-900">✨ Stack analysis</h3>
      <p className="mt-1 text-sm text-stone-600">
        Last analyzed {relativeDate(analysis.created_at)}
        {stack_changed_since
          ? ` · ${totalChanges} item${totalChanges === 1 ? "" : "s"} changed since`
          : ""}
      </p>
      {capUsed ? (
        <p className="mt-2 text-xs text-amber-700">
          Daily re-runs used. Stack changes refresh free, or come back tomorrow.
        </p>
      ) : null}
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
}
```

- [ ] **Step 2: Mount the card on the Stack page**

Read `src/app/dashboard/stack/page.tsx` and insert `<StackAnalysisCard />` near the top of the rendered content (above the supplement list, below the page header). The exact insertion point depends on the current page structure — locate the top-level content container and add the card as its first child.

Example (sketch — actual placement determined by reading the file):

```tsx
import StackAnalysisCard from "@/components/StackAnalysisCard";

// inside the existing return:
<div className="...">
  <StackAnalysisCard />
  {/* existing content */}
</div>
```

- [ ] **Step 3: Type-check**

```bash
npm run build
```

Expected: success.

- [ ] **Step 4: Manual verification**

1. As a Free user, visit `/dashboard/stack` — the card shows the locked "Upgrade" state.
2. As a Plus user with no analyses yet, the card shows "Analyze my stack".
3. As a Plus user with a recent analysis and unchanged stack, the card shows "Last analyzed [date]" + "View results".
4. Add a supplement to the stack, return to `/dashboard/stack` — the card shows "1 item changed since" + "Re-analyze".

- [ ] **Step 5: Commit**

```bash
git add src/components/StackAnalysisCard.tsx src/app/dashboard/stack/page.tsx
git commit -m "feat(analysis): stack-page entry-point card with all state variants"
```

---

### Task 14: Polish + manual QA pass

**Files:** none (verification only).

- [ ] **Step 1: Run the linter**

```bash
npm run lint
```

Fix any warnings introduced by this feature.

- [ ] **Step 2: Production build**

```bash
npm run build
```

Expected: success with no errors.

- [ ] **Step 3: Mobile layout check**

Open the dev server in Chrome DevTools mobile emulation (iPhone 13 / Pixel 5):

- `/dashboard/stack` — card is full-width, buttons are tappable.
- `/dashboard/analysis` — sections collapse cleanly, recommendation buttons don't overflow, modal is centered.

- [ ] **Step 4: End-to-end smoke test as Plus user**

1. Sign out, sign in as a Plus test account.
2. From scratch (delete any prior analyses): `delete from stack_analyses where user_id = '<test user>';` and reset disclaimer: `update user_profiles set analysis_disclaimer_accepted_at = null, analysis_disclaimer_version = null where user_id = '<test user>';`.
3. Visit `/dashboard/stack` — card shows "Analyze my stack".
4. Click → land on `/dashboard/analysis` — disclaimer modal appears.
5. Cancel — modal closes, card returns. Re-open — modal reappears (acceptance sticky was not yet recorded).
6. Accept — modal closes; click "Analyze my stack"; verify all five sections render.
7. Check a recommendation with `catalog_match`: click "Add to stack" → verify the supplement appears in `/dashboard/stack`.
8. Check a recommendation without `catalog_match`: click "Search to add" → verify it routes to `/dashboard/search?q=<name>`.
9. Pause one of the supplements in the stack (use the existing pause action). Re-analyze — verify the page header notes "1 paused item not included" (if not present, this is the line in the page that reads from the stack count vs. the analyzed count — implement if missing; otherwise file as v2 polish).

- [ ] **Step 5: End-to-end as Pro user**

Repeat the smoke test on a Pro account; behavior should be identical.

- [ ] **Step 6: End-to-end as Free user**

1. Sign in as Free.
2. `/dashboard/stack` — card shows the locked "Upgrade" state.
3. Direct-navigate to `/dashboard/analysis` — page shows "Stack analysis is a Plus feature" + Upgrade button.
4. Direct-curl `POST /api/analysis/run` — returns `403 plan_required`.

- [ ] **Step 7: Commit any polish fixes**

```bash
git add -A
git commit -m "chore(analysis): polish + lint fixes from manual QA"
```

(If no fixes were needed, skip this commit.)

---

## Self-Review (run before declaring done)

This section is for the human or executor running the plan, not a separate task.

1. **Spec coverage:**
   - Plus/Pro gating → Tasks 7, 9 (`plan_required` 403)
   - On-demand + smart cache → Tasks 7, 9, 13 (latest endpoint + diff + card states)
   - Stack-only input v1 → Task 9 (`select` from `user_stacks` only)
   - Five output sections → Task 6 (tool schema), Tasks 11–12 (rendering)
   - Hybrid grounding → Tasks 5, 6 (catalog match), Task 11 (Add vs Search CTA)
   - Safety posture (system prompt + banner + first-run modal + server-recorded acceptance) → Task 6, Task 8, Task 10, Task 12
   - Disclaimer versioning → Tasks 2, 3, 8, 9
   - `stack_analyses` schema with full audit columns → Task 1
   - Rate limit (initial free, stack-changed free, 3 manual/day) → Task 9
   - Empty stack 409, malformed-LLM 500, error states in UI → Tasks 9, 12
   - Cost: prompt caching → Task 6 (`cache_control: ephemeral` on system block)

2. **Placeholder scan:** No "TBD"/"TODO"/"implement later" appear. The only `// existing content` placeholder is in Task 13, where the engineer inserts the new component into an existing file — this is intentional, not a placeholder for missing logic.

3. **Type consistency:** `Finding`, `Recommendation`, `AnalysisSections`, `LatestAnalysisResponse`, `StackSnapshotItem`, `CURRENT_DISCLAIMER_VERSION`, `MANUAL_RERUN_DAILY_CAP`, `PROMPT_VERSION`, `ANALYSIS_MODEL` are defined in Task 3 and used unchanged in Tasks 4–13. `CatalogEntry` is defined in Task 5 and used in Tasks 6 and 9. `groundRecommendations` and `runStackAnalysis` keep the same signatures across producer (Tasks 5, 6) and consumer (Task 9).

---

## Out of scope (v2+)

These are tracked in the spec's Future work section and intentionally not in this plan:

- Mood correlation as additional prompt input
- DNA testing results as a context block
- Goal-setter ("what are you optimizing for?") + gaps section
- Stack at-a-glance summary score
- Today-page card surfacing meaningful stack changes since last analysis
- Community experiences (`experiences` table) as additional prompt input
