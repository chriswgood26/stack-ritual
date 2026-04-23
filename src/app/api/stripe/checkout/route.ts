import { auth, currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { stripe, PRICE_IDS } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase";
import { visitorHasAnnualPerk } from "@/lib/affiliatePerks";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await currentUser();
  const email = user?.emailAddresses?.[0]?.emailAddress;

  const { priceKey } = await req.json();
  const priceId = PRICE_IDS[priceKey as keyof typeof PRICE_IDS];
  if (!priceId) return NextResponse.json({ error: "Invalid plan" }, { status: 400 });

  // Annual plans are an affiliate perk — gate access by affiliate_ref cookie
  if (priceKey === "plus_yearly" || priceKey === "pro_yearly") {
    const unlocked = await visitorHasAnnualPerk();
    if (!unlocked) {
      return NextResponse.json({ error: "Annual plans are available through select affiliate partners only." }, { status: 403 });
    }
  }

  // Get or create Stripe customer — check DB first, then search Stripe
  const { data: sub } = await supabaseAdmin
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", userId)
    .single();

  let customerId = sub?.stripe_customer_id;

  if (!customerId) {
    // Search Stripe for existing customer with this user's metadata
    const existing = await stripe.customers.search({
      query: `metadata['clerk_user_id']:'${userId}'`,
      limit: 1,
    });
    
    if (existing.data.length > 0) {
      customerId = existing.data[0].id;
    } else {
      const customer = await stripe.customers.create({
        email: email || undefined,
        metadata: { clerk_user_id: userId },
      });
      customerId = customer.id;
    }

    // Save to DB
    await supabaseAdmin.from("subscriptions").upsert({
      user_id: userId,
      stripe_customer_id: customerId,
    }, { onConflict: "user_id" });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.stackritual.com";

  const cookieStore = await cookies();

  // Capture affiliate attribution — if user has an affiliate_ref cookie, create
  // a pending affiliate_referrals row. Applies to any plan (Plus/Pro, monthly/annual).
  // The webhook flips subscription_active + sets first_payment_at on first paid invoice.
  const affiliateRef = cookieStore.get("affiliate_ref")?.value;
  if (affiliateRef) {
    const { data: affiliateRow } = await supabaseAdmin
      .from("affiliates")
      .select("id, code, status")
      .ilike("code", affiliateRef)
      .maybeSingle();

    if (affiliateRow && affiliateRow.status === "active") {
      const { data: existingAttr } = await supabaseAdmin
        .from("affiliate_referrals")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      if (!existingAttr) {
        await supabaseAdmin.from("affiliate_referrals").insert({
          affiliate_id: affiliateRow.id,
          affiliate_code: affiliateRow.code,
          user_id: userId,
          email: email || null,
          subscription_active: false,
        });
      }
    }
  }

  // Capture referral attribution — if user has a referral_code cookie, create a pending referral row
  const referralCode = cookieStore.get("referral_code")?.value;
  if (referralCode && (priceKey === "pro_monthly" || priceKey === "pro_yearly")) {
    // Look up the referrer by code
    const { data: referrerRow } = await supabaseAdmin
      .from("user_referrals")
      .select("referrer_user_id, referral_code")
      .eq("referral_code", referralCode.toUpperCase())
      .limit(1)
      .maybeSingle();

    if (referrerRow && referrerRow.referrer_user_id !== userId) {
      // Check if this user is already referred (prevent duplicates)
      const { data: existingRef } = await supabaseAdmin
        .from("user_referrals")
        .select("id")
        .eq("referred_user_id", userId)
        .not("referred_user_id", "is", null)
        .maybeSingle();

      if (!existingRef) {
        await supabaseAdmin.from("user_referrals").insert({
          referrer_user_id: referrerRow.referrer_user_id,
          referral_code: referrerRow.referral_code,
          referred_user_id: userId,
          referred_email: email || null,
          status: "pending",
        });
      }
    }
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    payment_method_types: ["card"],
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}/dashboard/profile?upgraded=true`,
    cancel_url: `${appUrl}/dashboard/profile?canceled=true`,
    metadata: { clerk_user_id: userId },
    subscription_data: {
      metadata: { clerk_user_id: userId },
    },
  });

  return NextResponse.json({ url: session.url });
}
