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
