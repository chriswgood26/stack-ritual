import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  let { item_id, dose, timing, brand, notes, frequency_type, quantity_total, quantity_remaining, quantity_unit, auto_decrement, doses_per_serving } = body;
  if (!item_id) return NextResponse.json({ error: "item_id required" }, { status: 400 });

  // Ensure remaining never exceeds total
  const total = quantity_total !== "" && quantity_total !== null && quantity_total !== undefined ? Number(quantity_total) : null;
  const remaining = quantity_remaining !== "" && quantity_remaining !== null && quantity_remaining !== undefined ? Number(quantity_remaining) : null;
  if (total !== null && remaining !== null && remaining > total) {
    quantity_remaining = quantity_total;
  }

  const { error } = await supabaseAdmin
    .from("user_stacks")
    .update({
      dose: dose || null,
      timing: timing || null,
      brand: brand || null,
      notes: notes || null,
      frequency_type: frequency_type || "daily",
      // Only update inventory if values were explicitly provided (not empty string)
      ...(quantity_total !== "" && quantity_total !== null && quantity_total !== undefined
        ? { quantity_total: Number(quantity_total) }
        : {}),
      ...(quantity_remaining !== "" && quantity_remaining !== null && quantity_remaining !== undefined
        ? { quantity_remaining: Number(quantity_remaining) }
        : {}),
      ...(quantity_unit ? { quantity_unit } : {}),
      ...(auto_decrement !== undefined ? { auto_decrement: !!auto_decrement } : {}),
      ...(doses_per_serving !== undefined && doses_per_serving !== null && doses_per_serving !== ""
        ? { doses_per_serving: Math.max(1, Number(doses_per_serving) || 1) }
        : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", item_id)
    .eq("user_id", userId);

  if (error) {
    console.error("Update error:", error.message, error.details);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ message: "updated", saved: { quantity_total, quantity_remaining, quantity_unit } });
}
