import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { stack_item_id, date, checked, dose_index = 0 } = await req.json();

  if (!stack_item_id || !date) {
    return NextResponse.json({ error: "stack_item_id and date required" }, { status: 400 });
  }

  if (checked) {
    const { error } = await supabaseAdmin
      .from("daily_logs")
      .upsert({
        user_id: userId,
        stack_item_id,
        logged_date: date,
        dose_index,
        taken_at: new Date().toISOString(),
      }, { onConflict: "user_id,stack_item_id,logged_date,dose_index" });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else {
    const { error } = await supabaseAdmin
      .from("daily_logs")
      .delete()
      .eq("user_id", userId)
      .eq("stack_item_id", stack_item_id)
      .eq("logged_date", date)
      .eq("dose_index", dose_index);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ message: "ok" });
}
