"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  stackItemId: string;
  userId: string;
  isChecked: boolean;
  date: string;
  doseIndex?: number;
}

export default function CheckoffButton({ stackItemId, isChecked: initialChecked, date, doseIndex = 0 }: Props) {
  const [checked, setChecked] = useState(initialChecked);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function toggle() {
    setLoading(true);
    const optimistic = !checked;
    setChecked(optimistic);

    try {
      const res = await fetch("/api/stack/checkoff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stack_item_id: stackItemId, date, checked: optimistic, dose_index: doseIndex }),
      });

      if (!res.ok) {
        setChecked(!optimistic); // revert on failure
      } else {
        router.refresh();
      }
    } catch {
      setChecked(!optimistic);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all ${
        checked
          ? "bg-emerald-500 border-emerald-500 text-white"
          : "border-stone-200 hover:border-emerald-400 hover:bg-emerald-50"
      } ${loading ? "opacity-50" : ""}`}
    >
      {checked && <span className="text-xs font-bold">✓</span>}
    </button>
  );
}
