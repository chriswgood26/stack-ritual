import { auth, currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { sendReferralInviteEmail } from "@/lib/emails";

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { email, note } = await req.json();
  if (!email || typeof email !== "string" || !EMAIL_RE.test(email.trim())) {
    return NextResponse.json({ error: "Valid email required" }, { status: 400 });
  }

  // Paying-Pro only — matches webhook crediting rules
  const { data: sub } = await supabaseAdmin
    .from("subscriptions")
    .select("plan, stripe_customer_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (!sub || sub.plan !== "pro" || !sub.stripe_customer_id) {
    return NextResponse.json(
      { error: "Referral credits are only available on paid Pro subscriptions." },
      { status: 403 },
    );
  }

  // Get or create the user's referral code
  const { data: existing } = await supabaseAdmin
    .from("user_referrals")
    .select("referral_code")
    .eq("referrer_user_id", userId)
    .limit(1);

  let code: string;
  if (existing && existing.length > 0) {
    code = existing[0].referral_code;
  } else {
    code = generateCode();
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
    await supabaseAdmin.from("user_referrals").insert({
      referrer_user_id: userId,
      referral_code: code,
      status: "pending",
    });
  }

  const user = await currentUser();
  const fromName =
    user?.firstName ||
    user?.emailAddresses?.[0]?.emailAddress?.split("@")[0] ||
    "A friend";

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.stackritual.com";
  const referralLink = `${appUrl}?referral=${code}`;

  const trimmedNote = typeof note === "string" ? note.trim().slice(0, 500) : "";

  try {
    await sendReferralInviteEmail(email.trim(), fromName, referralLink, trimmedNote || undefined);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to send email";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ message: "sent" });
}
