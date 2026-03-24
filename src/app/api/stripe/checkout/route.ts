import { auth, currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { stripe, PRICE_IDS } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await currentUser();
  const email = user?.emailAddresses?.[0]?.emailAddress;

  const { priceKey } = await req.json();
  const priceId = PRICE_IDS[priceKey as keyof typeof PRICE_IDS];
  if (!priceId) return NextResponse.json({ error: "Invalid plan" }, { status: 400 });

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
