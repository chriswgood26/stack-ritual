import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function PATCH(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { stack_item_id, date, time, dose_index = 0 } = await req.json();

  if (!stack_item_id || !date || !time) {
    return NextResponse.json({ error: "stack_item_id, date, and time required" }, { status: 400 });
  }

  // Prevent editing today or future dates via this endpoint (use checkoff for today)
  // Build taken_at from date + time (HH:MM)
  const taken_at = new Date(`${date}T${time}:00`).toISOString();

  const { error } = await supabaseAdmin
    .from("daily_logs")
    .update({ taken_at })
    .eq("user_id", userId)
    .eq("stack_item_id", stack_item_id)
    .eq("logged_date", date)
    .eq("dose_index", dose_index);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ message: "ok" });
}
