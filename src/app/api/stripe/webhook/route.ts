import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase";
import Stripe from "stripe";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature")!;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    console.error("Webhook signature failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  async function upsertSubscription(sub: Stripe.Subscription) {
    const userId = sub.metadata?.clerk_user_id;
    if (!userId) return;

    const item = sub.items.data[0];
    const priceId = item?.price?.id;

    let plan = "free";
    if (priceId === process.env.STRIPE_PLUS_MONTHLY_PRICE_ID || priceId === process.env.STRIPE_PLUS_YEARLY_PRICE_ID) plan = "plus";
    if (priceId === process.env.STRIPE_PRO_MONTHLY_PRICE_ID || priceId === process.env.STRIPE_PRO_YEARLY_PRICE_ID) plan = "pro";

    const status = sub.status === "active" || sub.status === "trialing" ? "active" : sub.status;

    await supabaseAdmin.from("subscriptions").upsert({
      user_id: userId,
      stripe_customer_id: sub.customer as string,
      stripe_subscription_id: sub.id,
      plan,
      status,
      current_period_end: new Date((sub as Stripe.Subscription & { current_period_end: number }).current_period_end * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });
  }

  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated":
      await upsertSubscription(event.data.object as Stripe.Subscription);
      break;
    case "customer.subscription.deleted":
      const sub = event.data.object as Stripe.Subscription;
      const userId = sub.metadata?.clerk_user_id;
      if (userId) {
        await supabaseAdmin.from("subscriptions")
          .update({ plan: "free", status: "canceled", updated_at: new Date().toISOString() })
          .eq("user_id", userId);
      }
      break;
  }

  return NextResponse.json({ received: true });
}
