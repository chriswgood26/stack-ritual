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
    console.error("Webhook secret present:", !!webhookSecret, "| Secret prefix:", webhookSecret?.slice(0, 8));
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  console.log("Webhook received:", event.type, "| ID:", event.id);

  async function processReferralCredit(sub: Stripe.Subscription) {
    try {
      // Only process Pro subscriptions
      const item = sub.items.data[0];
      const priceId = item?.price?.id;
      const isProPlan =
        priceId === process.env.STRIPE_PRO_MONTHLY_PRICE_ID ||
        priceId === process.env.STRIPE_PRO_YEARLY_PRICE_ID;
      if (!isProPlan) return;

      // Get the referred user's ID
      let referredUserId = sub.metadata?.clerk_user_id;
      if (!referredUserId) {
        const { data: existing } = await supabaseAdmin
          .from("subscriptions")
          .select("user_id")
          .eq("stripe_customer_id", sub.customer as string)
          .single();
        referredUserId = existing?.user_id;
      }
      if (!referredUserId) return;

      // Check if this user was referred — look for a pending referral row with their user ID
      const { data: referral } = await supabaseAdmin
        .from("user_referrals")
        .select("id, referrer_user_id, referral_code")
        .eq("referred_user_id", referredUserId)
        .eq("status", "pending")
        .maybeSingle();

      if (!referral) return;

      // Check referrer is on Pro and hasn't exceeded 6 credits
      const { data: referrerSub } = await supabaseAdmin
        .from("subscriptions")
        .select("plan, stripe_customer_id")
        .eq("user_id", referral.referrer_user_id)
        .single();

      if (!referrerSub || referrerSub.plan !== "pro" || !referrerSub.stripe_customer_id) {
        console.log("Referral credit skipped: referrer not on Pro or no Stripe customer");
        return;
      }

      // Count existing credits (max 6)
      const { count: creditCount } = await supabaseAdmin
        .from("user_referrals")
        .select("*", { count: "exact", head: true })
        .eq("referrer_user_id", referral.referrer_user_id)
        .eq("status", "credited");

      if ((creditCount ?? 0) >= 6) {
        console.log("Referral credit skipped: referrer at max 6 credits");
        return;
      }

      // Issue Stripe balance credit (-$9.99 = -999 cents)
      const creditAmountCents = 999;
      const balanceTx = await stripe.customers.createBalanceTransaction(
        referrerSub.stripe_customer_id,
        {
          amount: -creditAmountCents, // negative = credit
          currency: "usd",
          description: `Referral credit: 1 free month of Pro (code ${referral.referral_code})`,
        }
      );

      // Update referral record
      await supabaseAdmin
        .from("user_referrals")
        .update({
          status: "credited",
          stripe_balance_tx_id: balanceTx.id,
          credit_amount_cents: creditAmountCents,
          credited_at: new Date().toISOString(),
        })
        .eq("id", referral.id);

      console.log(
        `Referral credit issued: $${(creditAmountCents / 100).toFixed(2)} to ${referral.referrer_user_id} for referral ${referral.id}`
      );
    } catch (err) {
      console.error("Referral credit processing error:", err);
      // Don't throw — referral credit failure shouldn't block subscription processing
    }
  }

  async function upsertSubscription(sub: Stripe.Subscription) {
    // Try metadata first, then look up by customer ID
    let userId = sub.metadata?.clerk_user_id;
    if (!userId) {
      const { data: existing } = await supabaseAdmin
        .from("subscriptions")
        .select("user_id")
        .eq("stripe_customer_id", sub.customer as string)
        .single();
      userId = existing?.user_id;
    }
    if (!userId) {
      console.error("No user found for customer:", sub.customer);
      return;
    }

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
    case "customer.subscription.created": {
      const newSub = event.data.object as Stripe.Subscription;
      await upsertSubscription(newSub);
      // Check for referral attribution on new Pro subscriptions
      await processReferralCredit(newSub);
      break;
    }
    case "customer.subscription.updated":
      await upsertSubscription(event.data.object as Stripe.Subscription);
      break;
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      let userId = sub.metadata?.clerk_user_id;
      if (!userId) {
        const { data: existing } = await supabaseAdmin
          .from("subscriptions")
          .select("user_id")
          .eq("stripe_customer_id", sub.customer as string)
          .single();
        userId = existing?.user_id;
      }
      if (userId) {
        await supabaseAdmin.from("subscriptions")
          .update({ plan: "free", status: "canceled", updated_at: new Date().toISOString() })
          .eq("user_id", userId);
      } else {
        console.error("subscription.deleted: No user found for customer:", sub.customer);
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
