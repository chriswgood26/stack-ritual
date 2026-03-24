import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.stackritual.com";

  // Get or create Stripe customer
  let { data: sub } = await supabaseAdmin
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", userId)
    .single();

  let customerId = sub?.stripe_customer_id;

  if (!customerId) {
    // Create a Stripe customer for this user
    const user = await currentUser();
    const email = user?.emailAddresses?.[0]?.emailAddress;
    const customer = await stripe.customers.create({
      email: email || undefined,
      metadata: { clerk_user_id: userId },
    });
    customerId = customer.id;

    // Save to DB
    await supabaseAdmin.from("subscriptions").upsert({
      user_id: userId,
      stripe_customer_id: customerId,
    }, { onConflict: "user_id" });
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${appUrl}/dashboard/profile`,
  });

  return NextResponse.json({ url: session.url });
}
