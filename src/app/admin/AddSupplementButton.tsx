"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const emptyForm = {
  name: "",
  slug: "",
  icon: "💊",
  category: "vitamins",
  tagline: "",
  description: "",
  evidence_level: "moderate",
  benefits: "",
  side_effects: "",
  timing_recommendation: "",
  dose_recommendation: "",
};

export default function AddSupplementButton() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  function generateSlug(name: string) {
    return name.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").trim();
  }

  async function handleSave() {
    if (!form.name.trim()) { setError("Name is required"); return; }
    setSaving(true);
    setError("");

    const slug = form.slug || generateSlug(form.name);

    const res = await fetch("/api/admin/supplement/add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        slug,
        benefits: form.benefits.split("\n").map(s => s.trim()).filter(Boolean),
        side_effects: form.side_effects.split("\n").map(s => s.trim()).filter(Boolean),
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Failed to save");
      setSaving(false);
      return;
    }

    setOpen(false);
    setForm(emptyForm);
    router.refresh();
    setSaving(false);
  }

  const categories = ["vitamins", "minerals", "nootropics", "adaptogens", "longevity", "sleep", "gut-health", "hormones", "amino-acids", "herbs", "phytonutrients", "ritual", "other"];

  return (
    <>
      <button onClick={() => setOpen(true)}
        className="text-xs bg-emerald-700 hover:bg-emerald-600 text-white px-3 py-1.5 rounded-lg font-medium transition-colors">
        + Add Supplement
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-stone-800 rounded-2xl w-full max-w-2xl p-6 space-y-4 border border-stone-700 my-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-white text-lg">Add New Supplement</h2>
              <button onClick={() => setOpen(false)} className="text-stone-400 hover:text-white text-xl">✕</button>
            </div>

            {error && <div className="bg-red-900/50 border border-red-700 rounded-xl px-4 py-3 text-sm text-red-300">{error}</div>}

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-xs font-semibold text-stone-400 uppercase tracking-wide block mb-1">Name *</label>
                <input type="text" value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value, slug: generateSlug(e.target.value) }))}
                  placeholder="e.g. Ashwagandha"
                  className="w-full bg-stone-700 border border-stone-600 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-400 uppercase tracking-wide block mb-1">Icon (emoji)</label>
                <input type="text" value={form.icon}
                  onChange={e => setForm(f => ({ ...f, icon: e.target.value }))}
                  className="w-full bg-stone-700 border border-stone-600 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-400 uppercase tracking-wide block mb-1">Category</label>
                <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  className="w-full bg-stone-700 border border-stone-600 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                  {categories.map(c => <option key={c} value={c}>{c.replace("-", " ")}</option>)}
                </select>
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
                <label className="text-xs font-semibold text-stone-400 uppercase tracking-wide block mb-1">Slug (auto)</label>
                <input type="text" value={form.slug}
                  onChange={e => setForm(f => ({ ...f, slug: e.target.value }))}
                  className="w-full bg-stone-700 border border-stone-600 rounded-xl px-3 py-2 text-stone-400 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-stone-400 uppercase tracking-wide block mb-1">Tagline</label>
              <input type="text" value={form.tagline}
                onChange={e => setForm(f => ({ ...f, tagline: e.target.value }))}
                placeholder="e.g. Sleep · stress relief · muscle recovery"
                className="w-full bg-stone-700 border border-stone-600 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>

            <div>
              <label className="text-xs font-semibold text-stone-400 uppercase tracking-wide block mb-1">Description</label>
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={3} placeholder="2-3 sentences about this supplement..."
                className="w-full bg-stone-700 border border-stone-600 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none" />
            </div>

            <div>
              <label className="text-xs font-semibold text-stone-400 uppercase tracking-wide block mb-1">Benefits (one per line)</label>
              <textarea value={form.benefits} onChange={e => setForm(f => ({ ...f, benefits: e.target.value }))}
                rows={4} placeholder="Immune support&#10;Bone health&#10;Mood improvement"
                className="w-full bg-stone-700 border border-stone-600 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none font-mono" />
            </div>

            <div>
              <label className="text-xs font-semibold text-stone-400 uppercase tracking-wide block mb-1">Side Effects (one per line)</label>
              <textarea value={form.side_effects} onChange={e => setForm(f => ({ ...f, side_effects: e.target.value }))}
                rows={3} placeholder="May cause nausea&#10;Avoid with blood thinners"
                className="w-full bg-stone-700 border border-stone-600 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none font-mono" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-stone-400 uppercase tracking-wide block mb-1">Timing</label>
                <input type="text" value={form.timing_recommendation}
                  onChange={e => setForm(f => ({ ...f, timing_recommendation: e.target.value }))}
                  placeholder="e.g. Morning with food"
                  className="w-full bg-stone-700 border border-stone-600 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div>
                <label className="text-xs font-semibold text-stone-400 uppercase tracking-wide block mb-1">Dose</label>
                <input type="text" value={form.dose_recommendation}
                  onChange={e => setForm(f => ({ ...f, dose_recommendation: e.target.value }))}
                  placeholder="e.g. 300–600mg daily"
                  className="w-full bg-stone-700 border border-stone-600 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={() => setOpen(false)}
                className="flex-1 border border-stone-600 text-stone-300 py-2.5 rounded-xl text-sm font-medium hover:bg-stone-700 transition-colors">
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 bg-emerald-700 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-emerald-600 transition-colors disabled:opacity-50">
                {saving ? "Saving..." : "Add Supplement"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
