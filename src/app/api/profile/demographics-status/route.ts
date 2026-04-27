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
