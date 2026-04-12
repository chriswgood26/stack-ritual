import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

// Public endpoint — no auth required. Someone holding a physical postcard
// or a handwritten code enters it here and gets the affiliate_ref cookie
// set on their browser. The existing attribution flow then takes over.
export async function POST(req: NextRequest) {
  const { code: rawCode } = await req.json();
  const code = String(rawCode || "").trim();

  if (!code) {
    return NextResponse.json({ error: "Please enter a code." }, { status: 400 });
  }

  // Case-insensitive lookup so users don't fail because of capitalization
  const { data } = await supabaseAdmin
    .from("affiliates")
    .select("code, name, status, offers_annual_perk")
    .ilike("code", code)
    .maybeSingle() as {
      data: { code: string; name: string; status: string; offers_annual_perk: boolean } | null;
    };

  if (!data) {
    return NextResponse.json({ error: "That code doesn't match any of our affiliates." }, { status: 404 });
  }

  if (data.status !== "active") {
    return NextResponse.json({ error: "That affiliate's account is no longer active." }, { status: 410 });
  }

  // Build response with the cookie set. Match the existing attribution cookie
  // attributes (90 days, path=/, sameSite=lax, non-httpOnly so PageTracker can
  // still read/write it).
  const res = NextResponse.json({
    ok: true,
    affiliate_name: data.name,
    affiliate_code: data.code,
    unlocks_annual: !!data.offers_annual_perk,
  });

  res.cookies.set("affiliate_ref", data.code, {
    path: "/",
    maxAge: 60 * 60 * 24 * 90, // 90 days (matches PageTracker's URL capture)
    sameSite: "lax",
    httpOnly: false,
  });

  return res;
}
