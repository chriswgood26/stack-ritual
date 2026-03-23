import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { phone_number, sms_enabled, sms_morning_time, sms_afternoon_time, sms_evening_time, sms_bedtime_time } = await req.json();

  // Format phone to E.164
  const formatted = phone_number?.replace(/\D/g, "");
  const e164 = formatted ? (formatted.startsWith("1") ? `+${formatted}` : `+1${formatted}`) : null;

  const { error } = await supabaseAdmin
    .from("user_profiles")
    .upsert({
      user_id: userId,
      phone_number: e164,
      sms_enabled: !!sms_enabled,
      sms_morning_time: sms_morning_time || "08:00",
      sms_afternoon_time: sms_afternoon_time || "13:00",
      sms_evening_time: sms_evening_time || "19:00",
      sms_bedtime_time: sms_bedtime_time || "21:00",
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ message: "saved" });
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data } = await supabaseAdmin
    .from("user_profiles")
    .select("phone_number, sms_enabled, sms_morning_time, sms_afternoon_time, sms_evening_time, sms_bedtime_time, sms_opted_out")
    .eq("user_id", userId)
    .single();

  return NextResponse.json({ settings: data });
}
