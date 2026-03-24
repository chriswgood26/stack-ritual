import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

const ADMIN_IDS = process.env.ADMIN_USER_IDS?.split(",") || [];

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId || !ADMIN_IDS.includes(userId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();

  const { data, error } = await supabaseAdmin
    .from("supplements")
    .insert({
      name: body.name,
      slug: body.slug,
      icon: body.icon || "💊",
      category: body.category || "other",
      tagline: body.tagline || null,
      description: body.description || null,
      evidence_level: body.evidence_level || "moderate",
      benefits: body.benefits || [],
      side_effects: body.side_effects || [],
      timing_recommendation: body.timing_recommendation || null,
      dose_recommendation: body.dose_recommendation || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ message: "added", supplement: data });
}
