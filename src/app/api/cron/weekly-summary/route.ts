import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { sendWeeklySummaryEmail } from "@/lib/emails";
import { clerkClient } from "@clerk/nextjs/server";

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

  // Get all users with terms accepted and weekly summary enabled
  const { data: profiles } = await supabaseAdmin
    .from("user_profiles")
    .select("user_id, terms_accepted_at, email_weekly_summary")
    .not("terms_accepted_at", "is", null);

  let sent = 0;
  let errors = 0;
  const client = await clerkClient();

  for (const profile of profiles || []) {
    try {
      // Check weekly summary preference
      if (profile.email_weekly_summary === false) continue;

      // Check subscription
      const { data: sub } = await supabaseAdmin
        .from("subscriptions")
        .select("plan, status")
        .eq("user_id", profile.user_id)
        .single();

      if (!sub || !["plus", "pro"].includes(sub.plan) || sub.status !== "active") continue;

      // Get user email from Clerk
      const user = await client.users.getUser(profile.user_id);
      const email = user.emailAddresses?.[0]?.emailAddress;
      const firstName = user.firstName || "there";
      if (!email) continue;

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

      // Get streak
      const { data: streakLogs } = await supabaseAdmin
        .from("daily_logs")
        .select("logged_date")
        .eq("user_id", profile.user_id)
        .order("logged_date", { ascending: false })
        .limit(30);

      let streak = 0;
      if (streakLogs && streakLogs.length > 0) {
        const uniqueDates = [...new Set(streakLogs.map(l => l.logged_date))].sort().reverse();
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        let checkDate = yesterday.toISOString().split("T")[0];
        for (const d of uniqueDates) {
          if (d === checkDate) {
            streak++;
            const prev = new Date(checkDate);
            prev.setDate(prev.getDate() - 1);
            checkDate = prev.toISOString().split("T")[0];
          } else break;
        }
      }

      await sendWeeklySummaryEmail(email, firstName, {
        completionPct,
        perfectDays,
        totalCheckins,
        streak,
      });

      sent++;
    } catch (e) {
      console.error(`Error processing user ${profile.user_id}:`, e);
      errors++;
    }
  }

  return NextResponse.json({ message: "done", sent, errors });
}
