import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");
  if (!date) return NextResponse.json({ error: "date required" }, { status: 400 });

  const [{ data: logs }, { data: mood }] = await Promise.all([
    supabaseAdmin
      .from("daily_logs")
      .select("stack_item_id, dose_index, taken_at, stack_item:stack_item_id(custom_name, dose, category, custom_icon, supplement:supplement_id(name, icon))")
      .eq("user_id", userId)
      .eq("logged_date", date),
    supabaseAdmin
      .from("daily_mood")
      .select("mood_score, notes")
      .eq("user_id", userId)
      .eq("logged_date", date)
      .single(),
  ]);

  return NextResponse.json({ logs: logs || [], mood: mood || null });
}
