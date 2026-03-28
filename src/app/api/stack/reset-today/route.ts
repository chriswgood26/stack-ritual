import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const today = new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD

  const { error } = await supabaseAdmin
    .from("daily_logs")
    .delete()
    .eq("user_id", userId)
    .eq("logged_date", today);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ message: "Reset complete" });
}
