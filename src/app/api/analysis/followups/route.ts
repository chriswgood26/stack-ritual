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

  // Plan gate — Pro only (comped Pros included; no stripe_customer_id check here)
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

// Long-running model call.
export const maxDuration = 60;
