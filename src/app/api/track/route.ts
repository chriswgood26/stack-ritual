import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

// Public — no auth, fires on every public page load
export async function POST(req: NextRequest) {
  try {
    const { path, referrer, utm_source, utm_medium, utm_campaign } = await req.json();
    const userAgent = req.headers.get("user-agent") || null;

    await supabaseAdmin.from("page_views").insert({
      path: path || "/",
      referrer: referrer || null,
      user_agent: userAgent,
      utm_source: utm_source || null,
      utm_medium: utm_medium || null,
      utm_campaign: utm_campaign || null,
    });
  } catch {
    // Never fail — tracking should be invisible
  }

  return NextResponse.json({ ok: true });
}
