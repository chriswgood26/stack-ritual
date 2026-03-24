"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Supplement {
  id: string;
  name: string;
  slug: string;
  category: string;
  icon: string;
  tagline: string;
  description: string;
  evidence_level: string;
  benefits: string[];
  side_effects: string[];
  timing_recommendation: string;
  dose_recommendation: string;
}

export default function EditSupplementButton({ supplement }: { supplement: Supplement }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: supplement.name || "",
    icon: supplement.icon || "💊",
    category: supplement.category || "other",
    tagline: supplement.tagline || "",
    description: supplement.description || "",
    evidence_level: supplement.evidence_level || "moderate",
    benefits: (supplement.benefits || []).join("\n"),
    side_effects: (supplement.side_effects || []).join("\n"),
    timing_recommendation: supplement.timing_recommendation || "",
    dose_recommendation: supplement.dose_recommendation || "",
  });
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  async function handleSave() {
    setSaving(true);
    await fetch("/api/admin/supplement", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: supplement.id,
        ...form,
        benefits: form.benefits.split("\n").map(s => s.trim()).filter(Boolean),
        side_effects: form.side_effects.split("\n").map(s => s.trim()).filter(Boolean),
      }),
    });
    setOpen(false);
    router.refresh();
    setSaving(false);
  }

  return (
    <>
      <button onClick={() => setOpen(true)}
        className="text-xs bg-emerald-800 hover:bg-emerald-700 text-emerald-200 px-3 py-1.5 rounded-lg font-medium transition-colors">
        ✏️ Edit
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-stone-800 rounded-2xl w-full max-w-2xl p-6 space-y-4 border border-stone-700 my-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-white text-lg">Edit: {supplement.name}</h2>
              <button onClick={() => setOpen(false)} className="text-stone-400 hover:text-white text-xl">✕</button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {[
                { key: "name", label: "Name" },
                { key: "icon", label: "Icon" },
                { key: "category", label: "Category" },
                { key: "tagline", label: "Tagline" },
              ].map(({ key, label }) => (
                <div key={key}>
                  <label className="text-xs font-semibold text-stone-400 uppercase tracking-wide block mb-1">{label}</label>
                  <input type="text" value={form[key as keyof typeof form] as string}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    className="w-full bg-stone-700 border border-stone-600 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
              ))}
            </div>

            <div>
              <label className="text-xs font-semibold text-stone-400 uppercase tracking-wide block mb-1">Evidence Level</label>
              <select value={form.evidence_level} onChange={e => setForm(f => ({ ...f, evidence_level: e.target.value }))}
                className="w-full bg-stone-700 border border-stone-600 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                <option value="strong">Strong</option>
                <option value="moderate">Moderate</option>
                <option value="limited">Limited</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-stone-400 uppercase tracking-wide block mb-1">Description</label>
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={3} className="w-full bg-stone-700 border border-stone-600 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none" />
            </div>

            <div>
              <label className="text-xs font-semibold text-stone-400 uppercase tracking-wide block mb-1">Benefits (one per line)</label>
              <textarea value={form.benefits} onChange={e => setForm(f => ({ ...f, benefits: e.target.value }))}
                rows={5} placeholder="Immune support&#10;Bone health&#10;Mood improvement"
                className="w-full bg-stone-700 border border-stone-600 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none font-mono" />
            </div>

            <div>
              <label className="text-xs font-semibold text-stone-400 uppercase tracking-wide block mb-1">Side Effects (one per line)</label>
              <textarea value={form.side_effects} onChange={e => setForm(f => ({ ...f, side_effects: e.target.value }))}
                rows={3} placeholder="May cause nausea at high doses&#10;Avoid with blood thinners"
                className="w-full bg-stone-700 border border-stone-600 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none font-mono" />
            </div>

            <div>
              <label className="text-xs font-semibold text-stone-400 uppercase tracking-wide block mb-1">Timing Recommendation</label>
              <input type="text" value={form.timing_recommendation}
                onChange={e => setForm(f => ({ ...f, timing_recommendation: e.target.value }))}
                className="w-full bg-stone-700 border border-stone-600 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>

            <div>
              <label className="text-xs font-semibold text-stone-400 uppercase tracking-wide block mb-1">Dose Recommendation</label>
              <input type="text" value={form.dose_recommendation}
                onChange={e => setForm(f => ({ ...f, dose_recommendation: e.target.value }))}
                className="w-full bg-stone-700 border border-stone-600 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={() => setOpen(false)}
                className="flex-1 border border-stone-600 text-stone-300 py-2.5 rounded-xl text-sm font-medium hover:bg-stone-700 transition-colors">
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 bg-emerald-700 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-emerald-600 transition-colors disabled:opacity-50">
                {saving ? "Saving..." : "Save changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
