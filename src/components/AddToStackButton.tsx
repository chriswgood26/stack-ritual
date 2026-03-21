"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  supplementId: string;
  supplementName: string;
  defaultTiming?: string;
  defaultDose?: string;
}

export default function AddToStackButton({ supplementId, supplementName, defaultTiming, defaultDose }: Props) {
  const [status, setStatus] = useState<"idle" | "loading" | "added" | "exists" | "error">("idle");
  const [showForm, setShowForm] = useState(false);
  const [dose, setDose] = useState(defaultDose || "");
  const [timing, setTiming] = useState(defaultTiming || "");
  const [brand, setBrand] = useState("");
  const router = useRouter();

  async function handleAdd() {
    setStatus("loading");
    try {
      const res = await fetch("/api/stack/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ supplement_id: supplementId, dose, timing, brand }),
      });
      const data = await res.json();

      if (data.message === "already_in_stack") {
        setStatus("exists");
      } else if (res.ok) {
        setStatus("added");
        setShowForm(false);
        router.refresh();
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  }

  if (status === "added") {
    return (
      <div className="w-full bg-emerald-50 border border-emerald-200 text-emerald-700 py-3.5 rounded-2xl font-semibold flex items-center justify-center gap-2">
        ✓ Added to your stack!
      </div>
    );
  }

  if (status === "exists") {
    return (
      <div className="w-full bg-stone-50 border border-stone-200 text-stone-600 py-3.5 rounded-2xl font-semibold flex items-center justify-center gap-2">
        ✓ Already in your stack
      </div>
    );
  }

  if (showForm) {
    return (
      <div className="bg-white rounded-2xl border border-emerald-200 shadow-sm p-5 space-y-4">
        <h3 className="font-semibold text-stone-900">Add {supplementName} to stack</h3>

        <div>
          <label className="text-xs font-semibold text-stone-500 uppercase tracking-wide block mb-1.5">Dose</label>
          <input
            type="text"
            value={dose}
            onChange={e => setDose(e.target.value)}
            placeholder={defaultDose || "e.g. 500mg"}
            className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-stone-500 uppercase tracking-wide block mb-1.5">When to take</label>
          <select
            value={timing}
            onChange={e => setTiming(e.target.value)}
            className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
          >
            <option value="">Select timing...</option>
            <option value="morning-fasted">Morning — Fasted</option>
            <option value="morning-food">Morning — With Food</option>
            <option value="afternoon">Afternoon</option>
            <option value="evening">Evening</option>
            <option value="bedtime">Bedtime</option>
            <option value="split">Split Dose (AM + PM)</option>
          </select>
        </div>

        <div>
          <label className="text-xs font-semibold text-stone-500 uppercase tracking-wide block mb-1.5">Brand (optional)</label>
          <input
            type="text"
            value={brand}
            onChange={e => setBrand(e.target.value)}
            placeholder="e.g. Thorne, Life Extension"
            className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => setShowForm(false)}
            className="flex-1 border border-stone-200 text-stone-600 py-3 rounded-xl font-medium text-sm hover:bg-stone-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleAdd}
            disabled={status === "loading"}
            className="flex-1 bg-emerald-700 text-white py-3 rounded-xl font-semibold text-sm hover:bg-emerald-800 transition-colors disabled:opacity-60"
          >
            {status === "loading" ? "Adding..." : "Add to stack ✓"}
          </button>
        </div>

        {status === "error" && (
          <p className="text-red-500 text-xs text-center">Something went wrong. Try again.</p>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={() => setShowForm(true)}
      className="w-full bg-emerald-700 text-white py-3.5 rounded-2xl font-semibold hover:bg-emerald-800 transition-colors flex items-center justify-center gap-2 shadow-sm"
    >
      + Add to my stack
    </button>
  );
}
