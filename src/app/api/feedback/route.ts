import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { rating, message, page } = await req.json();
  if (!message?.trim()) return NextResponse.json({ error: "Message required" }, { status: 400 });

  const { error } = await supabaseAdmin
    .from("app_feedback")
    .insert({ user_id: userId, rating: rating || null, message: message.trim(), page: page || null });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ message: "submitted" });
}
