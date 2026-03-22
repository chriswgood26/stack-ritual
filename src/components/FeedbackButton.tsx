"use client";

import { useState } from "react";

export default function FeedbackButton() {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  async function handleSubmit() {
    if (!message.trim()) return;
    setStatus("loading");
    const res = await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating, message }),
    });
    if (res.ok) {
      setStatus("success");
      setTimeout(() => { setOpen(false); setStatus("idle"); setMessage(""); setRating(5); }, 2000);
    } else {
      setStatus("error");
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center justify-between px-4 py-4 w-full hover:bg-stone-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-xl">💬</span>
          <span className="font-medium text-stone-900 text-sm">Share app feedback</span>
        </div>
        <span className="text-stone-300">›</span>
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center p-4 pb-8">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-stone-900 text-lg">Share your feedback</h2>
              <button onClick={() => setOpen(false)} className="text-stone-400 hover:text-stone-700 text-xl">✕</button>
            </div>

            {status === "success" ? (
              <div className="text-center py-6">
                <div className="text-4xl mb-2">🙏</div>
                <p className="font-semibold text-emerald-700">Thank you!</p>
                <p className="text-stone-500 text-sm mt-1">Your feedback helps us improve Stack Ritual.</p>
              </div>
            ) : (
              <>
                <div>
                  <label className="text-xs font-semibold text-stone-500 uppercase tracking-wide block mb-2">How are you liking Stack Ritual?</label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map(star => (
                      <button key={star} onClick={() => setRating(star)}
                        className={`text-3xl transition-transform hover:scale-110 ${star <= rating ? "text-amber-400" : "text-stone-200"}`}>
                        ★
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-stone-500 uppercase tracking-wide block mb-1.5">Your feedback</label>
                  <textarea
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    placeholder="What's working well? What could be better? Any features you'd love to see?"
                    rows={4}
                    className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                  />
                </div>

                {status === "error" && <p className="text-red-500 text-xs text-center">Something went wrong. Try again.</p>}

                <div className="flex gap-3">
                  <button onClick={() => setOpen(false)}
                    className="flex-1 border border-stone-200 text-stone-600 py-3 rounded-xl font-medium text-sm hover:bg-stone-50 transition-colors">
                    Cancel
                  </button>
                  <button onClick={handleSubmit} disabled={!message.trim() || status === "loading"}
                    className="flex-1 bg-emerald-700 text-white py-3 rounded-xl font-semibold text-sm hover:bg-emerald-800 transition-colors disabled:opacity-60">
                    {status === "loading" ? "Sending..." : "Send feedback"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
