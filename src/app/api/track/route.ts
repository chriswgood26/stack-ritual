import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

// Public — no auth, fires on every public page load
export async function POST(req: NextRequest) {
  try {
    const { path, referrer } = await req.json();
    const userAgent = req.headers.get("user-agent") || null;

    await supabaseAdmin.from("page_views").insert({
      path: path || "/",
      referrer: referrer || null,
      user_agent: userAgent,
    });
  } catch {
    // Never fail — tracking should be invisible
  }

  return NextResponse.json({ ok: true });
}
