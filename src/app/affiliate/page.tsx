"use client";

import { useState } from "react";
import Link from "next/link";

const HOOKS = [
  {
    icon: "💰",
    title: "Upfront commissions",
    body: "Get paid for every annual signup from your store. No drip payments, no waiting.",
  },
  {
    icon: "🎁",
    title: "A better deal for your customers",
    body: "Qualified stores unlock discounted annual pricing — so you can offer your shoppers something special.",
  },
  {
    icon: "⚡",
    title: "Free to join",
    body: "Two-minute signup. No contracts, no setup fees, no inventory.",
  },
  {
    icon: "🖼",
    title: "Free counter display",
    body: "We'll ship you a custom counter card once you're approved — no cost to you.",
  },
];

const INITIAL_FORM = {
  store_name: "",
  name: "",
  email: "",
  street_address: "",
  street_address_2: "",
  city: "",
  state: "",
  zip: "",
  message: "",
};

export default function AffiliatePage() {
  const [form, setForm] = useState(INITIAL_FORM);
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    try {
      const res = await fetch("/api/affiliates/interest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setStatus("sent");
        setForm(INITIAL_FORM);
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  }

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  const inputClass =
    "w-full bg-white border border-stone-300 rounded-lg px-4 py-3 text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50";

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-50 to-emerald-50/30">
      <nav className="bg-white border-b border-stone-200 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl">🌿</span>
            <span className="font-bold text-stone-900">Stack Ritual</span>
          </Link>
          <Link href="/" className="text-stone-600 hover:text-stone-900 text-sm">
            ← Back to site
          </Link>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-16">
        <div className="inline-block bg-amber-100 text-amber-800 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full mb-4">
          For supplement store owners
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-stone-900 leading-tight mb-4">
          Your customers are already building their supplement routine.
        </h1>
        <p className="text-emerald-700 text-2xl md:text-3xl font-bold mb-6">
          Get paid when they use ours.
        </p>
        <p className="text-stone-600 text-lg mb-10">
          Stack Ritual is a supplement tracking app your customers already want. Put our card on your counter and earn a commission every time one of your shoppers subscribes. No extra work. No inventory. Just pass out the card.
        </p>

        <div className="grid md:grid-cols-2 gap-4 mb-10">
          {HOOKS.map((h) => (
            <div key={h.title} className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm">
              <div className="text-3xl mb-3">{h.icon}</div>
              <h3 className="text-stone-900 font-bold mb-2">{h.title}</h3>
              <p className="text-stone-600 text-sm">{h.body}</p>
            </div>
          ))}
        </div>

        <div className="bg-white border border-stone-200 rounded-2xl p-8 mb-10 shadow-sm">
          <h2 className="text-xl font-bold text-stone-900 mb-6">How it works</h2>
          <div className="space-y-5">
            <div className="flex gap-4">
              <div className="bg-emerald-100 text-emerald-700 rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">1</div>
              <div>
                <h3 className="text-stone-900 font-semibold mb-1">Apply below</h3>
                <p className="text-stone-600 text-sm">Tell us about your store. We review each application to make sure we&rsquo;re a good fit for your shoppers.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="bg-emerald-100 text-emerald-700 rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">2</div>
              <div>
                <h3 className="text-stone-900 font-semibold mb-1">We ship your counter display</h3>
                <p className="text-stone-600 text-sm">Once approved, we mail you a custom card for your counter along with your unique referral code.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="bg-emerald-100 text-emerald-700 rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">3</div>
              <div>
                <h3 className="text-stone-900 font-semibold mb-1">Earn on every signup</h3>
                <p className="text-stone-600 text-sm">Your shoppers scan the card, sign up, and you get paid. Monthly payouts, tracked in your affiliate dashboard.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white border border-stone-200 rounded-2xl p-8 shadow-sm">
          <h2 className="text-xl font-bold text-stone-900 mb-2">Ready to join?</h2>
          <p className="text-stone-600 mb-6">
            Fill out the form and we&rsquo;ll reach out within a couple business days. We need a mailing address so we can ship your custom counter card.
          </p>

          {status === "sent" ? (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg px-4 py-3">
              Thanks! Check your inbox for a confirmation. We&rsquo;ll be in touch soon with your counter card and affiliate details.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Store name</label>
                <input
                  type="text"
                  placeholder="e.g. Portland Vitamins"
                  required
                  value={form.store_name}
                  onChange={(e) => update("store_name", e.target.value)}
                  className={inputClass}
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Your name</label>
                  <input
                    type="text"
                    placeholder="First and last"
                    required
                    value={form.name}
                    onChange={(e) => update("name", e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Email</label>
                  <input
                    type="email"
                    placeholder="you@store.com"
                    required
                    value={form.email}
                    onChange={(e) => update("email", e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="pt-2">
                <label className="block text-xs font-semibold text-stone-700 mb-1">Mailing address</label>
                <input
                  type="text"
                  placeholder="Street address"
                  required
                  value={form.street_address}
                  onChange={(e) => update("street_address", e.target.value)}
                  className={inputClass}
                />
              </div>

              <input
                type="text"
                placeholder="Apt, suite, unit (optional)"
                value={form.street_address_2}
                onChange={(e) => update("street_address_2", e.target.value)}
                className={inputClass}
              />

              <div className="grid grid-cols-6 gap-3">
                <input
                  type="text"
                  placeholder="City"
                  required
                  value={form.city}
                  onChange={(e) => update("city", e.target.value)}
                  className={`${inputClass} col-span-3`}
                />
                <input
                  type="text"
                  placeholder="State"
                  required
                  maxLength={2}
                  value={form.state}
                  onChange={(e) => update("state", e.target.value.toUpperCase())}
                  className={`${inputClass} col-span-1 uppercase`}
                />
                <input
                  type="text"
                  placeholder="ZIP"
                  required
                  maxLength={10}
                  value={form.zip}
                  onChange={(e) => update("zip", e.target.value)}
                  className={`${inputClass} col-span-2`}
                />
              </div>

              <div className="pt-2">
                <label className="block text-xs font-semibold text-stone-700 mb-1">Anything else you&rsquo;d like us to know (optional)</label>
                <textarea
                  placeholder="About your store, your customers, questions for us..."
                  rows={4}
                  value={form.message}
                  onChange={(e) => update("message", e.target.value)}
                  className={`${inputClass} resize-none`}
                />
              </div>

              <button
                type="submit"
                disabled={status === "sending"}
                className="w-full bg-emerald-700 hover:bg-emerald-800 text-white py-3 rounded-lg font-semibold transition-colors disabled:opacity-50"
              >
                {status === "sending" ? "Sending..." : "Apply to join"}
              </button>
              {status === "error" && (
                <p className="text-red-600 text-sm text-center">Something went wrong. Please try again.</p>
              )}
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
