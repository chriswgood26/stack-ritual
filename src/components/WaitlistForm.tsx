"use client";

import { useState } from "react";

export default function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "duplicate" | "error">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");

    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();

      if (res.ok) {
        setStatus(data.message === "already_subscribed" ? "duplicate" : "success");
        setEmail("");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-8 py-6 text-center max-w-md mx-auto">
        <div className="text-3xl mb-2">🎉</div>
        <p className="text-emerald-800 font-semibold text-lg">You&apos;re on the list!</p>
        <p className="text-emerald-700 text-sm mt-1">We&apos;ll let you know the moment Stack Ritual launches.</p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto">
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email"
          required
          className="flex-1 px-5 py-4 rounded-full border border-stone-300 text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-base bg-white"
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className="bg-emerald-700 text-white px-7 py-4 rounded-full font-semibold hover:bg-emerald-800 transition-colors disabled:opacity-60 whitespace-nowrap shadow-sm"
        >
          {status === "loading" ? "Joining..." : "Join waitlist →"}
        </button>
      </form>

      {status === "duplicate" && (
        <p className="text-center text-stone-500 text-sm mt-3">You&apos;re already on the list — we&apos;ll be in touch! 👋</p>
      )}
      {status === "error" && (
        <p className="text-center text-red-500 text-sm mt-3">Something went wrong. Please try again.</p>
      )}
      <p className="text-center text-stone-400 text-sm mt-3">No spam. Just a launch notification when we&apos;re ready.</p>
    </div>
  );
}
