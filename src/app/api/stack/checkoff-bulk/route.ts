import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { items, date, checked } = await req.json();
  // items: [{ stack_item_id, dose_index }]

  if (!items?.length || !date) {
    return NextResponse.json({ error: "items and date required" }, { status: 400 });
  }

  if (checked) {
    // Delete existing then bulk insert
    const stackItemIds = [...new Set(items.map((i: { stack_item_id: string }) => i.stack_item_id))];
    
    await supabaseAdmin
      .from("daily_logs")
      .delete()
      .eq("user_id", userId)
      .eq("logged_date", date)
      .in("stack_item_id", stackItemIds);

    const logsToInsert = items.map((item: { stack_item_id: string; dose_index: number }) => ({
      user_id: userId,
      stack_item_id: item.stack_item_id,
      logged_date: date,
      dose_index: item.dose_index ?? 0,
      taken_at: new Date().toISOString(),
    }));

    const { error } = await supabaseAdmin.from("daily_logs").insert(logsToInsert);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else {
    const stackItemIds = [...new Set(items.map((i: { stack_item_id: string }) => i.stack_item_id))];
    await supabaseAdmin
      .from("daily_logs")
      .delete()
      .eq("user_id", userId)
      .eq("logged_date", date)
      .in("stack_item_id", stackItemIds);
  }

  return NextResponse.json({ message: "ok", count: items.length });
}
