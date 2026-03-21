import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabase, supabaseAdmin } from "@/lib/supabase";

// GET — fetch experiences (optionally filtered by supplement)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const supplementId = searchParams.get("supplement_id");
  const limit = parseInt(searchParams.get("limit") || "20");

  let query = supabase
    .from("experiences")
    .select("*, supplement:supplement_id(name, slug, icon)")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (supplementId) {
    query = query.eq("supplement_id", supplementId);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ experiences: data });
}

// POST — submit a new experience
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { supplement_id, custom_supplement_name, rating, title, body: experienceBody, duration_weeks } = body;

  if (!rating || !experienceBody?.trim()) {
    return NextResponse.json({ error: "Rating and experience text required" }, { status: 400 });
  }

  if (!supplement_id && !custom_supplement_name) {
    return NextResponse.json({ error: "Supplement required" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("experiences")
    .insert({
      user_id: userId,
      supplement_id: supplement_id || null,
      custom_supplement_name: custom_supplement_name || null,
      rating: parseInt(rating),
      title: title?.trim() || null,
      body: experienceBody.trim(),
      duration_weeks: duration_weeks ? parseInt(duration_weeks) : null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ message: "submitted", experience: data }, { status: 201 });
}
