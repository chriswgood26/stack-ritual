import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export const PLANS = {
  free: { name: 'Free', price: 0, features: ['Up to 5 supplements', 'Basic research library', 'Stack builder', 'Print summary'] },
  plus: { name: 'Plus', price: 4.99, features: ['Unlimited supplements', 'Full research library', 'Interactions checker', 'Email reminders', 'Community experiences'] },
  pro: { name: 'Pro', price: 9.99, features: ['Everything in Plus', 'SMS reminders', 'Click-to-mark-taken texts', 'Custom reminder times', 'Priority support'] },
};

export const PRICE_IDS = {
  plus_monthly: process.env.STRIPE_PLUS_MONTHLY_PRICE_ID!,
  plus_yearly: process.env.STRIPE_PLUS_YEARLY_PRICE_ID!,
  pro_monthly: process.env.STRIPE_PRO_MONTHLY_PRICE_ID!,
  pro_yearly: process.env.STRIPE_PRO_YEARLY_PRICE_ID!,
};
