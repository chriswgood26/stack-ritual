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

// Map timing slots to profile time columns + which stack item timings feed them
const SLOT_MAP = [
  { key: "morning", column: "sms_morning_time", label: "morning", timings: ["morning-fasted", "morning-food"] },
  { key: "afternoon", column: "sms_afternoon_time", label: "afternoon", timings: ["afternoon"] },
  { key: "evening", column: "sms_evening_time", label: "evening", timings: ["evening"] },
  { key: "bedtime", column: "sms_bedtime_time", label: "bedtime", timings: ["bedtime"] },
] as const;

// Convert current instant to user-local "HH:MM" in 15-min bucket.
// Example: user in "America/Los_Angeles" at 08:07 PT → "08:00"
function userLocalBucket(tz: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(new Date());
  const hour = parts.find(p => p.type === "hour")?.value || "00";
  const minute = parts.find(p => p.type === "minute")?.value || "00";
  const bucketMin = Math.floor(parseInt(minute, 10) / 15) * 15;
  return `${hour}:${bucketMin.toString().padStart(2, "0")}`;
}

// Same-day "YYYY-MM-DD" in user's timezone
function userLocalDate(tz: string): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: tz });
}

export async function GET(req: NextRequest) {
  // Verify cron secret
  const authHeader = req.headers.get("authorization");
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let totalSent = 0;
  let errors = 0;
  let considered = 0;

  // Fetch all enabled, confirmed, non-opted-out users once
  const { data: profiles } = await supabaseAdmin
    .from("user_profiles")
    .select("user_id, phone_number, timezone, sms_morning_time, sms_afternoon_time, sms_evening_time, sms_bedtime_time")
    .eq("sms_enabled", true)
    .eq("sms_confirmed", true)
    .eq("sms_opted_out", false)
    .not("phone_number", "is", null);

  if (!profiles || profiles.length === 0) {
    return NextResponse.json({ message: "no enabled users", sent: 0 });
  }

  for (const profile of profiles) {
    considered++;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const p = profile as any;
    const tz = p.timezone || "America/Los_Angeles";
    const bucket = userLocalBucket(tz);

    // Which slot (if any) is due for this user right now?
    const dueSlot = SLOT_MAP.find(s => (p[s.column] || "") === bucket);
    if (!dueSlot) continue;

    try {
      // Pro subscription check
      const { data: sub } = await supabaseAdmin
        .from("subscriptions")
        .select("plan, status")
        .eq("user_id", p.user_id)
        .single();
      if (!sub || sub.plan !== "pro" || sub.status !== "active") continue;

      const today = userLocalDate(tz);

      // Active, non-paused stack items for this slot's timings
      const { data: stackItems } = await supabaseAdmin
        .from("user_stacks")
        .select("id, custom_name, dose, supplement:supplement_id(name)")
        .eq("user_id", p.user_id)
        .eq("is_active", true)
        .or("is_paused.is.null,is_paused.eq.false")
        .in("timing", dueSlot.timings);

      if (!stackItems || stackItems.length === 0) continue;

      // Filter out items already done today
      const { data: logs } = await supabaseAdmin
        .from("daily_logs")
        .select("stack_item_id")
        .eq("user_id", p.user_id)
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
      const token = generateToken(p.user_id, today, itemIds);
      const doneUrl = `${process.env.NEXT_PUBLIC_APP_URL}/done?uid=${p.user_id}&date=${today}&ids=${itemIds.join(",")}&t=${token}`;

      const message = `🌿 Stack Ritual: Time for your ${dueSlot.label} stack — ${itemList}.\n\nMark these all done: ${doneUrl}\n\nReply STOP to unsubscribe, HELP for help.`;

      const result = await sendSMS(p.phone_number!, message, { kind: "reminder", userId: p.user_id });
      if (result.ok) totalSent++;
      else errors++;
    } catch (e) {
      console.error(`Error sending to user ${p.user_id}:`, e);
      errors++;
    }
  }

  return NextResponse.json({ message: "done", considered, sent: totalSent, errors });
}
