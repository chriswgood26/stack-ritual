import { auth, currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getToday } from "@/lib/timezone";

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const range = parseInt(searchParams.get("range") || "30");

  const today = await getToday();
  const cutoff = new Date(today);
  cutoff.setDate(cutoff.getDate() - range);
  const cutoffStr = cutoff.toISOString().split("T")[0];

  const user = await currentUser();
  const userName = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "";

  // Fetch mood data
  const { data: moods } = await supabaseAdmin
    .from("daily_mood")
    .select("logged_date, mood_score, notes")
    .eq("user_id", userId)
    .gte("logged_date", cutoffStr)
    .lte("logged_date", today)
    .order("logged_date", { ascending: true });

  // Fetch supplement completion data
  const { data: logs } = await supabaseAdmin
    .from("daily_logs")
    .select("logged_date, stack_item_id")
    .eq("user_id", userId)
    .gte("logged_date", cutoffStr)
    .lte("logged_date", today);

  const { count: stackSize } = await supabaseAdmin
    .from("user_stacks")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_active", true);

  const totalStack = stackSize || 1;

  // Build completion by date
  const logsByDate: Record<string, number> = {};
  (logs || []).forEach(l => {
    logsByDate[l.logged_date] = (logsByDate[l.logged_date] || 0) + 1;
  });

  // Combine mood + completion
  const days = (moods || []).map(m => ({
    date: m.logged_date,
    score: m.mood_score,
    notes: m.notes || null,
    completionPct: Math.round(((logsByDate[m.logged_date] || 0) / totalStack) * 100),
  }));

  return NextResponse.json({ days, userName });
}
