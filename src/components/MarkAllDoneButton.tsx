"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  stackItems: { id: string; doseIndex: number }[];
  date: string;
  allDone: boolean;
}

export default function MarkAllDoneButton({ stackItems, date, allDone }: Props) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleMarkAll() {
    setLoading(true);
    try {
      await Promise.all(
        stackItems.map(item =>
          fetch("/api/stack/checkoff", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ stack_item_id: item.id, date, checked: !allDone, dose_index: item.doseIndex }),
          })
        )
      );
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleMarkAll}
      disabled={loading}
      className={`text-sm font-semibold px-4 py-2 rounded-full transition-colors disabled:opacity-50 ${
        allDone
          ? "bg-stone-100 text-stone-600 hover:bg-stone-200"
          : "bg-emerald-700 text-white hover:bg-emerald-800"
      }`}
    >
      {loading ? "..." : allDone ? "Unmark all" : "✓ Mark all done"}
    </button>
  );
}
