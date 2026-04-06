"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  itemId: string;
  currentRemaining: number | null;
  currentTotal: number | null;
  unit: string | null;
  name: string;
  compact?: boolean;
  supplementSlug?: string | null;
}

export default function QuantityAdjuster({ itemId, currentRemaining, currentTotal, unit, name, compact = false, supplementSlug }: Props) {
  const [open, setOpen] = useState(false);
  const [qty, setQty] = useState(currentRemaining?.toString() || "");
  const [saving, setSaving] = useState(false);
  const [confirmStop, setConfirmStop] = useState(false);
  const router = useRouter();

  const unitLabel = unit || "capsules";

  async function handleSave() {
    setSaving(true);
    await fetch("/api/stack/inventory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        item_id: itemId,
        quantity_remaining: parseInt(qty) || 0,
        quantity_total: currentTotal,
        quantity_unit: unit,
      }),
    });
    setOpen(false);
    router.refresh();
    setSaving(false);
  }

  async function handleStopTracking() {
    setSaving(true);
    await fetch("/api/stack/inventory", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ item_id: itemId }),
    });
    setOpen(false);
    setConfirmStop(false);
    router.refresh();
    setSaving(false);
  }

  async function adjust(delta: number) {
    const current = currentRemaining || 0;
    const newQty = Math.max(0, current + delta);
    setSaving(true);
    await fetch("/api/stack/inventory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        item_id: itemId,
        quantity_remaining: newQty,
        quantity_total: currentTotal,
        quantity_unit: unit,
      }),
    });
    router.refresh();
    setSaving(false);
  }

  if (currentRemaining === null || currentRemaining === undefined) return null;

  const pct = currentTotal ? (currentRemaining / currentTotal) * 100 : 100;
  const color = pct <= 15 ? "text-red-600 bg-red-50 border-red-200" :
    pct <= 25 ? "text-amber-600 bg-amber-50 border-amber-200" :
    "text-emerald-700 bg-emerald-50 border-emerald-200";
  const sizeClass = compact ? "text-xs px-1.5 py-0 leading-5" : "text-xs px-2 py-1";

  return (
    <>
      <button onClick={() => setOpen(true)}
        className={`rounded-full border font-medium transition-colors ${color} ${sizeClass}`}>
        {currentRemaining} {unitLabel} remaining
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center p-4 pb-8">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-stone-900 text-base">Adjust: {name}</h2>
              <button onClick={() => setOpen(false)} className="text-stone-400 text-xl">✕</button>
            </div>

            {/* Quick adjust */}
            <div>
              <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">Quick adjust</p>
              <div className="flex gap-2">
                {[-5, -2, -1, +1, +2, +5].map(delta => (
                  <button key={delta} onClick={() => adjust(delta)} disabled={saving}
                    className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors ${
                      delta < 0 ? "bg-red-50 text-red-600 hover:bg-red-100" : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                    } disabled:opacity-50`}>
                    {delta > 0 ? `+${delta}` : delta}
                  </button>
                ))}
              </div>
              <p className="text-xs text-stone-400 mt-1.5 text-center">
                Accidentally took extra? Use +1 or +2 to add back, -1 to remove.
              </p>
            </div>

            {/* Manual set */}
            <div>
              <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">Set exact amount remaining</p>
              <div className="flex gap-2">
                <input type="number" value={qty} onChange={e => setQty(e.target.value)} min="0"
                  placeholder="0"
                  className="flex-1 border border-stone-200 rounded-xl px-4 py-2.5 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                <button onClick={handleSave} disabled={saving || !qty}
                  className="bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-emerald-800 transition-colors disabled:opacity-50">
                  {saving ? "..." : "Set"}
                </button>
              </div>
            </div>

            <div className="bg-stone-50 rounded-xl px-4 py-3 text-xs text-stone-500">
              Current: <strong>{currentRemaining}</strong> {unitLabel} remaining
              {currentTotal && <span> of {currentTotal}</span>}
            </div>

            <div>
              <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">Reorder</p>
              <div className="flex gap-2">
                <a href={`https://www.iherb.com/search?q=${encodeURIComponent(name)}&rcode=7113351`}
                  target="_blank" rel="noopener noreferrer"
                  className="flex-1 bg-emerald-50 border border-emerald-200 text-emerald-700 py-2 rounded-xl text-xs font-semibold text-center hover:bg-emerald-100 transition-colors">
                  iHerb →
                </a>
                <a href={`https://www.amazon.com/s?k=${encodeURIComponent(name + ' supplement')}&tag=stackritual-20`}
                  target="_blank" rel="noopener noreferrer"
                  className="flex-1 bg-stone-50 border border-stone-200 text-stone-700 py-2 rounded-xl text-xs font-semibold text-center hover:bg-stone-100 transition-colors">
                  Amazon →
                </a>
              </div>
            </div>

            <div className="border-t border-stone-100 pt-3">
              {!confirmStop ? (
                <button
                  onClick={() => setConfirmStop(true)}
                  className="w-full text-xs text-stone-400 hover:text-red-500 transition-colors py-1"
                >
                  Stop tracking inventory
                </button>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-stone-500 text-center">Remove inventory tracking for <strong>{name}</strong>?</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setConfirmStop(false)}
                      className="flex-1 py-2 rounded-xl text-xs font-semibold bg-stone-100 text-stone-600 hover:bg-stone-200 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleStopTracking}
                      disabled={saving}
                      className="flex-1 py-2 rounded-xl text-xs font-semibold bg-red-50 text-red-600 hover:bg-red-100 transition-colors disabled:opacity-50"
                    >
                      {saving ? "..." : "Stop tracking"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
