"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  itemId: string;
  currentDose?: string | null;
  currentTiming?: string | null;
  currentBrand?: string | null;
  currentNotes?: string | null;
  currentFrequency?: string | null;
  name: string;
  currentQuantityTotal?: number | null;
  currentQuantityRemaining?: number | null;
  currentQuantityUnit?: string | null;
  currentAutoDecrement?: boolean | null;
  asLabel?: boolean;
  labelClassName?: string;
}

const timingOptions = [
  { group: "Daily", options: [
    { value: "morning-fasted", label: "Morning — Fasted" },
    { value: "morning-food", label: "Morning — With Food" },
    { value: "afternoon", label: "Afternoon" },
    { value: "evening", label: "Evening" },
    { value: "bedtime", label: "Bedtime" },
    { value: "split", label: "Split Dose (AM + PM)" },
  ]},
  { group: "Multiple times daily", options: [
    { value: "2x-daily", label: "2x Daily (AM + PM)" },
    { value: "2x-with-meals", label: "2x Daily with Meals" },
    { value: "3x-daily", label: "3x Daily (AM, Midday, PM)" },
    { value: "3x-with-meals", label: "3x Daily with Meals" },
    { value: "4x-daily", label: "4x Daily" },
  ]},
  { group: "Less than daily", options: [
    { value: "weekly", label: "Weekly" },
    { value: "biweekly", label: "Twice a week" },
    { value: "3x-week", label: "3x per week" },
    { value: "monthly", label: "Monthly" },
    { value: "cycle-5-2", label: "Cycle — 5 days on, 2 off" },
    { value: "cycle-8-2w", label: "Cycle — 8 weeks on, 2 weeks off" },
    { value: "as-needed", label: "As needed" },
  ]},
];

export default function EditStackItemButton({ itemId, currentDose, currentTiming, currentBrand, currentNotes, currentFrequency, name, currentQuantityTotal, currentQuantityRemaining, currentQuantityUnit, currentAutoDecrement, asLabel = false, labelClassName }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    dose: currentDose || "",
    timing: currentTiming || "",
    brand: currentBrand || "",
    notes: currentNotes || "",
    frequency_type: currentFrequency || "daily",
    quantity_total: currentQuantityTotal?.toString() || "",
    quantity_remaining: currentQuantityRemaining?.toString() || "",
    quantity_unit: currentQuantityUnit || "capsules",
    auto_decrement: currentAutoDecrement !== false,
  });
  const router = useRouter();

  async function handleSave() {
    setLoading(true);
    const res = await fetch("/api/stack/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ item_id: itemId, dose: form.dose, timing: form.timing, brand: form.brand, notes: form.notes, frequency_type: form.frequency_type, quantity_total: form.quantity_total, quantity_remaining: form.quantity_remaining, quantity_unit: form.quantity_unit, auto_decrement: form.auto_decrement }),
    });
    if (res.ok) {
      setOpen(false);
      router.refresh();
    }
    setLoading(false);
  }

  return (
    <>
      <button onClick={() => setOpen(true)}
        className={asLabel ? (labelClassName || "font-medium text-sm text-stone-900") : "text-stone-300 hover:text-emerald-500 transition-colors text-lg p-1"}>
        {asLabel ? name : "✏️"}
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center p-4 pb-8">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-stone-900">Edit — {name}</h2>
              <button onClick={() => setOpen(false)} className="text-stone-400 hover:text-stone-700 text-xl">✕</button>
            </div>

            <div>
              <label className="text-xs font-semibold text-stone-500 uppercase tracking-wide block mb-1.5">Dose</label>
              <input type="text" value={form.dose}
                onChange={e => setForm(f => ({ ...f, dose: e.target.value }))}
                placeholder="e.g. 500mg, 5000 IU"
                className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>

            <div>
              <label className="text-xs font-semibold text-stone-500 uppercase tracking-wide block mb-1.5">When to take</label>
              <select value={form.timing}
                onChange={e => setForm(f => ({ ...f, timing: e.target.value }))}
                className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white">
                <option value="">Select timing...</option>
                {timingOptions.map(g => (
                  <optgroup key={g.group} label={g.group}>
                    {g.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </optgroup>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-stone-500 uppercase tracking-wide block mb-1.5">Brand (optional)</label>
              <input type="text" value={form.brand}
                onChange={e => setForm(f => ({ ...f, brand: e.target.value }))}
                placeholder="e.g. Thorne, Life Extension"
                className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>

            <div>
              <label className="text-xs font-semibold text-stone-500 uppercase tracking-wide block mb-1.5">Notes (optional)</label>
              <textarea value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Any personal notes about this supplement..."
                rows={2}
                className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none" />
            </div>

            <div>
              <label className="text-xs font-semibold text-stone-500 uppercase tracking-wide block mb-1.5">Supply tracking (optional)</label>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-xs text-stone-400 block mb-1">Total qty</label>
                  <input type="number" value={form.quantity_total}
                    onChange={e => setForm(f => ({ ...f, quantity_total: e.target.value, quantity_remaining: f.quantity_remaining || e.target.value }))}
                    placeholder="90"
                    className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div>
                  <label className="text-xs text-stone-400 block mb-1">Remaining</label>
                  <input type="number" value={form.quantity_remaining}
                    onChange={e => {
                      const val = e.target.value;
                      const max = form.quantity_total ? parseInt(form.quantity_total) : Infinity;
                      const num = parseInt(val);
                      setForm(f => ({ ...f, quantity_remaining: (!isNaN(num) && num > max) ? form.quantity_total : val }));
                    }}
                    max={form.quantity_total || undefined}
                    placeholder="90"
                    className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div>
                  <label className="text-xs text-stone-400 block mb-1">Unit</label>
                  <select value={form.quantity_unit} onChange={e => setForm(f => ({ ...f, quantity_unit: e.target.value }))}
                    className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white">
                    <option>capsules</option>
                    <option>tablets</option>
                    <option>softgels</option>
                    <option>gummies</option>
                    <option>supplies</option>
                    <option>ml</option>
                    <option>scoops</option>
                    <option>drops</option>
                  </select>
                </div>
              </div>
              <p className="text-xs text-stone-400 mt-1.5">We'll alert you when you're running low (~2 weeks left)</p>
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={() => setOpen(false)}
                className="flex-1 border border-stone-200 text-stone-600 py-3 rounded-xl font-medium text-sm hover:bg-stone-50 transition-colors">
                Cancel
              </button>
              <button onClick={handleSave} disabled={loading}
                className="flex-1 bg-emerald-700 text-white py-3 rounded-xl font-semibold text-sm hover:bg-emerald-800 transition-colors disabled:opacity-60">
                {loading ? "Saving..." : "Save changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
