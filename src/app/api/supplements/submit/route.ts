import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getRitualIcon } from "@/lib/ritual-icons";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { name, category, icon, tagline, dose, timing, brand, purchased_from, quantity_total, quantity_remaining, quantity_unit, doses_per_serving } = body;

  if (!name?.trim()) {
    return NextResponse.json({ error: "Name required" }, { status: 400 });
  }

  const normalized = name.trim().toLowerCase().replace(/\s+/g, " ");

  // Check for near-duplicate in official DB
  const { data: officialMatch } = await supabaseAdmin
    .from("supplements")
    .select("id, name, slug")
    .ilike("name", `%${normalized}%`)
    .limit(1)
    .single();

  if (officialMatch) {
    return NextResponse.json({
      message: "exists_in_db",
      match: officialMatch,
    }, { status: 200 });
  }

  // Check for existing pending submission with same name
  const { data: pendingMatch } = await supabaseAdmin
    .from("user_submitted_supplements")
    .select("id, name")
    .eq("name_normalized", normalized)
    .neq("status", "rejected")
    .limit(1)
    .single();

  if (pendingMatch) {
    return NextResponse.json({
      message: "already_submitted",
      match: pendingMatch,
    }, { status: 200 });
  }

  // Insert new submission
  const { data, error } = await supabaseAdmin
    .from("user_submitted_supplements")
    .insert({
      submitted_by: userId,
      name: name.trim(),
      name_normalized: normalized,
      category: category || "other",
      icon: icon || "💊",
      tagline: tagline || null,
      dose: dose || null,
      timing: timing || null,
      brand: brand || null,
      purchased_from: purchased_from || null,
      status: "pending",
    })
    .select()
    .single();

  if (error) {
    console.error("Submit error:", JSON.stringify(error));
    return NextResponse.json({ error: error.message, details: error }, { status: 500 });
  }

  // Inventory: if a starting total is provided, default remaining to total
  const totalNum = quantity_total !== undefined && quantity_total !== null && quantity_total !== "" ? Number(quantity_total) : null;
  const remainingNum = quantity_remaining !== undefined && quantity_remaining !== null && quantity_remaining !== ""
    ? Number(quantity_remaining)
    : totalNum;

  // Also add directly to user's stack as a custom item
  await supabaseAdmin.from("user_stacks").insert({
    user_id: userId,
    supplement_id: null,
    custom_name: name.trim(),
    custom_icon: body.isRitual ? (icon || getRitualIcon(name.trim())) : (icon || "💊"),
    category: body.isRitual ? "ritual" : "supplement",
    dose: dose || null,
    timing: timing || null,
    brand: brand || null,
    purchased_from: purchased_from || null,
    notes: tagline || null,
    quantity_total: totalNum,
    quantity_remaining: remainingNum,
    quantity_unit: quantity_unit || (totalNum !== null ? "capsules" : null),
    doses_per_serving: doses_per_serving ? Math.max(1, Number(doses_per_serving) || 1) : 1,
    auto_decrement: remainingNum !== null,
    is_active: true,
  });

  return NextResponse.json({ message: "submitted", item: data }, { status: 201 });
}
