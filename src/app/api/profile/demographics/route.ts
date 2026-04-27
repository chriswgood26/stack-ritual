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
