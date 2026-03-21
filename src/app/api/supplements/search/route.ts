import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim().toLowerCase();

  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  // Search master supplements DB
  const { data: official } = await supabase
    .from("supplements")
    .select("id, name, slug, icon, category, tagline, evidence_level")
    .ilike("name", `%${q}%`)
    .limit(8);

  return NextResponse.json({
    results: (official || []).map(s => ({ ...s, source: "official" })),
  });
}
