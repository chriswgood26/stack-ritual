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

  const stackItemIds = [...new Set(items.map((i: { stack_item_id: string }) => i.stack_item_id))] as string[];

  // Load existing logs for the day so we only insert/delete what actually changes
  const { data: existingLogs } = await supabaseAdmin
    .from("daily_logs")
    .select("stack_item_id, dose_index")
    .eq("user_id", userId)
    .eq("logged_date", date)
    .in("stack_item_id", stackItemIds);

  const existingKeys = new Set((existingLogs || []).map(l => `${l.stack_item_id}_${l.dose_index}`));

  // Load stack items once to read auto_decrement / doses_per_serving / quantity_remaining
  const { data: stackItemsData } = await supabaseAdmin
    .from("user_stacks")
    .select("id, auto_decrement, doses_per_serving, quantity_remaining")
    .in("id", stackItemIds)
    .eq("user_id", userId);
  const stackItemMap = new Map((stackItemsData || []).map(s => [s.id, s]));

  if (checked) {
    // Insert only the logs that don't yet exist (so we don't double-decrement)
    const newItems = (items as { stack_item_id: string; dose_index: number }[])
      .filter(i => !existingKeys.has(`${i.stack_item_id}_${i.dose_index ?? 0}`));

    if (newItems.length > 0) {
      const logsToInsert = newItems.map(i => ({
        user_id: userId,
        stack_item_id: i.stack_item_id,
        logged_date: date,
        dose_index: i.dose_index ?? 0,
        taken_at: new Date().toISOString(),
      }));

      const { error } = await supabaseAdmin.from("daily_logs").insert(logsToInsert);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });

      // Decrement inventory once per newly-inserted log
      const decrementCounts = new Map<string, number>();
      for (const i of newItems) {
        decrementCounts.set(i.stack_item_id, (decrementCounts.get(i.stack_item_id) || 0) + 1);
      }
      for (const [stackId, count] of decrementCounts) {
        const s = stackItemMap.get(stackId);
        if (!s?.auto_decrement || s.quantity_remaining === null || s.quantity_remaining === undefined) continue;
        const dps = s.doses_per_serving || 1;
        const newQty = Math.max(0, s.quantity_remaining - count * dps);
        await supabaseAdmin
          .from("user_stacks")
          .update({ quantity_remaining: newQty, quantity_updated_at: new Date().toISOString() })
          .eq("id", stackId)
          .eq("user_id", userId);
      }
    }
  } else {
    // Only delete (and re-increment for) logs that exist
    const toRemove = (items as { stack_item_id: string; dose_index: number }[])
      .filter(i => existingKeys.has(`${i.stack_item_id}_${i.dose_index ?? 0}`));

    if (toRemove.length > 0) {
      // Delete each matching log (dose_index specific)
      for (const i of toRemove) {
        await supabaseAdmin
          .from("daily_logs")
          .delete()
          .eq("user_id", userId)
          .eq("logged_date", date)
          .eq("stack_item_id", i.stack_item_id)
          .eq("dose_index", i.dose_index ?? 0);
      }

      const incrementCounts = new Map<string, number>();
      for (const i of toRemove) {
        incrementCounts.set(i.stack_item_id, (incrementCounts.get(i.stack_item_id) || 0) + 1);
      }
      for (const [stackId, count] of incrementCounts) {
        const s = stackItemMap.get(stackId);
        if (!s?.auto_decrement || s.quantity_remaining === null || s.quantity_remaining === undefined) continue;
        const dps = s.doses_per_serving || 1;
        const newQty = s.quantity_remaining + count * dps;
        await supabaseAdmin
          .from("user_stacks")
          .update({ quantity_remaining: newQty, quantity_updated_at: new Date().toISOString() })
          .eq("id", stackId)
          .eq("user_id", userId);
      }
    }
  }

  return NextResponse.json({ message: "ok", count: items.length });
}
