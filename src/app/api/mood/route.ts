import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { mood_score, date, notes } = await req.json();
  if (!mood_score || !date) return NextResponse.json({ error: "mood_score and date required" }, { status: 400 });

  // Delete existing then insert
  await supabaseAdmin.from("daily_mood").delete().eq("user_id", userId).eq("logged_date", date);
  const { error } = await supabaseAdmin.from("daily_mood").insert({ user_id: userId, logged_date: date, mood_score, notes: notes || null });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ message: "saved" });
}
