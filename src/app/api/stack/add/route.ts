import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { supplement_id, dose, timing, frequency_type, brand, notes, purchased_from } = body;

  if (!supplement_id) {
    return NextResponse.json({ error: "supplement_id required" }, { status: 400 });
  }

  // Check if already in stack
  const { data: existing } = await supabaseAdmin
    .from("user_stacks")
    .select("id")
    .eq("user_id", userId)
    .eq("supplement_id", supplement_id)
    .eq("is_active", true)
    .single();

  if (existing) {
    return NextResponse.json({ message: "already_in_stack" }, { status: 200 });
  }

  const { data, error } = await supabaseAdmin
    .from("user_stacks")
    .insert({
      user_id: userId,
      supplement_id,
      category: "supplement",
      dose: dose || null,
      timing: timing || null,
      frequency_type: frequency_type || "daily",
      brand: brand || null,
      purchased_from: purchased_from || null,
      notes: notes || null,
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    console.error("Supabase stack/add error:", JSON.stringify(error));
    return NextResponse.json({ error: error.message, code: error.code }, { status: 500 });
  }

  return NextResponse.json({ message: "added", item: data }, { status: 201 });
}
