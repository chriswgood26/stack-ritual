"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ScanLabelButton from "./ScanLabelButton";
import type { ScanResult } from "./ScanLabelButton";
import BuyLinks from "./BuyLinks";
import { parseServingCount } from "@/lib/serving";
import { isLessThanDaily } from "@/lib/next-due";

interface Props {
  itemId: string;
  currentDose?: string | null;
  currentTiming?: string | null;
  currentBrand?: string | null;
  currentNotes?: string | null;
  currentFrequency?: string | null;
  name: string;
  displayName?: string;
  currentQuantityTotal?: number | null;
  currentQuantityRemaining?: number | null;
  currentQuantityUnit?: string | null;
  currentAutoDecrement?: boolean | null;
  currentDosesPerServing?: number | null;
  currentPaused?: boolean | null;
  currentStartDate?: string | null;
  isRitual?: boolean;
  asLabel?: boolean;
  labelClassName?: string;
}

function todayLocalYmd(): string {
  return new Date().toLocaleDateString("en-CA");
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

export default function EditStackItemButton({ itemId, currentDose, currentTiming, currentBrand, currentNotes, currentFrequency, name, displayName, currentQuantityTotal, currentQuantityRemaining, currentQuantityUnit, currentAutoDecrement, currentDosesPerServing, currentPaused, currentStartDate, isRitual = false, asLabel = false, labelClassName }: Props) {
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
    doses_per_serving: (currentDosesPerServing ?? 1).toString(),
    auto_decrement: currentAutoDecrement !== false,
    is_paused: !!currentPaused,
    start_date: currentStartDate || "",
  });
  const scheduleResetFromTiming = form.timing !== (currentTiming || "") && isLessThanDaily(form.timing);
  const [scanError, setScanError] = useState("");
  const [confirmStopTracking, setConfirmStopTracking] = useState(false);
  const [stopping, setStopping] = useState(false);
  const router = useRouter();

  function handleScanComplete(data: ScanResult) {
    setScanError("");
    const serving = parseServingCount(data.servingSize);
    setForm(f => ({
      ...f,
      dose: data.dosePerServing || f.dose,
      brand: data.brand || f.brand,
      quantity_total: data.totalQuantity ? (parseFloat(f.quantity_remaining || "0") + Number(data.totalQuantity)).toString() : f.quantity_total,
      quantity_remaining: data.totalQuantity ? (parseFloat(f.quantity_remaining || "0") + Number(data.totalQuantity)).toString() : f.quantity_remaining,
      quantity_unit: data.quantityUnit || f.quantity_unit,
      doses_per_serving: serving > 1 ? serving.toString() : f.doses_per_serving,
    }));
  }

  async function handleSave() {
    setLoading(true);
    const res = await fetch("/api/stack/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ item_id: itemId, dose: form.dose, timing: form.timing, brand: form.brand, notes: form.notes, frequency_type: form.frequency_type, quantity_total: form.quantity_total, quantity_remaining: form.quantity_remaining, quantity_unit: form.quantity_unit, auto_decrement: form.auto_decrement, doses_per_serving: form.doses_per_serving, start_date: form.start_date }),
    });
    if (res.ok) {
      setOpen(false);
      router.refresh();
    }
    setLoading(false);
  }

  async function handleTogglePause() {
    const next = !form.is_paused;
    const res = await fetch("/api/stack/pause", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ item_id: itemId, paused: next }),
    });
    if (res.ok) {
      setForm(f => ({ ...f, is_paused: next }));
      router.refresh();
    }
  }

  async function handleStopTracking() {
    setStopping(true);
    const res = await fetch("/api/stack/inventory", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ item_id: itemId }),
    });
    if (res.ok) {
      setForm(f => ({ ...f, quantity_total: "", quantity_remaining: "", auto_decrement: false }));
      setConfirmStopTracking(false);
      router.refresh();
    }
    setStopping(false);
  }

  return (
    <>
      <button onClick={() => setOpen(true)}
        className={asLabel ? (labelClassName || "font-medium text-sm text-stone-900") : "text-stone-300 hover:text-emerald-500 transition-colors text-lg p-1"}>
        {asLabel ? (displayName ?? name) : "✏️"}
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center p-4 pb-8">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-stone-900">Edit — {name}</h2>
              <button onClick={() => setOpen(false)} className="text-stone-400 hover:text-stone-700 text-xl">✕</button>
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

            <div className="flex items-center justify-between gap-3 bg-stone-50 rounded-xl px-4 py-3 border border-stone-100">
              <div>
                <div className="text-sm font-semibold text-stone-900">{form.is_paused ? "⏸ Paused" : "Active"}</div>
                <div className="text-xs text-stone-500">{form.is_paused ? "Hidden from Today and reminders. Resume any time." : "Showing on Today and reminders."}</div>
              </div>
              <button
                type="button"
                onClick={handleTogglePause}
                title={form.is_paused ? "Resume — show on Today again" : "Pause — keep in stack but hide from Today"}
                className={
                  form.is_paused
                    ? "text-xs font-medium text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-200 transition-colors flex-shrink-0"
                    : "text-amber-500 transition-colors text-xl p-1 flex-shrink-0"
                }
              >
                {form.is_paused ? "▶ Resume" : "⏸"}
              </button>
            </div>

            <div className="grid grid-cols-[1fr_auto] gap-2 items-end">
              <div>
                <label className="text-xs font-semibold text-stone-500 uppercase tracking-wide block mb-1.5">Dose</label>
                <input type="text" value={form.dose}
                  onChange={e => setForm(f => ({ ...f, dose: e.target.value }))}
                  placeholder="e.g. 500mg, 5000 IU"
                  className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div>
                <label className="text-xs font-semibold text-stone-500 uppercase tracking-wide block mb-1.5" title={`If the label says "Serving size: 2 capsules", enter 2`}>Per serving</label>
                <input type="number" min="1" value={form.doses_per_serving}
                  onChange={e => setForm(f => ({ ...f, doses_per_serving: e.target.value }))}
                  placeholder="1"
                  className="w-20 border border-stone-200 rounded-xl px-3 py-2.5 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
            </div>
            <p className="text-[11px] text-stone-400 -mt-2">
              {parseInt(form.doses_per_serving || "1", 10) > 1
                ? `You take ${form.doses_per_serving} ${form.quantity_unit} per dose. Inventory will decrement by ${form.doses_per_serving} when checked off.`
                : "If a label says \"Serving size: 2 capsules\", enter 2 — we'll decrement inventory correctly."}
            </p>

            <div>
              <label className="text-xs font-semibold text-stone-500 uppercase tracking-wide block mb-1.5">When to take</label>
              <select value={form.timing}
                onChange={e => {
                  const newTiming = e.target.value;
                  setForm(f => {
                    const timingChanged = newTiming !== (currentTiming || "");
                    let nextStart = f.start_date;
                    if (timingChanged) {
                      nextStart = isLessThanDaily(newTiming) ? todayLocalYmd() : "";
                    }
                    return { ...f, timing: newTiming, start_date: nextStart };
                  });
                }}
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
                <label className="text-xs font-semibold text-stone-500 uppercase tracking-wide block mb-1.5">Start date</label>
                <input
                  type="date"
                  value={form.start_date}
                  onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))}
                  className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                />
                <p className="text-[11px] text-stone-400 mt-1">
                  {scheduleResetFromTiming
                    ? "Schedule will restart from today — adjust the date if you want a different anchor."
                    : "Sets when this schedule begins. Leave blank to use the last time you took it."}
                </p>
              </div>
            )}

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
                    onChange={e => {
                      const val = e.target.value;
                      const newTotal = parseInt(val);
                      const currentRemaining = parseInt(form.quantity_remaining);
                      setForm(f => ({
                        ...f,
                        quantity_total: val,
                        quantity_remaining: (!isNaN(newTotal) && !isNaN(currentRemaining) && currentRemaining > newTotal)
                          ? val : f.quantity_remaining || val,
                      }));
                    }}
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
                    <option>drops</option>
                    <option>ml</option>
                    <option>scoops</option>
                    <option>doses</option>
                    <option>patches</option>
                    <option>sprays</option>
                    <option>injection</option>
                    <option>pen doses</option>
                    <option>vials</option>
                    <option>supplies</option>
                  </select>
                </div>
              </div>
              <p className="text-xs text-stone-400 mt-1.5">We'll alert you when you're running low (~2 weeks left)</p>

              {(currentQuantityRemaining !== null && currentQuantityRemaining !== undefined) && (
                <div className="mt-3">
                  {!confirmStopTracking ? (
                    <button
                      type="button"
                      onClick={() => setConfirmStopTracking(true)}
                      className="text-xs font-medium text-emerald-600 hover:text-red-500 transition-colors"
                    >
                      Stop tracking inventory
                    </button>
                  ) : (
                    <div className="bg-stone-50 border border-stone-200 rounded-xl p-3 space-y-2">
                      <p className="text-xs text-stone-600">Remove inventory tracking for <strong>{name}</strong>?</p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setConfirmStopTracking(false)}
                          className="flex-1 py-2 rounded-lg text-xs font-semibold bg-stone-100 text-stone-600 hover:bg-stone-200 transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleStopTracking}
                          disabled={stopping}
                          className="flex-1 py-2 rounded-lg text-xs font-semibold bg-red-50 text-red-600 hover:bg-red-100 transition-colors disabled:opacity-50"
                        >
                          {stopping ? "..." : "Stop tracking"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {!isRitual ? (
              <div className="rounded-xl border border-stone-200 bg-white p-4">
                <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-3">
                  Need a refill?
                </p>
                <BuyLinks name={name} />
              </div>
            ) : null}

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
