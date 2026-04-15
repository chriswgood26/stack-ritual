"use client";

import { useState } from "react";

interface Props {
  source?: string;
  variant?: "inline" | "card";
}

export default function NewsletterSignup({ source = "footer", variant = "inline" }: Props) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "saving" | "done" | "error">("idle");
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setState("saving");
    setError("");
    try {
      const r = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), source }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        setError(d.error || "Subscribe failed");
        setState("error");
        return;
      }
      setState("done");
      setEmail("");
    } catch {
      setError("Network error");
      setState("error");
    }
  }

  if (variant === "card") {
    return (
      <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm">
        <h3 className="font-bold text-stone-900 text-lg mb-1">🌿 Get our newsletter</h3>
        <p className="text-stone-600 text-sm mb-4">Supplement tips and evidence-based health insights. No spam.</p>
        {state === "done" ? (
          <p className="text-emerald-700 text-sm font-semibold">✓ Thanks! Check your inbox for a welcome email.</p>
        ) : (
          <form onSubmit={submit} className="flex flex-col sm:flex-row gap-2">
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="flex-1 border border-stone-300 rounded-full px-4 py-2.5 text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
            <button
              type="submit"
              disabled={state === "saving"}
              className="bg-emerald-700 text-white px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-emerald-800 transition-colors disabled:opacity-60"
            >
              {state === "saving" ? "..." : "Subscribe"}
            </button>
          </form>
        )}
        {error && <p className="text-red-600 text-xs mt-2">{error}</p>}
      </div>
    );
  }

  return (
    <div>
      {state === "done" ? (
        <p className="text-emerald-400 text-sm">✓ Subscribed! Check your inbox.</p>
      ) : (
        <form onSubmit={submit} className="flex gap-2">
          <input
            type="email"
            required
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="Get our newsletter"
            className="flex-1 min-w-0 border border-stone-300 rounded-full px-4 py-2 text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-600"
          />
          <button
            type="submit"
            disabled={state === "saving"}
            className="bg-emerald-700 text-white px-4 py-2 rounded-full text-sm font-semibold hover:bg-emerald-800 transition-colors disabled:opacity-60 whitespace-nowrap"
          >
            {state === "saving" ? "..." : "Join"}
          </button>
        </form>
      )}
      {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
    </div>
  );
}
