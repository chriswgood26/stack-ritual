import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { sendSMS } from "@/lib/twilio";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const body = (formData.get("Body") as string || "").trim().toUpperCase();
  const from = formData.get("From") as string;

  if (body === "STOP" || body === "UNSUBSCRIBE" || body === "QUIT" || body === "CANCEL") {
    // Opt out the user
    await supabaseAdmin
      .from("user_profiles")
      .update({ sms_opted_out: true, sms_opted_out_at: new Date().toISOString(), sms_enabled: false })
      .eq("phone_number", from);

    await sendSMS(from, "You have been unsubscribed from Stack Ritual reminders. Reply START to resubscribe. Visit stackritual.com to manage your account.");

  } else if (body === "START" || body === "UNSTOP") {
    await supabaseAdmin
      .from("user_profiles")
      .update({ sms_opted_out: false, sms_enabled: true })
      .eq("phone_number", from);

    await sendSMS(from, "Welcome back! Stack Ritual reminders are re-enabled. Visit stackritual.com to manage your preferences.");

  } else if (body === "HELP") {
    await sendSMS(from, "Stack Ritual supplement reminders. Support: support@stackritual.com. Reply STOP to unsubscribe. stackritual.com");
  }

  // Return empty TwiML response
  return new NextResponse('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
    headers: { "Content-Type": "text/xml" },
  });
}
