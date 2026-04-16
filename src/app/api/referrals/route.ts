import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

function generateCode(): string {
  // 6-char alphanumeric code, uppercase
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no I/O/0/1 to avoid confusion
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// GET: get or create the current user's referral code + stats
export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Check if user already has a referral code
  const { data: existing } = await supabaseAdmin
    .from("user_referrals")
    .select("referral_code")
    .eq("referrer_user_id", userId)
    .limit(1);

  let code: string;
  if (existing && existing.length > 0) {
    code = existing[0].referral_code;
  } else {
    // Generate a unique code
    code = generateCode();
    // Ensure uniqueness
    let attempts = 0;
    while (attempts < 5) {
      const { data: conflict } = await supabaseAdmin
        .from("user_referrals")
        .select("id")
        .eq("referral_code", code)
        .maybeSingle();
      if (!conflict) break;
      code = generateCode();
      attempts++;
    }

    // Insert a "template" row — referrer has a code, no referred user yet
    // This row just reserves the code. Actual referral rows are created when someone uses it.
    await supabaseAdmin.from("user_referrals").insert({
      referrer_user_id: userId,
      referral_code: code,
      status: "pending",
    });
  }

  // Get stats
  const { data: allReferrals } = await supabaseAdmin
    .from("user_referrals")
    .select("status, credit_amount_cents")
    .eq("referrer_user_id", userId)
    .not("referred_user_id", "is", null); // only count actual referrals, not the template row

  const totalReferred = allReferrals?.length ?? 0;
  const totalCredited = allReferrals?.filter((r) => r.status === "credited").length ?? 0;
  const totalCreditCents = allReferrals
    ?.filter((r) => r.status === "credited")
    .reduce((sum, r) => sum + (r.credit_amount_cents ?? 0), 0) ?? 0;
  const maxCredits = 6;
  const creditsRemaining = Math.max(0, maxCredits - totalCredited);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.stackritual.com";
  const referralLink = `${appUrl}?referral=${code}`;

  return NextResponse.json({
    code,
    referralLink,
    totalReferred,
    totalCredited,
    totalCreditCents,
    creditsRemaining,
    maxCredits,
  });
}
