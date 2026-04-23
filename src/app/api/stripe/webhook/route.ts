import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase";
import { sendReferralCreditedEmail } from "@/lib/emails";
import { clerkClient } from "@clerk/nextjs/server";
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

      // Notify the referrer. Fetch their Clerk profile for name + email. Email
      // failure is logged but does not surface — the credit itself is durable.
      try {
        const client = await clerkClient();
        const referrer = await client.users.getUser(referral.referrer_user_id);
        const referrerEmail = referrer.emailAddresses?.[0]?.emailAddress;
        if (referrerEmail) {
          const creditsEarned = (creditCount ?? 0) + 1;
          const creditsRemaining = Math.max(0, 6 - creditsEarned);
          const sendRes = await sendReferralCreditedEmail(
            referrerEmail,
            referrer.firstName || null,
            creditsEarned,
            creditsRemaining,
          );
          if (sendRes.error) console.error("Referral credited email failed:", sendRes.error);
          else console.log("Referral credited email sent:", sendRes.data?.id);
        }
      } catch (emailErr) {
        console.error("Referral credited email threw:", emailErr);
      }
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

  async function resolveUserId(sub: Stripe.Subscription): Promise<string | null> {
    let uid = sub.metadata?.clerk_user_id;
    if (!uid) {
      const { data: existing } = await supabaseAdmin
        .from("subscriptions")
        .select("user_id")
        .eq("stripe_customer_id", sub.customer as string)
        .single();
      uid = existing?.user_id;
    }
    return uid || null;
  }

  async function activateAffiliateAttribution(sub: Stripe.Subscription) {
    try {
      const uid = await resolveUserId(sub);
      if (!uid) return;
      const { data: row } = await supabaseAdmin
        .from("affiliate_referrals")
        .select("id, first_payment_at")
        .eq("user_id", uid)
        .maybeSingle();
      if (!row) return;
      const patch: Record<string, unknown> = { subscription_active: true };
      if (!row.first_payment_at) patch.first_payment_at = new Date().toISOString();
      await supabaseAdmin.from("affiliate_referrals").update(patch).eq("id", row.id);
    } catch (err) {
      console.error("Affiliate attribution activation failed:", err);
    }
  }

  async function deactivateAffiliateAttribution(sub: Stripe.Subscription) {
    try {
      const uid = await resolveUserId(sub);
      if (!uid) return;
      await supabaseAdmin
        .from("affiliate_referrals")
        .update({ subscription_active: false })
        .eq("user_id", uid);
    } catch (err) {
      console.error("Affiliate attribution deactivation failed:", err);
    }
  }

  function resolvePlanFromPriceId(priceId: string | null | undefined): { plan: "plus" | "pro" | null; interval: "month" | "year" | null } {
    if (!priceId) return { plan: null, interval: null };
    if (priceId === process.env.STRIPE_PLUS_MONTHLY_PRICE_ID) return { plan: "plus", interval: "month" };
    if (priceId === process.env.STRIPE_PLUS_YEARLY_PRICE_ID) return { plan: "plus", interval: "year" };
    if (priceId === process.env.STRIPE_PRO_MONTHLY_PRICE_ID) return { plan: "pro", interval: "month" };
    if (priceId === process.env.STRIPE_PRO_YEARLY_PRICE_ID) return { plan: "pro", interval: "year" };
    return { plan: null, interval: null };
  }

  // Refund or dispute: post a negative commission row for each matching original.
  // Partial refunds pro-rate the reversal by refund-ratio of the original charge.
  async function processChargeReversal(charge: Stripe.Charge, eventId: string, reversalType: "refund" | "dispute") {
    try {
      const { data: originals } = await supabaseAdmin
        .from("affiliate_commissions")
        .select("id, affiliate_id, user_id, commission_cents, amount_cents, plan, billing_interval, stripe_invoice_id")
        .eq("stripe_charge_id", charge.id);
      if (!originals || originals.length === 0) return;

      const chargeAmount = charge.amount ?? 0;
      const refundedAmount = charge.amount_refunded ?? chargeAmount;
      const ratio = reversalType === "dispute"
        ? 1
        : chargeAmount > 0 ? refundedAmount / chargeAmount : 1;

      for (const orig of originals as Array<{
        id: string;
        affiliate_id: string;
        user_id: string;
        commission_cents: number;
        amount_cents: number;
        plan: string | null;
        billing_interval: string | null;
        stripe_invoice_id: string | null;
      }>) {
        const scopedEventId = `${eventId}_${orig.id}`;
        const { data: existingReversal } = await supabaseAdmin
          .from("affiliate_commissions")
          .select("id")
          .eq("stripe_event_id", scopedEventId)
          .maybeSingle();
        if (existingReversal) continue;

        const reverseCents = -Math.round(orig.commission_cents * ratio);
        if (reverseCents === 0) continue;

        await supabaseAdmin.from("affiliate_commissions").insert({
          affiliate_id: orig.affiliate_id,
          user_id: orig.user_id,
          stripe_event_id: scopedEventId,
          stripe_invoice_id: orig.stripe_invoice_id,
          stripe_charge_id: charge.id,
          amount_cents: -Math.round(orig.amount_cents * ratio),
          commission_cents: reverseCents,
          commission_type: reversalType,
          plan: orig.plan,
          billing_interval: orig.billing_interval,
          occurred_at: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.error(`Charge ${reversalType} processing error:`, err);
    }
  }

  async function processCommission(invoice: Stripe.Invoice, eventId: string) {
    try {
      // Dedup — same event shouldn't insert twice.
      const { data: existing } = await supabaseAdmin
        .from("affiliate_commissions")
        .select("id")
        .eq("stripe_event_id", eventId)
        .maybeSingle();
      if (existing) return;

      const subId = (invoice as Stripe.Invoice & { subscription?: string | Stripe.Subscription | null }).subscription;
      const subscriptionId = typeof subId === "string" ? subId : subId?.id;
      if (!subscriptionId) return;

      // Find the user via subscriptions table (keyed by stripe_subscription_id or customer).
      const { data: subRow } = await supabaseAdmin
        .from("subscriptions")
        .select("user_id")
        .eq("stripe_customer_id", invoice.customer as string)
        .maybeSingle();
      const userId = subRow?.user_id;
      if (!userId) return;

      // Find the affiliate attribution for this user.
      const { data: attribution } = await supabaseAdmin
        .from("affiliate_referrals")
        .select("id, affiliate_id, first_payment_at")
        .eq("user_id", userId)
        .maybeSingle();
      if (!attribution) return;

      // Ensure first_payment_at is set — use the invoice's own timestamp.
      const invoiceTs = new Date(invoice.created * 1000).toISOString();
      if (!attribution.first_payment_at) {
        await supabaseAdmin
          .from("affiliate_referrals")
          .update({ first_payment_at: invoiceTs, subscription_active: true })
          .eq("id", attribution.id);
        attribution.first_payment_at = invoiceTs;
      }

      // Load affiliate config (tier + rates).
      const { data: affiliate } = await supabaseAdmin
        .from("affiliates")
        .select("id, tier, first_month_percentage, recurring_percentage, annual_flat_plus, annual_flat_pro")
        .eq("id", attribution.affiliate_id)
        .maybeSingle();
      if (!affiliate) return;

      const line = invoice.lines?.data?.[0] as (Stripe.InvoiceLineItem & { price?: { id?: string } | null; pricing?: { price_details?: { price?: string } } }) | undefined;
      const priceId = line?.price?.id || line?.pricing?.price_details?.price || null;
      const { plan, interval } = resolvePlanFromPriceId(priceId);
      if (!plan || !interval) return;

      const amountCents = invoice.amount_paid ?? 0;
      const billingReason = invoice.billing_reason;

      // 12-month clock from first paid invoice.
      const firstPaymentMs = new Date(attribution.first_payment_at).getTime();
      const invoiceMs = invoice.created * 1000;
      const withinFirstYear = invoiceMs - firstPaymentMs <= 365 * 24 * 60 * 60 * 1000;

      let commissionCents = 0;
      let commissionType: string | null = null;

      if (interval === "year") {
        // Annual: only Super Affiliate gets a flat payout, and only on first-year subscription_create.
        if (affiliate.tier === "super_affiliate" && billingReason === "subscription_create") {
          const flat = plan === "pro" ? Number(affiliate.annual_flat_pro ?? 24) : Number(affiliate.annual_flat_plus ?? 16);
          commissionCents = Math.round(flat * 100);
          commissionType = "annual_flat";
        }
        // Year 2+ renewals and plain Affiliate tier → no commission.
      } else if (interval === "month") {
        if (billingReason === "subscription_create") {
          commissionCents = Math.round((amountCents * Number(affiliate.first_month_percentage ?? 50)) / 100);
          commissionType = "first_month";
        } else if (
          (billingReason === "subscription_cycle" || billingReason === "subscription_update") &&
          withinFirstYear
        ) {
          commissionCents = Math.round((amountCents * Number(affiliate.recurring_percentage ?? 10)) / 100);
          commissionType = "recurring";
        }
      }

      if (!commissionType || commissionCents === 0) return;

      const chargeId = (invoice as Stripe.Invoice & { charge?: string | Stripe.Charge | null }).charge;
      await supabaseAdmin.from("affiliate_commissions").insert({
        affiliate_id: affiliate.id,
        user_id: userId,
        stripe_event_id: eventId,
        stripe_invoice_id: invoice.id,
        stripe_charge_id: typeof chargeId === "string" ? chargeId : chargeId?.id || null,
        amount_cents: amountCents,
        commission_cents: commissionCents,
        commission_type: commissionType,
        plan,
        billing_interval: interval,
        occurred_at: invoiceTs,
      });
    } catch (err) {
      console.error("Commission processing error:", err);
    }
  }

  switch (event.type) {
    case "customer.subscription.created": {
      const newSub = event.data.object as Stripe.Subscription;
      await upsertSubscription(newSub);
      // Check for referral attribution on new Pro subscriptions
      await processReferralCredit(newSub);
      await activateAffiliateAttribution(newSub);
      break;
    }
    case "customer.subscription.updated":
      await upsertSubscription(event.data.object as Stripe.Subscription);
      break;
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const uid = await resolveUserId(sub);
      if (uid) {
        await supabaseAdmin.from("subscriptions")
          .update({ plan: "free", status: "canceled", updated_at: new Date().toISOString() })
          .eq("user_id", uid);
      } else {
        console.error("subscription.deleted: No user found for customer:", sub.customer);
      }
      await deactivateAffiliateAttribution(sub);
      break;
    }
    case "invoice.paid": {
      const invoice = event.data.object as Stripe.Invoice;
      await processCommission(invoice, event.id);
      break;
    }
    case "charge.refunded": {
      const charge = event.data.object as Stripe.Charge;
      await processChargeReversal(charge, event.id, "refund");
      break;
    }
    case "charge.dispute.created": {
      const dispute = event.data.object as Stripe.Dispute;
      const chargeId = typeof dispute.charge === "string" ? dispute.charge : dispute.charge?.id;
      if (chargeId) {
        const charge = await stripe.charges.retrieve(chargeId);
        await processChargeReversal(charge, event.id, "dispute");
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
