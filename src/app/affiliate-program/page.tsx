"use client";

import { useState } from "react";
import Link from "next/link";

export default function AffiliateProgramPage() {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    try {
      const res = await fetch("/api/affiliates/interest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, source: "personal" }),
      });
      if (res.ok) {
        setStatus("sent");
        setForm({ name: "", email: "", message: "" });
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  }

  const inputClass =
    "w-full bg-white border border-stone-300 rounded-lg px-4 py-3 text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50";

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-50 to-emerald-50/30">
      {/* Nav */}
      <nav className="bg-white border-b border-stone-200 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl">🌿</span>
            <span className="font-bold text-stone-900">Stack Ritual</span>
          </Link>
          <Link href="/" className="text-stone-600 hover:text-stone-900 text-sm">← Back to site</Link>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-4xl md:text-5xl font-bold text-stone-900 leading-tight mb-4">
          Join the Stack Ritual Affiliate Program 🌿
        </h1>
        <p className="text-stone-600 text-lg mb-10">
          Love Stack Ritual? Get paid for sharing it. Earn <strong>50% commission</strong> on the first month and <strong>10% recurring</strong> for every subscriber you bring on &mdash; for as long as they stay.
        </p>

        {/* How it works */}
        <div className="bg-white border border-stone-200 rounded-2xl p-8 mb-10 shadow-sm">
          <h2 className="text-xl font-bold text-stone-900 mb-6">How It Works</h2>
          <div className="space-y-5">
            <div className="flex gap-4">
              <div className="bg-emerald-100 text-emerald-700 rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">1</div>
              <div>
                <h3 className="text-stone-900 font-semibold mb-1">Get your referral link</h3>
                <p className="text-stone-600 text-sm">We&rsquo;ll give you a unique link to share with your friends, followers, and anyone who&rsquo;s into wellness.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="bg-emerald-100 text-emerald-700 rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">2</div>
              <div>
                <h3 className="text-stone-900 font-semibold mb-1">Share it with your community</h3>
                <p className="text-stone-600 text-sm">Instagram, TikTok, Reddit, your email newsletter, your link-in-bio &mdash; anywhere you connect with people who care about their health routines.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="bg-emerald-100 text-emerald-700 rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">3</div>
              <div>
                <h3 className="text-stone-900 font-semibold mb-1">Earn recurring commission</h3>
                <p className="text-stone-600 text-sm">50% of their first month and 10% for every month after. No cap, no expiration &mdash; as long as they stay subscribed, you keep earning.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Commission breakdown */}
        <div className="bg-emerald-600 text-white rounded-2xl p-8 mb-10">
          <h2 className="text-xl font-bold mb-4">Commission Breakdown</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white/10 rounded-xl p-5">
              <div className="text-4xl font-bold">50%</div>
              <div className="text-sm opacity-90 mt-1">First month commission</div>
              <div className="text-xs opacity-75 mt-2">On their very first paid month</div>
            </div>
            <div className="bg-white/10 rounded-xl p-5">
              <div className="text-4xl font-bold">10%</div>
              <div className="text-sm opacity-90 mt-1">Recurring commission</div>
              <div className="text-xs opacity-75 mt-2">Every month they stay subscribed</div>
            </div>
          </div>
        </div>

        {/* Tax disclaimer */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-10 text-sm text-stone-700">
          <div className="flex gap-3">
            <span className="text-amber-600 flex-shrink-0">⚠️</span>
            <div>
              <strong className="text-amber-900">Tax Responsibility:</strong>{" "}
              Affiliates are independent contractors and are responsible for reporting and paying any applicable taxes on payouts. Stack Ritual LLC does not withhold taxes. If your total annual payouts reach $600, a 1099-NEC may be issued at year-end.
            </div>
          </div>
        </div>

        {/* Signup form */}
        <div className="bg-white border border-stone-200 rounded-2xl p-8 shadow-sm">
          <h2 className="text-xl font-bold text-stone-900 mb-2">Interested? Get in touch.</h2>
          <p className="text-stone-600 mb-6">Fill out the form and we&rsquo;ll reach out with your unique referral link and program details.</p>

          {status === "sent" ? (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg px-4 py-3">
              Thanks! We&rsquo;ll be in touch soon with your affiliate details.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="text"
                placeholder="Your name"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className={inputClass}
              />
              <input
                type="email"
                placeholder="you@example.com"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className={inputClass}
              />
              <textarea
                placeholder="Tell us about your audience or how you'd share Stack Ritual (optional)"
                rows={4}
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                className={`${inputClass} resize-none`}
              />
              <button
                type="submit"
                disabled={status === "sending"}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-lg font-semibold transition-colors disabled:opacity-50"
              >
                {status === "sending" ? "Sending..." : "Request Information"}
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
