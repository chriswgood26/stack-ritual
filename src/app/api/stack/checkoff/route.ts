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

  // Get stack item for auto-decrement
  const { data: stackItem } = await supabaseAdmin
    .from("user_stacks")
    .select("auto_decrement, doses_per_serving, quantity_remaining")
    .eq("id", stack_item_id)
    .eq("user_id", userId)
    .single();

  if (checked) {
    // Delete first, then insert
    await supabaseAdmin
      .from("daily_logs")
      .delete()
      .eq("user_id", userId)
      .eq("stack_item_id", stack_item_id)
      .eq("logged_date", date)
      .eq("dose_index", dose_index);

    const { error } = await supabaseAdmin
      .from("daily_logs")
      .insert({
        user_id: userId,
        stack_item_id,
        logged_date: date,
        dose_index,
        taken_at: new Date().toISOString(),
      });

    if (error) {
      console.error("Checkoff insert error:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Auto-decrement quantity if enabled
    let newQuantityRemaining: number | null = null;
    if (stackItem?.auto_decrement && stackItem?.quantity_remaining !== null && stackItem?.quantity_remaining !== undefined) {
      const dosesPerServing = stackItem.doses_per_serving || 1;
      newQuantityRemaining = Math.max(0, stackItem.quantity_remaining - dosesPerServing);
      await supabaseAdmin
        .from("user_stacks")
        .update({ quantity_remaining: newQuantityRemaining, quantity_updated_at: new Date().toISOString() })
        .eq("id", stack_item_id)
        .eq("user_id", userId);
    }
    return NextResponse.json({ message: "ok", quantity_remaining: newQuantityRemaining });
  } else {
    await supabaseAdmin
      .from("daily_logs")
      .delete()
      .eq("user_id", userId)
      .eq("stack_item_id", stack_item_id)
      .eq("logged_date", date)
      .eq("dose_index", dose_index);

    // Re-increment if unchecking
    let newQuantityRemaining: number | null = null;
    if (stackItem?.auto_decrement && stackItem?.quantity_remaining !== null && stackItem?.quantity_remaining !== undefined) {
      const dosesPerServing = stackItem.doses_per_serving || 1;
      newQuantityRemaining = stackItem.quantity_remaining + dosesPerServing;
      await supabaseAdmin
        .from("user_stacks")
        .update({ quantity_remaining: newQuantityRemaining, quantity_updated_at: new Date().toISOString() })
        .eq("id", stack_item_id)
        .eq("user_id", userId);
    }
    return NextResponse.json({ message: "ok", quantity_remaining: newQuantityRemaining });
  }
}
