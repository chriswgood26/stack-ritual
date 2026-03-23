import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { sendSMS } from "@/lib/twilio";
import crypto from "crypto";

// Vercel cron secret for security
const CRON_SECRET = process.env.CRON_SECRET;

function generateToken(userId: string, date: string, itemIds: string[]) {
  const secret = process.env.CLERK_SECRET_KEY!;
  const payload = `${userId}:${date}:${itemIds.join(",")}`;
  return crypto.createHmac("sha256", secret).update(payload).digest("hex").slice(0, 16);
}

// Map timing slots to profile time columns
const SLOT_MAP: Record<string, { column: string; label: string; timings: string[] }> = {
  morning: {
    column: "sms_morning_time",
    label: "morning",
    timings: ["morning-fasted", "morning-food"],
  },
  afternoon: {
    column: "sms_afternoon_time",
    label: "afternoon",
    timings: ["afternoon"],
  },
  evening: {
    column: "sms_evening_time",
    label: "evening",
    timings: ["evening"],
  },
  bedtime: {
    column: "sms_bedtime_time",
    label: "bedtime",
    timings: ["bedtime"],
  },
};

export async function GET(req: NextRequest) {
  // Verify cron secret
  const authHeader = req.headers.get("authorization");
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const today = now.toISOString().split("T")[0];

  // Current time in HH:MM format — check against user's timezone
  // For now we use UTC and users set times in their local time
  // We check within a 15-minute window
  const currentHour = now.getUTCHours().toString().padStart(2, "0");
  const currentMin = now.getUTCMinutes();
  const currentMinRounded = Math.floor(currentMin / 15) * 15; // round to nearest 15
  const currentTime = `${currentHour}:${currentMinRounded.toString().padStart(2, "0")}`;

  console.log(`SMS Cron running at ${currentTime} UTC`);

  let totalSent = 0;
  let errors = 0;

  // Check each slot
  for (const [slotKey, slot] of Object.entries(SLOT_MAP)) {
    // Find users whose reminder time matches current time window
    const { data: profiles } = await supabaseAdmin
      .from("user_profiles")
      .select("user_id, phone_number, sms_morning_time, sms_afternoon_time, sms_evening_time, sms_bedtime_time")
      .eq("sms_enabled", true)
      .eq("sms_opted_out", false)
      .not("phone_number", "is", null)
      .eq(slot.column, currentTime);

    if (!profiles || profiles.length === 0) continue;

    console.log(`Found ${profiles.length} users for ${slotKey} slot at ${currentTime}`);

    for (const profile of profiles) {
      try {
        // Check subscription — only Pro users get SMS
        const { data: sub } = await supabaseAdmin
          .from("subscriptions")
          .select("plan, status")
          .eq("user_id", profile.user_id)
          .single();

        if (!sub || sub.plan !== "pro" || sub.status !== "active") continue;

        // Get pending stack items for these timing slots
        const { data: stackItems } = await supabaseAdmin
          .from("user_stacks")
          .select("id, custom_name, dose, supplement:supplement_id(name)")
          .eq("user_id", profile.user_id)
          .eq("is_active", true)
          .in("timing", slot.timings);

        if (!stackItems || stackItems.length === 0) continue;

        // Check which are already done today
        const { data: logs } = await supabaseAdmin
          .from("daily_logs")
          .select("stack_item_id")
          .eq("user_id", profile.user_id)
          .eq("logged_date", today)
          .in("stack_item_id", stackItems.map(i => i.id));

        const doneIds = new Set((logs || []).map((l: { stack_item_id: string }) => l.stack_item_id));
        const pending = stackItems.filter(i => !doneIds.has(i.id));

        if (pending.length === 0) continue;

        // Build message
        const itemNames = pending.slice(0, 4).map(i => {
          const supp = Array.isArray(i.supplement) ? i.supplement[0] : i.supplement;
          return supp?.name || i.custom_name || "supplement";
        }).join(", ");

        const moreCount = pending.length - 4;
        const itemList = moreCount > 0 ? `${itemNames} +${moreCount} more` : itemNames;

        const itemIds = pending.map(i => i.id);
        const token = generateToken(profile.user_id, today, itemIds);
        const doneUrl = `${process.env.NEXT_PUBLIC_APP_URL}/done?uid=${profile.user_id}&date=${today}&ids=${itemIds.join(",")}&t=${token}`;

        const message = `🌿 Stack Ritual: Time for your ${slot.label} stack — ${itemList}.\n\nMark all done: ${doneUrl}\n\nReply STOP to unsubscribe.`;

        await sendSMS(profile.phone_number!, message);
        totalSent++;
        console.log(`Sent ${slotKey} reminder to user ${profile.user_id.slice(0, 8)}...`);

      } catch (e) {
        console.error(`Error sending to user ${profile.user_id}:`, e);
        errors++;
      }
    }
  }

  return NextResponse.json({
    message: "done",
    time: currentTime,
    sent: totalSent,
    errors,
  });
}
