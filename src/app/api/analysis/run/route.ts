import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabase, supabaseAdmin } from "@/lib/supabase";
import {
  CURRENT_DISCLAIMER_VERSION,
  type AnalysisRunTrigger,
  type AnalysisUserContext,
  type StackSnapshotItem,
} from "@/lib/analysis-types";
import { birthYearToAgeBand } from "@/lib/age-band";
import { changesSummaryHasChanges, diffSnapshot } from "@/lib/analysis-diff";
import { runStackAnalysis } from "@/lib/analysis";
import type { CatalogEntry } from "@/lib/analysis-grounding";

type StackRow = {
  supplement_id: string | null;
  custom_name: string | null;
  dose: string | null;
  timing: string | null;
  frequency_type: string | null;
  brand: string | null;
  notes: string | null;
  supplement: { name: string } | null;
};

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
    .select("analysis_disclaimer_version, sex, birth_year")
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

  // Load active, non-paused stack (joined to supplements for name)
  const { data: stackRowsRaw } = await supabaseAdmin
    .from("user_stacks")
    .select(
      "supplement_id, custom_name, dose, timing, frequency_type, brand, notes, supplement:supplement_id(name)",
    )
    .eq("user_id", userId)
    .eq("is_active", true)
    .eq("is_paused", false);

  const stackRows = (stackRowsRaw ?? []) as unknown as StackRow[];

  const stack: StackSnapshotItem[] = stackRows.map(r => ({
    supplement_id: r.supplement_id ?? null,
    name: r.supplement?.name ?? r.custom_name ?? "",
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

  // Load catalog (for grounding). Public read on `supplements` is fine.
  const { data: catalogRows } = await supabase
    .from("supplements")
    .select("id, name, slug");
  const catalog: CatalogEntry[] = catalogRows ?? [];

  const userContext: AnalysisUserContext | null = profile
    ? {
        sex: (profile.sex as "male" | "female" | null) ?? null,
        age_band: birthYearToAgeBand(profile.birth_year),
      }
    : null;

  // Call the model
  let result;
  try {
    result = await runStackAnalysis(stack, catalog, userContext);
  } catch (e) {
    const detail =
      e instanceof Error ? `${e.name}: ${e.message}` : String(e);
    console.error("[analysis/run] LLM call failed —", detail, e);
    return NextResponse.json(
      {
        error: "analysis_failed",
        detail: process.env.NODE_ENV === "production" ? undefined : detail,
      },
      { status: 500 },
    );
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

// Long-running model call — give power users with large stacks room
// to finish. Vercel Pro caps this at 300s.
export const maxDuration = 180;
