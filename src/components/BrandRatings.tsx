"use client";

import { useState, useEffect } from "react";

interface BrandStat {
  brand_name: string;
  count: number;
  avg_quality: number;
  avg_effectiveness: number;
  avg_value: number;
  avg_overall: number;
  reviews: { review: string; created_at: string }[];
}

function StarBar({ score, label }: { score: number; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-stone-500 w-24">{label}</span>
      <div className="flex gap-0.5">
        {[1,2,3,4,5].map(i => (
          <div key={i} className={`w-3 h-3 rounded-sm ${i <= Math.round(score) ? "bg-emerald-500" : "bg-stone-200"}`} />
        ))}
      </div>
      <span className="text-xs font-semibold text-stone-700">{score}</span>
    </div>
  );
}

function RateButton({ supplementId, supplementName, onSubmitted }: { supplementId: string; supplementName: string; onSubmitted: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ brand_name: "", quality_score: 0, effectiveness_score: 0, value_score: 0, review: "" });
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!form.brand_name || !form.quality_score) return;
    setLoading(true);
    await fetch("/api/brands", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ supplement_id: supplementId, ...form }),
    });
    setOpen(false);
    setForm({ brand_name: "", quality_score: 0, effectiveness_score: 0, value_score: 0, review: "" });
    onSubmitted();
    setLoading(false);
  }

  const StarPicker = ({ label, field }: { label: string; field: "quality_score" | "effectiveness_score" | "value_score" }) => (
    <div>
      <label className="text-xs font-semibold text-stone-500 uppercase tracking-wide block mb-1.5">{label}</label>
      <div className="flex gap-1.5">
        {[1,2,3,4,5].map(i => (
          <button key={i} onClick={() => setForm(f => ({ ...f, [field]: i }))}
            className={`text-xl transition-transform hover:scale-110 ${i <= form[field] ? "text-amber-400" : "text-stone-200"}`}>
            ★
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <>
      <button onClick={() => setOpen(true)}
        className="text-xs bg-emerald-700 text-white px-3 py-1.5 rounded-full font-semibold hover:bg-emerald-800 transition-colors">
        + Rate a brand
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center p-4 pb-8">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-stone-900">Rate a brand — {supplementName}</h2>
              <button onClick={() => setOpen(false)} className="text-stone-400 text-xl">✕</button>
            </div>

            <div>
              <label className="text-xs font-semibold text-stone-500 uppercase tracking-wide block mb-1.5">Brand name *</label>
              <input type="text" value={form.brand_name}
                onChange={e => setForm(f => ({ ...f, brand_name: e.target.value }))}
                placeholder="e.g. Thorne, Life Extension, Now Foods"
                className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>

            <StarPicker label="Quality *" field="quality_score" />
            <StarPicker label="Effectiveness" field="effectiveness_score" />
            <StarPicker label="Value for money" field="value_score" />

            <div>
              <label className="text-xs font-semibold text-stone-500 uppercase tracking-wide block mb-1.5">Review (optional)</label>
              <textarea value={form.review}
                onChange={e => setForm(f => ({ ...f, review: e.target.value }))}
                placeholder="What did you notice about this brand?"
                rows={3}
                className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none" />
            </div>

            <div className="flex gap-3">
              <button onClick={() => setOpen(false)}
                className="flex-1 border border-stone-200 text-stone-600 py-3 rounded-xl font-medium text-sm hover:bg-stone-50">
                Cancel
              </button>
              <button onClick={handleSubmit}
                disabled={!form.brand_name || !form.quality_score || loading}
                className="flex-1 bg-emerald-700 text-white py-3 rounded-xl font-semibold text-sm hover:bg-emerald-800 disabled:opacity-50">
                {loading ? "Submitting..." : "Submit rating"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function BrandRatings({ supplementId, supplementName }: { supplementId: string; supplementName: string }) {
  const [brands, setBrands] = useState<BrandStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  async function loadBrands() {
    const res = await fetch(`/api/brands?supplement_id=${supplementId}`);
    const data = await res.json();
    setBrands(data.brands || []);
    setLoading(false);
  }

  useEffect(() => { loadBrands(); }, [supplementId]);

  const overallColor = (score: number) =>
    score >= 4 ? "text-emerald-600" : score >= 3 ? "text-amber-500" : "text-red-500";

  return (
    <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-stone-900">⭐ Brand Ratings</h2>
        <RateButton supplementId={supplementId} supplementName={supplementName} onSubmitted={loadBrands} />
      </div>

      {loading ? (
        <p className="text-stone-400 text-sm text-center py-4">Loading ratings...</p>
      ) : brands.length === 0 ? (
        <div className="text-center py-4">
          <p className="text-stone-500 text-sm">No brand ratings yet.</p>
          <p className="text-stone-400 text-xs mt-1">Be the first to rate a brand for {supplementName}!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {brands.map(brand => (
            <div key={brand.brand_name} className="border border-stone-100 rounded-xl overflow-hidden">
              <button
                onClick={() => setExpanded(expanded === brand.brand_name ? null : brand.brand_name)}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-stone-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div>
                    <div className="font-semibold text-stone-900 text-sm">{brand.brand_name}</div>
                    <div className="text-xs text-stone-500">{brand.count} rating{brand.count !== 1 ? "s" : ""}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`text-2xl font-bold ${overallColor(brand.avg_overall)}`}>
                    {brand.avg_overall}
                  </div>
                  <span className="text-stone-300 text-sm">{expanded === brand.brand_name ? "▲" : "▼"}</span>
                </div>
              </button>

              {expanded === brand.brand_name && (
                <div className="px-4 pb-4 space-y-2 border-t border-stone-100 pt-3">
                  <StarBar score={brand.avg_quality} label="Quality" />
                  <StarBar score={brand.avg_effectiveness} label="Effectiveness" />
                  <StarBar score={brand.avg_value} label="Value" />
                  {brand.reviews.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {brand.reviews.map((r, i) => (
                        <p key={i} className="text-xs text-stone-600 bg-stone-50 rounded-lg px-3 py-2 italic">
                          &quot;{r.review}&quot;
                        </p>
                      ))}
                    </div>
                  )}
                  <div className="mt-3 flex gap-2">
                    <a href={`https://www.iherb.com/search?q=${encodeURIComponent(brand.brand_name + ' ' + supplementName)}&rcode=7113351`}
                      target="_blank" rel="noopener noreferrer"
                      className="flex-1 bg-emerald-50 border border-emerald-200 text-emerald-700 py-2 rounded-xl text-xs font-semibold text-center hover:bg-emerald-100">
                      Buy on iHerb →
                    </a>
                    <a href={`https://www.amazon.com/s?k=${encodeURIComponent(brand.brand_name + ' ' + supplementName)}&tag=stackritual-20`}
                      target="_blank" rel="noopener noreferrer"
                      className="flex-1 bg-stone-50 border border-stone-200 text-stone-700 py-2 rounded-xl text-xs font-semibold text-center hover:bg-stone-100">
                      Buy on Amazon →
                    </a>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
