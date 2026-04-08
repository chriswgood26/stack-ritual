import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

// Public endpoint — handles affiliate program signup from /affiliate-program page
export async function POST(req: NextRequest) {
  const { name, email, message } = await req.json();

  if (!name || !email) {
    return NextResponse.json({ error: "Name and email are required" }, { status: 400 });
  }

  const { error } = await supabaseAdmin.from("affiliate_interest").insert({
    name,
    email,
    message: message || null,
    status: "pending",
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
