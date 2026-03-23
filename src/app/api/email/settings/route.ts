import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data } = await supabaseAdmin
    .from("user_profiles")
    .select("email_reminders_enabled, email_weekly_summary, email_marketing")
    .eq("user_id", userId)
    .single();

  return NextResponse.json({ settings: data });
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { email_reminders_enabled, email_weekly_summary, email_marketing } = await req.json();

  await supabaseAdmin.from("user_profiles").upsert({
    user_id: userId,
    email_reminders_enabled: !!email_reminders_enabled,
    email_weekly_summary: !!email_weekly_summary,
    email_marketing: !!email_marketing,
  }, { onConflict: "user_id" });

  return NextResponse.json({ message: "saved" });
}
