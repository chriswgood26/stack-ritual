import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { sendDailyReminderEmail } from "@/lib/emails";
import { clerkClient } from "@clerk/nextjs/server";
import crypto from "crypto";

const CRON_SECRET = process.env.CRON_SECRET;

// Map slot names to the timing values stored in user_stacks
const SLOT_TIMINGS: Record<string, string[]> = {
  morning: ["morning-fasted", "morning-food"],
  afternoon: ["afternoon"],
  evening: ["evening"],
  bedtime: ["bedtime"],
};

function generateToken(userId: string, date: string, itemIds: string[]) {
  const secret = process.env.CLERK_SECRET_KEY!;
  const payload = `${userId}:${date}:${itemIds.join(",")}`;
  return crypto.createHmac("sha256", secret).update(payload).digest("hex").slice(0, 16);
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Determine which timing slot to send reminders for.
  // Pass ?slot=morning|afternoon|evening|bedtime, or defaults to "morning".
  const { searchParams } = new URL(req.url);
  const slot = searchParams.get("slot") || "morning";
  const timings = SLOT_TIMINGS[slot] ?? SLOT_TIMINGS.morning;

  const now = new Date();
  const today = now.toISOString().split("T")[0];

  // Get all users with email reminders enabled
  const { data: profiles } = await supabaseAdmin
    .from("user_profiles")
    .select("user_id, email_reminders_enabled")
    .eq("email_reminders_enabled", true);

  let sent = 0;
  let errors = 0;
  const client = await clerkClient();

  for (const profile of profiles || []) {
    try {
      // Check subscription — Plus or Pro required for email reminders
      const { data: sub } = await supabaseAdmin
        .from("subscriptions")
        .select("plan, status")
        .eq("user_id", profile.user_id)
        .single();

      if (!sub || !["plus", "pro"].includes(sub.plan) || sub.status !== "active") continue;

      // Get active stack items for this timing slot only
      const { data: stackItems } = await supabaseAdmin
        .from("user_stacks")
        .select("id, custom_name, dose, timing, supplement:supplement_id(name)")
        .eq("user_id", profile.user_id)
        .eq("is_active", true)
        .in("timing", timings);

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

      // Get user email from Clerk
      const user = await client.users.getUser(profile.user_id);
      const email = user.emailAddresses?.[0]?.emailAddress;
      const firstName = user.firstName || "there";
      if (!email) continue;

      // Build item list for email
      const items = pending.map(i => {
        const supp = Array.isArray(i.supplement) ? i.supplement[0] : i.supplement;
        return {
          name: supp?.name || i.custom_name || "Supplement",
          timing: i.timing || slot,
          dose: i.dose || undefined,
        };
      });

      // Generate done URL
      const itemIds = pending.map(i => i.id);
      const token = generateToken(profile.user_id, today, itemIds);
      const doneUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://stackritual.com"}/done?uid=${profile.user_id}&date=${today}&ids=${itemIds.join(",")}&t=${token}`;

      await sendDailyReminderEmail(email, firstName, items, doneUrl);
      sent++;
    } catch (e) {
      console.error(`Error sending daily reminder to ${profile.user_id}:`, e);
      errors++;
    }
  }

  return NextResponse.json({ message: "done", slot, sent, errors });
}
