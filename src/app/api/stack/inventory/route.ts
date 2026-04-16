import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { item_id, quantity_total, quantity_remaining, quantity_unit, low_supply_alert, resupply_ordered } = await req.json();
  if (!item_id) return NextResponse.json({ error: "item_id required" }, { status: 400 });

  // Resolve the final remaining qty so we can decide whether to enable auto_decrement.
  // `??` preserves 0 (distinct from undefined/null fallback).
  const resolvedRemaining =
    typeof quantity_remaining === "number"
      ? quantity_remaining
      : typeof quantity_total === "number"
        ? quantity_total
        : null;

  // Only update quantity_total when the client actually sent one — avoids clobbering
  // an existing total when the badge modal doesn't have it to send back.
  const updatePayload: Record<string, unknown> = {
    quantity_remaining: resolvedRemaining,
    quantity_unit: quantity_unit || "capsules",
    quantity_updated_at: new Date().toISOString(),
    low_supply_alert: low_supply_alert !== false,
  };
  if (typeof quantity_total === "number") updatePayload.quantity_total = quantity_total;
  if (typeof resolvedRemaining === "number") updatePayload.auto_decrement = true;
  if (resupply_ordered !== undefined) updatePayload.resupply_ordered = !!resupply_ordered;

  const { data, error } = await supabaseAdmin
    .from("user_stacks")
    .update(updatePayload)
    .eq("id", item_id)
    .eq("user_id", userId)
    .select("quantity_remaining, quantity_total")
    .maybeSingle();

  if (error) {
    console.error("inventory POST error:", error.message, error.details);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    message: "updated",
    quantity_remaining: data?.quantity_remaining ?? resolvedRemaining,
    quantity_total: data?.quantity_total ?? null,
  });
}

export async function DELETE(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { item_id } = await req.json();
  if (!item_id) return NextResponse.json({ error: "item_id required" }, { status: 400 });

  const { error } = await supabaseAdmin
    .from("user_stacks")
    .update({
      quantity_total: null,
      quantity_remaining: null,
      quantity_unit: null,
      quantity_updated_at: null,
      low_supply_alert: false,
      resupply_ordered: false,
    })
    .eq("id", item_id)
    .eq("user_id", userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ message: "inventory tracking removed" });
}
