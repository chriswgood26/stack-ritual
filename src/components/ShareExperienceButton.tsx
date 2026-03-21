"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Supplement {
  id: string;
  name: string;
  icon: string;
}

export default function ShareExperienceButton({ supplements }: { supplements: Supplement[] }) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [form, setForm] = useState({
    supplement_id: "",
    rating: 5,
    title: "",
    body: "",
    duration_weeks: "",
    purchased_from: "",
  });
  const router = useRouter();

  async function handleSubmit() {
    if (!form.supplement_id || !form.body.trim()) return;
    setStatus("loading");

    const res = await fetch("/api/experiences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (res.ok) {
      setStatus("success");
      setTimeout(() => {
        setOpen(false);
        setStatus("idle");
        setForm({ supplement_id: "", rating: 5, title: "", body: "", duration_weeks: "" });
        router.refresh();
      }, 1500);
    } else {
      setStatus("error");
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="bg-emerald-700 text-white text-sm font-semibold px-4 py-1.5 rounded-full hover:bg-emerald-800 transition-colors"
      >
        + Share yours
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center p-4 pb-20">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 space-y-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-stone-900 text-lg">Share your experience</h2>
              <button onClick={() => setOpen(false)} className="text-stone-400 hover:text-stone-700 text-xl">✕</button>
            </div>

            {status === "success" ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-3">🎉</div>
                <p className="font-semibold text-emerald-700">Experience shared!</p>
                <p className="text-stone-500 text-sm mt-1">Thanks for helping the community.</p>
              </div>
            ) : (
              <>
                {/* Supplement picker */}
                <div>
                  <label className="text-xs font-semibold text-stone-500 uppercase tracking-wide block mb-1.5">Supplement *</label>
                  <select
                    value={form.supplement_id}
                    onChange={e => setForm(f => ({ ...f, supplement_id: e.target.value }))}
                    className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  >
                    <option value="">Select a supplement...</option>
                    {supplements.map(s => (
                      <option key={s.id} value={s.id}>{s.icon} {s.name}</option>
                    ))}
                  </select>
                </div>

                {/* Star rating */}
                <div>
                  <label className="text-xs font-semibold text-stone-500 uppercase tracking-wide block mb-1.5">Rating *</label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map(star => (
                      <button
                        key={star}
                        onClick={() => setForm(f => ({ ...f, rating: star }))}
                        className={`text-3xl transition-transform hover:scale-110 ${star <= form.rating ? "text-amber-400" : "text-stone-200"}`}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                </div>

                {/* Title */}
                <div>
                  <label className="text-xs font-semibold text-stone-500 uppercase tracking-wide block mb-1.5">Title (optional)</label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                    placeholder="e.g. Game changer for sleep"
                    className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {/* Body */}
                <div>
                  <label className="text-xs font-semibold text-stone-500 uppercase tracking-wide block mb-1.5">Your experience *</label>
                  <textarea
                    value={form.body}
                    onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
                    placeholder="What effects have you noticed? How long did it take? Any tips on dose or timing?"
                    rows={4}
                    className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                  />
                </div>

                {/* Duration */}
                <div>
                  <label className="text-xs font-semibold text-stone-500 uppercase tracking-wide block mb-1.5">How long have you been taking it?</label>
                  <select
                    value={form.duration_weeks}
                    onChange={e => setForm(f => ({ ...f, duration_weeks: e.target.value }))}
                    className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  >
                    <option value="">Select...</option>
                    <option value="1">Less than a week</option>
                    <option value="2">1–2 weeks</option>
                    <option value="4">3–4 weeks</option>
                    <option value="8">1–2 months</option>
                    <option value="16">3–4 months</option>
                    <option value="26">6 months</option>
                    <option value="52">1 year+</option>
                  </select>
                </div>

                {/* Where purchased */}
                <div>
                  <label className="text-xs font-semibold text-stone-500 uppercase tracking-wide block mb-1.5">Where purchased (optional)</label>
                  <input
                    type="text"
                    value={form.purchased_from}
                    onChange={e => setForm(f => ({ ...f, purchased_from: e.target.value }))}
                    placeholder="e.g. Amazon, iHerb, Whole Foods, Costco"
                    className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {status === "error" && (
                  <p className="text-red-500 text-xs text-center">Something went wrong. Try again.</p>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setOpen(false)}
                    className="flex-1 border border-stone-200 text-stone-600 py-3 rounded-xl font-medium text-sm hover:bg-stone-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={!form.supplement_id || !form.body.trim() || status === "loading"}
                    className="flex-1 bg-emerald-700 text-white py-3 rounded-xl font-semibold text-sm hover:bg-emerald-800 transition-colors disabled:opacity-60"
                  >
                    {status === "loading" ? "Sharing..." : "Share experience"}
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
