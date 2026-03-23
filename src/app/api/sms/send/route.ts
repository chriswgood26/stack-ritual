import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { sendSMS } from "@/lib/twilio";
import crypto from "crypto";

function generateToken(userId: string, date: string, itemIds: string[]) {
  const secret = process.env.CLERK_SECRET_KEY!;
  const payload = `${userId}:${date}:${itemIds.join(",")}`;
  return crypto.createHmac("sha256", secret).update(payload).digest("hex").slice(0, 16);
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { timing_slot } = await req.json(); // morning-food, afternoon, evening, bedtime

  // Get user profile
  const { data: profile } = await supabaseAdmin
    .from("user_profiles")
    .select("phone_number, sms_enabled, sms_opted_out")
    .eq("user_id", userId)
    .single();

  if (!profile?.phone_number || !profile.sms_enabled || profile.sms_opted_out) {
    return NextResponse.json({ error: "SMS not enabled" }, { status: 400 });
  }

  // Get today's unchecked items for this slot
  const today = new Date().toISOString().split("T")[0];

  const { data: stackItems } = await supabaseAdmin
    .from("user_stacks")
    .select("id, custom_name, dose, supplement:supplement_id(name)")
    .eq("user_id", userId)
    .eq("is_active", true)
    .eq("timing", timing_slot);

  if (!stackItems || stackItems.length === 0) {
    return NextResponse.json({ message: "no items for this slot" });
  }

  // Check which are already done
  const { data: logs } = await supabaseAdmin
    .from("daily_logs")
    .select("stack_item_id")
    .eq("user_id", userId)
    .eq("logged_date", today);

  const doneIds = new Set((logs || []).map((l: { stack_item_id: string }) => l.stack_item_id));
  const pending = stackItems.filter(i => !doneIds.has(i.id));

  if (pending.length === 0) {
    return NextResponse.json({ message: "all done already" });
  }

  // Build item list
  const itemNames = pending.map(i => {
    const supp = Array.isArray(i.supplement) ? i.supplement[0] : i.supplement;
    return supp?.name || i.custom_name || "Unknown";
  }).join(", ");

  // Generate click-to-complete token
  const itemIds = pending.map(i => i.id);
  const token = generateToken(userId, today, itemIds);
  const doneUrl = `${process.env.NEXT_PUBLIC_APP_URL}/done?uid=${userId}&date=${today}&ids=${itemIds.join(",")}&t=${token}`;

  const slotLabel: Record<string, string> = {
    "morning-fasted": "morning (fasted)",
    "morning-food": "morning",
    "afternoon": "afternoon",
    "evening": "evening",
    "bedtime": "bedtime",
  };

  const message = `🌿 Stack Ritual: Time for your ${slotLabel[timing_slot] || timing_slot} stack: ${itemNames}. Tap to mark done: ${doneUrl}\n\nReply STOP to unsubscribe.`;

  await sendSMS(profile.phone_number, message);

  return NextResponse.json({ message: "sent", count: pending.length });
}
