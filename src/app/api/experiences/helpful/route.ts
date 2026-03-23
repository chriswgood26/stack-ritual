import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { experience_id } = await req.json();
  if (!experience_id) return NextResponse.json({ error: "experience_id required" }, { status: 400 });

  // Check if already marked helpful
  const { data: existing } = await supabaseAdmin
    .from("experience_helpful")
    .select("id")
    .eq("experience_id", experience_id)
    .eq("user_id", userId)
    .single();

  // Get current count
  const { data: exp } = await supabaseAdmin
    .from("experiences")
    .select("helpful_count")
    .eq("id", experience_id)
    .single();

  const currentCount = exp?.helpful_count || 0;

  if (existing) {
    // Un-mark helpful
    await supabaseAdmin.from("experience_helpful")
      .delete().eq("experience_id", experience_id).eq("user_id", userId);
    await supabaseAdmin.from("experiences")
      .update({ helpful_count: Math.max(0, currentCount - 1) })
      .eq("id", experience_id);
    return NextResponse.json({ message: "removed", helpful: false, count: Math.max(0, currentCount - 1) });
  } else {
    // Mark helpful
    await supabaseAdmin.from("experience_helpful")
      .insert({ experience_id, user_id: userId });
    await supabaseAdmin.from("experiences")
      .update({ helpful_count: currentCount + 1 })
      .eq("id", experience_id);
    return NextResponse.json({ message: "added", helpful: true, count: currentCount + 1 });
  }
}
