import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

const TERMS_VERSION = "1.0";

export async function POST() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await supabaseAdmin.from("user_profiles").upsert({
    user_id: userId,
    terms_accepted_at: new Date().toISOString(),
    terms_version: TERMS_VERSION,
  }, { onConflict: "user_id" });

  return NextResponse.json({ message: "accepted" });
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ accepted: false });

  const { data } = await supabaseAdmin
    .from("user_profiles")
    .select("terms_accepted_at, terms_version")
    .eq("user_id", userId)
    .single();

  return NextResponse.json({
    accepted: !!data?.terms_accepted_at && data?.terms_version === TERMS_VERSION,
    acceptedAt: data?.terms_accepted_at,
  });
}
