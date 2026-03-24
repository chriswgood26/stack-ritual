import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

const ADMIN_IDS = process.env.ADMIN_USER_IDS?.split(",") || [];

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId || !ADMIN_IDS.includes(userId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id, name, icon, category, tagline, description, evidence_level, benefits, side_effects, timing_recommendation, dose_recommendation } = await req.json();

  const { error } = await supabaseAdmin
    .from("supplements")
    .update({
      name,
      icon,
      category,
      tagline,
      description,
      evidence_level,
      benefits,
      side_effects,
      timing_recommendation,
      dose_recommendation,
    })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ message: "updated" });
}
