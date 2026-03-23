import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { sendWeeklySummaryEmail } from "@/lib/emails";

const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Only run on Mondays
  const now = new Date();
  if (now.getUTCDay() !== 1) {
    return NextResponse.json({ message: "Not Monday, skipping" });
  }

  // Get all Plus/Pro users with email preferences enabled
  const { data: profiles } = await supabaseAdmin
    .from("user_profiles")
    .select("user_id, terms_accepted_at")
    .not("terms_accepted_at", "is", null);

  let sent = 0;

  for (const profile of profiles || []) {
    try {
      // Check subscription
      const { data: sub } = await supabaseAdmin
        .from("subscriptions")
        .select("plan, status")
        .eq("user_id", profile.user_id)
        .single();

      if (!sub || !["plus", "pro"].includes(sub.plan) || sub.status !== "active") continue;

      // Calculate last 7 days stats
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const startDate = sevenDaysAgo.toISOString().split("T")[0];
      const today = now.toISOString().split("T")[0];

      const { data: logs } = await supabaseAdmin
        .from("daily_logs")
        .select("logged_date, stack_item_id")
        .eq("user_id", profile.user_id)
        .gte("logged_date", startDate)
        .lt("logged_date", today);

      const { count: stackSize } = await supabaseAdmin
        .from("user_stacks")
        .select("*", { count: "exact", head: true })
        .eq("user_id", profile.user_id)
        .eq("is_active", true);

      const logsByDate: Record<string, number> = {};
      (logs || []).forEach(l => { logsByDate[l.logged_date] = (logsByDate[l.logged_date] || 0) + 1; });

      const totalStack = stackSize || 1;
      const totalCheckins = Object.values(logsByDate).reduce((a, b) => a + b, 0);
      const activeDays = Object.keys(logsByDate).length;
      const perfectDays = Object.values(logsByDate).filter(c => c >= totalStack).length;
      const completionPct = activeDays > 0 ? Math.round((totalCheckins / (activeDays * totalStack)) * 100) : 0;

      // Get user email from Clerk (skip for now — use profile data)
      // For MVP, skip users without email — we'll add Clerk lookup later
      sent++;
    } catch (e) {
      console.error(`Error processing user ${profile.user_id}:`, e);
    }
  }

  return NextResponse.json({ message: "done", sent });
}
