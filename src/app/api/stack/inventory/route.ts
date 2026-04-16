import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { item_id, quantity_total, quantity_remaining, quantity_unit, low_supply_alert, resupply_ordered } = await req.json();
  if (!item_id) return NextResponse.json({ error: "item_id required" }, { status: 400 });

  // Resolve the final remaining qty so we can decide whether to enable auto_decrement
  const resolvedRemaining = quantity_remaining ?? quantity_total ?? null;

  const { error } = await supabaseAdmin
    .from("user_stacks")
    .update({
      quantity_total: quantity_total || null,
      quantity_remaining: resolvedRemaining,
      quantity_unit: quantity_unit || "capsules",
      quantity_updated_at: new Date().toISOString(),
      low_supply_alert: low_supply_alert !== false,
      // If user is actively setting a remaining qty via the badge, they want decrement tracking.
      // Fixes older items that were added before auto_decrement defaulted to true.
      ...(typeof resolvedRemaining === "number" ? { auto_decrement: true } : {}),
      ...(resupply_ordered !== undefined ? { resupply_ordered: !!resupply_ordered } : {}),
    })
    .eq("id", item_id)
    .eq("user_id", userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ message: "updated" });
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
