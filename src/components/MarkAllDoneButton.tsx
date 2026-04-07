"use client";

import { useState } from "react";

interface Props {
  stackItems: { id: string; doseIndex: number }[];
  date: string;
  allDone: boolean;
}

export default function MarkAllDoneButton({ stackItems, date, allDone }: Props) {
  const [loading, setLoading] = useState(false);

  async function handleMarkAll() {
    setLoading(true);
    try {
      // Only send unchecked items when marking done, all items when unmarking
      const itemsToSend = allDone
        ? stackItems
        : stackItems; // Send all — API will delete existing first then re-insert

      await fetch("/api/stack/checkoff-bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: itemsToSend.map(item => ({ stack_item_id: item.id, dose_index: item.doseIndex ?? 0 })),
          date,
          checked: !allDone,
        }),
      });
      // Full page reload to ensure all checkbox states update
      window.location.reload();
    } catch {
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
