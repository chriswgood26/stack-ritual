import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import {
  CURRENT_DISCLAIMER_VERSION,
  MANUAL_RERUN_DAILY_CAP,
  type LatestAnalysisResponse,
  type StackSnapshotItem,
} from "@/lib/analysis-types";
import { changesSummaryHasChanges, diffSnapshot } from "@/lib/analysis-diff";

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

  // Current active, non-paused stack — joined to supplements for name
  const { data: stackRowsRaw } = await supabaseAdmin
    .from("user_stacks")
    .select(
      "supplement_id, custom_name, dose, timing, frequency_type, brand, notes, supplement:supplement_id(name)",
    )
    .eq("user_id", userId)
    .eq("is_active", true)
    .eq("is_paused", false);

  const stackRows = (stackRowsRaw ?? []) as unknown as StackRow[];

  const currentStack: StackSnapshotItem[] = stackRows.map(r => ({
    supplement_id: r.supplement_id ?? null,
    name: r.supplement?.name ?? r.custom_name ?? "",
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
