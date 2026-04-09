import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { sendSMS } from "@/lib/twilio";

// Send a test SMS to the user's own confirmed number.
// Requires: sms_enabled, sms_confirmed, not opted out.
export async function POST() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabaseAdmin
    .from("user_profiles")
    .select("phone_number, sms_enabled, sms_confirmed, sms_opted_out")
    .eq("user_id", userId)
    .single() as {
      data: {
        phone_number: string | null;
        sms_enabled: boolean;
        sms_confirmed: boolean;
        sms_opted_out: boolean;
      } | null;
    };

  if (!profile?.phone_number) {
    return NextResponse.json({ error: "No phone number on file" }, { status: 400 });
  }
  if (!profile.sms_enabled || profile.sms_opted_out) {
    return NextResponse.json({ error: "SMS is disabled for your account" }, { status: 400 });
  }
  if (!profile.sms_confirmed) {
    return NextResponse.json({ error: "Number not confirmed yet. Reply YES to the confirmation text first." }, { status: 400 });
  }

  const result = await sendSMS(
    profile.phone_number,
    "🌿 Stack Ritual test message — your SMS reminders are working! Reply STOP to unsubscribe.",
    { kind: "test", userId },
  );

  if (!result.ok) {
    return NextResponse.json({ error: result.error || "Failed to send" }, { status: 500 });
  }
  return NextResponse.json({ ok: true, sid: result.sid });
}
