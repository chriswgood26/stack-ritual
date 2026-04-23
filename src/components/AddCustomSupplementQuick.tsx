"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ScanLabelButton from "./ScanLabelButton";
import type { ScanResult } from "./ScanLabelButton";
import { isLessThanDaily } from "@/lib/next-due";

export default function AddCustomSupplementQuick({ name }: { name: string }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name,
    category: "other",
    icon: "💊",
    dose: "",
    timing: "",
    brand: "",
    purchasedFrom: "",
    quantityTotal: "",
    quantityRemaining: "",
    quantityUnit: "capsules",
    isRitual: false,
    startDate: "",
  });
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [scanError, setScanError] = useState("");
  const router = useRouter();

  function handleScanComplete(data: ScanResult) {
    setScanError("");
    setForm(f => ({
      ...f,
      dose: data.dosePerServing || f.dose,
      brand: data.brand || f.brand,
      category: data.category || f.category,
      quantityTotal: data.totalQuantity ? String(data.totalQuantity) : f.quantityTotal,
      quantityRemaining: data.totalQuantity ? String(data.totalQuantity) : f.quantityRemaining,
      quantityUnit: data.quantityUnit || f.quantityUnit,
    }));
  }

  async function handleSubmit() {
    setStatus("loading");
    const res = await fetch("/api/supplements/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        purchased_from: form.purchasedFrom,
        quantity_total: form.quantityTotal,
        quantity_remaining: form.quantityRemaining,
        quantity_unit: form.quantityUnit,
        start_date: isLessThanDaily(form.timing) ? (form.startDate || null) : null,
      }),
    });
    const data = await res.json();
    if (data.message === "submitted" || data.message === "already_submitted") {
      setStatus("success");
      router.refresh();
    } else {
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 text-center">
        <div className="text-3xl mb-2">🎉</div>
        <p className="font-semibold text-emerald-800">"{form.name}" added to your stack!</p>
        <p className="text-emerald-700 text-sm mt-1">It's been submitted for review and added to <Link href="/dashboard/stack" className="font-semibold underline hover:text-emerald-900">your stack</Link>.</p>
      </div>
    );
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full bg-emerald-700 text-white py-4 rounded-2xl font-semibold text-base hover:bg-emerald-800 transition-colors flex items-center justify-center gap-2 shadow-sm"
      >
        + Add "{name}" to my stack
      </button>
    );
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
      { value: "3x-daily", label: "3x Daily" },
      { value: "3x-with-meals", label: "3x Daily with Meals" },
    ]},
    { group: "Less than daily", options: [
      { value: "weekly", label: "Weekly" },
      { value: "monthly", label: "Monthly" },
      { value: "as-needed", label: "As needed" },
    ]},
  ];

  return (
    <div className="bg-white rounded-2xl border border-emerald-200 shadow-sm p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-stone-900">Add "{form.name || name}"</h3>
        <button onClick={() => setOpen(false)} className="text-stone-400 text-xl">✕</button>
      </div>

      <div>
        <label className="text-xs font-semibold text-stone-500 uppercase tracking-wide block mb-1.5">Name</label>
        <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          placeholder={form.isRitual ? "e.g. Cold Plunge" : "e.g. Turmeric"}
          className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
      </div>

      <div className="flex gap-2">
        <button onClick={() => setForm(f => ({ ...f, isRitual: false, category: "other" }))}
          className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors ${!form.isRitual ? "bg-emerald-700 text-white border-emerald-700" : "bg-white text-stone-600 border-stone-200"}`}>
          💊 Supplement
        </button>
        <button onClick={() => setForm(f => ({ ...f, isRitual: true, category: "ritual" }))}
          className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors ${form.isRitual ? "bg-amber-600 text-white border-amber-600" : "bg-white text-stone-600 border-stone-200"}`}>
          🧘 Ritual
        </button>
      </div>

      <div className="flex items-center gap-2">
        <ScanLabelButton
          isPlusOrPro={true}
          onScanComplete={handleScanComplete}
          onError={msg => { setScanError(msg); setTimeout(() => setScanError(""), 5000); }}
          variant="link"
        />
        {scanError && <span className="text-xs text-red-500">{scanError}</span>}
      </div>

      <div>
        <label className="text-xs font-semibold text-stone-500 uppercase tracking-wide block mb-1.5">Dose / Duration</label>
        <input type="text" value={form.dose} onChange={e => setForm(f => ({ ...f, dose: e.target.value }))}
          placeholder={form.isRitual ? "e.g. 10 min" : "e.g. 500mg"}
          className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
      </div>

      <div>
        <label className="text-xs font-semibold text-stone-500 uppercase tracking-wide block mb-1.5">
          {form.isRitual ? "When performed" : "When to take"}
        </label>
        <select value={form.timing} onChange={e => setForm(f => ({ ...f, timing: e.target.value }))}
          className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white">
          <option value="">Select timing...</option>
          {timingOptions.map(g => (
            <optgroup key={g.group} label={g.group}>
              {g.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </optgroup>
          ))}
        </select>
      </div>

      {isLessThanDaily(form.timing) && (
        <div>
          <label className="text-xs font-semibold text-stone-500 uppercase tracking-wide block mb-1.5">Start date (optional)</label>
          <input
            type="date"
            value={form.startDate}
            onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
            className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
          />
          <p className="text-[11px] text-stone-400 mt-1">Pick when this schedule begins — leave blank to start today.</p>
        </div>
      )}

      {!form.isRitual && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-stone-500 uppercase tracking-wide block mb-1.5">Brand</label>
              <input type="text" value={form.brand} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))}
                placeholder="e.g. Thorne"
                className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
            <div>
              <label className="text-xs font-semibold text-stone-500 uppercase tracking-wide block mb-1.5">Where purchased</label>
              <input type="text" value={form.purchasedFrom} onChange={e => setForm(f => ({ ...f, purchasedFrom: e.target.value }))}
                placeholder="e.g. iHerb"
                className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-stone-500 uppercase tracking-wide block mb-1.5">Inventory (optional)</label>
            <div className="grid grid-cols-3 gap-2">
              <input type="number" inputMode="decimal" min="0" value={form.quantityTotal}
                onChange={e => {
                  const newTotal = e.target.value;
                  setForm(f => ({
                    ...f,
                    quantityTotal: newTotal,
                    quantityRemaining: (!f.quantityRemaining || f.quantityRemaining === f.quantityTotal) ? newTotal : f.quantityRemaining,
                  }));
                }}
                placeholder="Total"
                className="border border-stone-200 rounded-xl px-3 py-2.5 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              <input type="number" inputMode="decimal" min="0" value={form.quantityRemaining}
                onChange={e => setForm(f => ({ ...f, quantityRemaining: e.target.value }))}
                placeholder="Remaining"
                className="border border-stone-200 rounded-xl px-3 py-2.5 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              <select value={form.quantityUnit}
                onChange={e => setForm(f => ({ ...f, quantityUnit: e.target.value }))}
                className="border border-stone-200 rounded-xl px-2 py-2.5 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white">
                <option value="capsules">capsules</option>
                <option value="tablets">tablets</option>
                <option value="softgels">softgels</option>
                <option value="gummies">gummies</option>
                <option value="scoops">scoops</option>
                <option value="ml">ml</option>
                <option value="drops">drops</option>
                <option value="g">g</option>
                <option value="oz">oz</option>
                <option value="servings">servings</option>
              </select>
            </div>
          </div>
        </>
      )}

      {status === "error" && <p className="text-red-500 text-xs text-center">Something went wrong. Try again.</p>}

      <button onClick={handleSubmit} disabled={status === "loading" || !form.name.trim()}
        className="w-full bg-emerald-700 text-white py-3.5 rounded-2xl font-semibold hover:bg-emerald-800 transition-colors disabled:opacity-60">
        {status === "loading" ? "Adding..." : `Add "${form.name.trim() || name}" to my stack`}
      </button>
    </div>
  );
}
