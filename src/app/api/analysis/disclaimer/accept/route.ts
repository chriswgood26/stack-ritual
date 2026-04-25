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
