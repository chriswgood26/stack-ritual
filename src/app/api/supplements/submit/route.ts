import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { name, category, icon, tagline, dose, timing, brand, purchased_from } = body;

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

  // Also add directly to user's stack as a custom item
  await supabaseAdmin.from("user_stacks").insert({
    user_id: userId,
    supplement_id: null,
    custom_name: name.trim(),
    custom_icon: icon || "💊",
    category: body.isRitual ? "ritual" : "supplement",
    dose: dose || null,
    timing: timing || null,
    brand: brand || null,
    purchased_from: purchased_from || null,
    notes: tagline || null,
    is_active: true,
  });

  return NextResponse.json({ message: "submitted", item: data }, { status: 201 });
}
