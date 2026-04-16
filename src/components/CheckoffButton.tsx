"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  stackItemId: string;
  userId: string;
  isChecked: boolean;
  date: string;
  doseIndex?: number;
  takenAt?: string | null;
}

export default function CheckoffButton({ stackItemId, isChecked: initialChecked, date, doseIndex = 0, takenAt: initialTakenAt }: Props) {
  const [checked, setChecked] = useState(initialChecked);
  const [takenAt, setTakenAt] = useState(initialTakenAt || null);
  const [loading, setLoading] = useState(false);
  const [editingTime, setEditingTime] = useState(false);
  const [timeValue, setTimeValue] = useState("");
  const [savingTime, setSavingTime] = useState(false);
  const router = useRouter();

  async function toggle() {
    setLoading(true);
    const optimistic = !checked;
    setChecked(optimistic);

    try {
      const now = new Date();
      const res = await fetch("/api/stack/checkoff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stack_item_id: stackItemId, date, checked: optimistic, dose_index: doseIndex }),
      });

      if (!res.ok) {
        setChecked(!optimistic);
        setTakenAt(!optimistic ? null : takenAt);
      } else {
        if (optimistic) setTakenAt(now.toISOString());
        else setTakenAt(null);
        // Broadcast new inventory qty so QuantityAdjuster updates without waiting on router.refresh()
        try {
          const body = await res.json();
          if (typeof body?.quantity_remaining === "number") {
            window.dispatchEvent(
              new CustomEvent("sr:inventory-updated", {
                detail: { itemId: stackItemId, quantityRemaining: body.quantity_remaining },
              }),
            );
          }
        } catch {
          // response body parse failed — non-fatal
        }
        router.refresh();
      }
    } catch {
      setChecked(!optimistic);
    } finally {
      setLoading(false);
    }
  }

  function startEditTime() {
    if (!takenAt) return;
    const d = new Date(takenAt);
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    setTimeValue(`${hh}:${mm}`);
    setEditingTime(true);
  }

  async function saveTime() {
    if (!timeValue) return;
    setSavingTime(true);
    try {
      const res = await fetch("/api/history/update-log", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stack_item_id: stackItemId,
          date,
          time: timeValue,
          dose_index: doseIndex,
        }),
      });
      if (res.ok) {
        // Update local takenAt with the new time
        const [hours, mins] = timeValue.split(":");
        const newDate = new Date(takenAt!);
        newDate.setHours(parseInt(hours), parseInt(mins), 0, 0);
        setTakenAt(newDate.toISOString());
      }
    } finally {
      setSavingTime(false);
      setEditingTime(false);
    }
  }

  const timeStr = takenAt
    ? new Date(takenAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })
    : null;

  return (
    <div className="flex items-center gap-2">
      {checked && timeStr && !editingTime && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); startEditTime(); }}
          className="text-xs font-medium text-emerald-700 whitespace-nowrap hover:text-emerald-500 hover:underline transition-colors cursor-pointer select-none"
          title="Click to edit time"
        >
          ✎ {timeStr}
        </button>
      )}
      {editingTime && (
        <div className="flex items-center gap-1">
          <input
            type="time"
            value={timeValue}
            onChange={(e) => setTimeValue(e.target.value)}
            className="text-xs text-emerald-700 font-medium border border-emerald-200 rounded-lg px-1.5 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-emerald-400 w-[90px]"
            autoFocus
          />
          <button
            onClick={saveTime}
            disabled={savingTime}
            className="text-xs text-emerald-700 font-medium hover:text-emerald-500 disabled:opacity-50"
          >
            {savingTime ? "..." : "✓"}
          </button>
          <button
            onClick={() => setEditingTime(false)}
            className="text-xs text-stone-400 hover:text-stone-600"
          >
            ✕
          </button>
        </div>
      )}
      <button
        onClick={toggle}
        disabled={loading}
        className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0 ${
          checked
            ? "bg-emerald-700 border-emerald-700 text-white"
            : "border-stone-200 hover:border-emerald-400 hover:bg-emerald-50"
        } ${loading ? "opacity-50" : ""}`}
      >
        {checked && <span className="text-xs font-bold">✓</span>}
      </button>
    </div>
  );
}
