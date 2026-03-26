import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

// GET — fetch brand ratings for a supplement
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const supplementId = searchParams.get("supplement_id");

  let query = supabaseAdmin
    .from("brand_ratings")
    .select("brand_name, quality_score, effectiveness_score, value_score, review, created_at")
    .order("created_at", { ascending: false });

  if (supplementId) {
    query = query.eq("supplement_id", supplementId);
  }

  const { data, error } = await query.limit(50);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Aggregate by brand
  const brands: Record<string, { count: number; quality: number; effectiveness: number; value: number; reviews: { review: string; created_at: string }[] }> = {};
  (data || []).forEach(r => {
    if (!brands[r.brand_name]) brands[r.brand_name] = { count: 0, quality: 0, effectiveness: 0, value: 0, reviews: [] };
    brands[r.brand_name].count++;
    brands[r.brand_name].quality += r.quality_score || 0;
    brands[r.brand_name].effectiveness += r.effectiveness_score || 0;
    brands[r.brand_name].value += r.value_score || 0;
    if (r.review) brands[r.brand_name].reviews.push({ review: r.review, created_at: r.created_at });
  });

  const aggregated = Object.entries(brands).map(([name, stats]) => ({
    brand_name: name,
    count: stats.count,
    avg_quality: Math.round((stats.quality / stats.count) * 10) / 10,
    avg_effectiveness: Math.round((stats.effectiveness / stats.count) * 10) / 10,
    avg_value: Math.round((stats.value / stats.count) * 10) / 10,
    avg_overall: Math.round(((stats.quality + stats.effectiveness + stats.value) / (stats.count * 3)) * 10) / 10,
    reviews: stats.reviews.slice(0, 3),
  })).sort((a, b) => b.avg_overall - a.avg_overall);

  return NextResponse.json({ brands: aggregated });
}

// POST — submit a brand rating
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { supplement_id, brand_name, quality_score, effectiveness_score, value_score, review } = await req.json();

  if (!brand_name || !quality_score) {
    return NextResponse.json({ error: "Brand name and quality score required" }, { status: 400 });
  }

  const { error } = await supabaseAdmin.from("brand_ratings").upsert({
    user_id: userId,
    supplement_id: supplement_id || null,
    brand_name: brand_name.trim(),
    quality_score,
    effectiveness_score,
    value_score,
    review: review?.trim() || null,
  }, { onConflict: "user_id,supplement_id,brand_name" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ message: "submitted" });
}
