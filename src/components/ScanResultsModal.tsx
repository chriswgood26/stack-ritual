"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ScanResult } from "./ScanLabelButton";

interface Props {
  data: ScanResult;
  onClose: () => void;
}

export default function ScanResultsModal({ data, onClose }: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<"single" | "breakout">("single");
  const [productName, setProductName] = useState(data.productName || "");
  const [brand, setBrand] = useState(data.brand || "");
  const [dose, setDose] = useState(data.dosePerServing || "");
  const [timing, setTiming] = useState("");
  const [quantityTotal, setQuantityTotal] = useState(data.totalQuantity ? String(data.totalQuantity) : "");
  const [quantityRemaining, setQuantityRemaining] = useState(data.totalQuantity ? String(data.totalQuantity) : "");
  const [quantityUnit, setQuantityUnit] = useState(data.quantityUnit || "capsules");
  const [selectedIngredients, setSelectedIngredients] = useState<Set<number>>(
    () => new Set(data.ingredients.map((_, i) => i))
  );
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");

  function toggleIngredient(index: number) {
    setSelectedIngredients(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  async function addSingle() {
    setAdding(true);
    setError("");
    try {
      if (data.matchedSupplement) {
        const res = await fetch("/api/stack/add", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            supplement_id: data.matchedSupplement.id,
            dose,
            timing,
            brand,
            quantity_total: quantityTotal,
            quantity_remaining: quantityRemaining,
            quantity_unit: quantityUnit,
          }),
        });
        const result = await res.json();
        if (result.message === "already_in_stack") {
          setError("This supplement is already in your stack.");
          setAdding(false);
          return;
        }
      } else {
        await fetch("/api/supplements/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            name: productName,
            category: data.category || "other",
            dose,
            timing,
            brand,
            icon: "💊",
            quantity_total: quantityTotal,
            quantity_remaining: quantityRemaining,
            quantity_unit: quantityUnit,
          }),
        });
      }
      router.refresh();
      onClose();
    } catch {
      setError("Failed to add. Please try again.");
    } finally {
      setAdding(false);
    }
  }

  async function addBreakout() {
    setAdding(true);
    setError("");
    try {
      const selected = data.ingredients.filter((_, i) => selectedIngredients.has(i));
      for (const ing of selected) {
        await fetch("/api/supplements/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            name: ing.name,
            category: data.category || "vitamins",
            dose: ing.amount,
            timing,
            brand,
            icon: "💊",
          }),
        });
      }
      router.refresh();
      onClose();
    } catch {
      setError("Failed to add some supplements. Please try again.");
    } finally {
      setAdding(false);
    }
  }

  const inputClass = "w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500";

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between">
          <h2 className="font-bold text-stone-900">Scanned Supplement</h2>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600 text-lg">✕</button>
        </div>

        {data.confidence === "low" && (
          <div className="mx-5 mt-3 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-xl px-3 py-2">
            ⚠️ Some fields couldn't be read clearly. Please review and correct.
          </div>
        )}

        <div className="p-5 space-y-3">
          {data.matchedSupplement && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl px-3 py-2">
              ✓ Matched to our database: <strong>{data.matchedSupplement.name}</strong>
            </div>
          )}

          <div>
            <label className="text-xs text-stone-500 mb-1 block">Product Name</label>
            <input value={productName} onChange={e => setProductName(e.target.value)} className={inputClass} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-stone-500 mb-1 block">Brand</label>
              <input value={brand} onChange={e => setBrand(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="text-xs text-stone-500 mb-1 block">Dose per serving</label>
              <input value={dose} onChange={e => setDose(e.target.value)} className={inputClass} />
            </div>
          </div>
          <div>
            <label className="text-xs text-stone-500 mb-1 block">When to take</label>
            <select value={timing} onChange={e => setTiming(e.target.value)} className={`${inputClass} bg-white`}>
              <option value="">Select timing...</option>
              <optgroup label="Daily">
                <option value="morning-fasted">Morning — Fasted</option>
                <option value="morning-food">Morning — With Food</option>
                <option value="afternoon">Afternoon</option>
                <option value="evening">Evening</option>
                <option value="bedtime">Bedtime</option>
                <option value="split">Split Dose (AM + PM)</option>
              </optgroup>
              <optgroup label="Multiple times daily">
                <option value="2x-daily">2x Daily (AM + PM)</option>
                <option value="2x-with-meals">2x Daily with Meals</option>
                <option value="3x-daily">3x Daily</option>
                <option value="3x-with-meals">3x Daily with Meals</option>
                <option value="4x-daily">4x Daily</option>
              </optgroup>
              <optgroup label="Less than daily">
                <option value="weekly">Weekly</option>
                <option value="biweekly">Twice a week</option>
                <option value="3x-week">3x per week</option>
                <option value="monthly">Monthly</option>
                <option value="cycle-5-2">Cycle — 5 days on, 2 off</option>
                <option value="cycle-8-2w">Cycle — 8 weeks on, 2 weeks off</option>
                <option value="as-needed">As needed</option>
              </optgroup>
            </select>
          </div>

          <div>
            <label className="text-xs text-stone-500 mb-1 block">Inventory</label>
            <div className="grid grid-cols-3 gap-2">
              <input type="number" inputMode="decimal" min="0" value={quantityTotal}
                onChange={e => { setQuantityTotal(e.target.value); if (!quantityRemaining) setQuantityRemaining(e.target.value); }}
                placeholder="Total" className={inputClass} />
              <input type="number" inputMode="decimal" min="0" value={quantityRemaining}
                onChange={e => setQuantityRemaining(e.target.value)}
                placeholder="Remaining" className={inputClass} />
              <select value={quantityUnit} onChange={e => setQuantityUnit(e.target.value)} className={`${inputClass} bg-white`}>
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

          {data.ingredients.length > 1 && (
            <div className="pt-2 border-t border-stone-100">
              <div className="flex gap-2">
                <button onClick={() => setMode("single")}
                  className={`flex-1 text-xs py-2 rounded-xl font-medium transition-colors ${mode === "single" ? "bg-emerald-100 text-emerald-800" : "bg-stone-100 text-stone-500"}`}>
                  Add as one supplement
                </button>
                <button onClick={() => setMode("breakout")}
                  className={`flex-1 text-xs py-2 rounded-xl font-medium transition-colors ${mode === "breakout" ? "bg-emerald-100 text-emerald-800" : "bg-stone-100 text-stone-500"}`}>
                  Break into {data.ingredients.length} items
                </button>
              </div>
            </div>
          )}

          {mode === "breakout" && data.ingredients.length > 0 && (
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {data.ingredients.map((ing, i) => (
                <label key={i} className="flex items-center gap-2.5 px-3 py-2 bg-stone-50 rounded-xl cursor-pointer hover:bg-stone-100">
                  <input type="checkbox" checked={selectedIngredients.has(i)} onChange={() => toggleIngredient(i)}
                    className="w-4 h-4 accent-emerald-600 rounded" />
                  <span className="text-sm text-stone-800 flex-1">{ing.name}</span>
                  <span className="text-xs text-stone-500">{ing.amount}</span>
                </label>
              ))}
            </div>
          )}

          {error && <p className="text-red-500 text-xs">{error}</p>}

          <button
            onClick={mode === "single" ? addSingle : addBreakout}
            disabled={adding || (mode === "breakout" && selectedIngredients.size === 0)}
            className="w-full bg-emerald-700 text-white py-3 rounded-xl font-semibold text-sm hover:bg-emerald-800 transition-colors disabled:opacity-50">
            {adding ? "Adding..." : mode === "single" ? "Add to my stack" : `Add ${selectedIngredients.size} supplements to stack`}
          </button>
        </div>
      </div>
    </div>
  );
}
