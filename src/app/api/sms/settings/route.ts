import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { sendSMS } from "@/lib/twilio";

// The exact text the user must agree to — version-tracked so we can prove
// which disclosure they accepted if there's ever a TCPA complaint.
export const SMS_CONSENT_TEXT = "By enabling SMS reminders, I agree to receive recurring automated text messages from Stack Ritual at the phone number provided, including reminders for my chosen stack times. Consent is not a condition of purchase. Message frequency varies by my reminder settings. Msg & data rates may apply. Reply STOP to unsubscribe, HELP for help. See stackritual.com/terms and stackritual.com/privacy.";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { phone_number, sms_enabled, sms_morning_time, sms_afternoon_time, sms_evening_time, sms_bedtime_time, consent } = await req.json();

  // Format phone to E.164
  const formatted = phone_number?.replace(/\D/g, "");
  const e164 = formatted ? (formatted.startsWith("1") ? `+${formatted}` : `+1${formatted}`) : null;

  // If the user is trying to enable SMS, require fresh consent + a phone number
  if (sms_enabled && !e164) {
    return NextResponse.json({ error: "Phone number required to enable SMS" }, { status: 400 });
  }
  if (sms_enabled && !consent) {
    return NextResponse.json({ error: "You must agree to the SMS consent terms to enable reminders" }, { status: 400 });
  }

  // Fetch existing row so we only update consent columns when the user is newly opting in
  const { data: existing } = await supabaseAdmin
    .from("user_profiles")
    .select("sms_consent_at, phone_number")
    .eq("user_id", userId)
    .single() as { data: { sms_consent_at: string | null; phone_number: string | null } | null };

  const consentIsNew = sms_enabled && (!existing?.sms_consent_at || existing.phone_number !== e164);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updates: Record<string, any> = {
    user_id: userId,
    phone_number: e164,
    sms_enabled: !!sms_enabled,
    sms_morning_time: sms_morning_time || "08:00",
    sms_afternoon_time: sms_afternoon_time || "13:00",
    sms_evening_time: sms_evening_time || "19:00",
    sms_bedtime_time: sms_bedtime_time || "21:00",
    updated_at: new Date().toISOString(),
  };

  if (consentIsNew) {
    // Capture proof-of-consent — timestamp, IP, and the exact language they agreed to
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      || req.headers.get("x-real-ip")
      || null;
    updates.sms_consent_at = new Date().toISOString();
    updates.sms_consent_ip = ip;
    updates.sms_consent_text = SMS_CONSENT_TEXT;
    // Newly opting in — they haven't confirmed via double opt-in yet
    updates.sms_confirmed = false;
    updates.sms_confirmation_sent_at = new Date().toISOString();
  }

  if (!sms_enabled) {
    // Disabling — don't reset consent history, but clear confirmation so they'd re-confirm
    updates.sms_confirmed = false;
  }

  const { error } = await supabaseAdmin
    .from("user_profiles")
    .upsert(updates, { onConflict: "user_id" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Fire confirmation SMS for double opt-in. Non-blocking — if Twilio fails
  // we still save their settings; they can retry from the UI.
  if (consentIsNew && e164) {
    try {
      await sendSMS(
        e164,
        "Stack Ritual: Reply YES to confirm you want to receive reminder texts. Msg frequency varies. Msg & data rates may apply. Reply STOP to cancel, HELP for help.",
        { kind: "confirmation", userId },
      );
    } catch (e) {
      console.error("Failed to send confirmation SMS:", e);
    }
  }

  return NextResponse.json({ message: "saved", consentCaptured: consentIsNew });
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data } = await supabaseAdmin
    .from("user_profiles")
    .select("phone_number, sms_enabled, sms_morning_time, sms_afternoon_time, sms_evening_time, sms_bedtime_time, sms_opted_out, sms_confirmed, sms_consent_at")
    .eq("user_id", userId)
    .single();

  return NextResponse.json({ settings: data });
}
