"use client";

import { useState } from "react";

interface Props {
  items: { id: string; doseIndex: number }[];
  date: string;
  allDone: boolean;
  onSuccess?: () => void;
}

export default function MarkSlotDoneButton({ items, date, allDone, onSuccess }: Props) {
  const [loading, setLoading] = useState(false);
  const [localDone, setLocalDone] = useState(allDone);

  async function handleMark() {
    setLoading(true);
    const newDone = !localDone;
    setLocalDone(newDone); // optimistic update
    try {
      await fetch("/api/stack/checkoff-bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map(item => ({ stack_item_id: item.id, dose_index: item.doseIndex ?? 0 })),
          date,
          checked: newDone,
        }),
      });
      onSuccess?.();
      // Force full page reload to update all checkbox states
      window.location.reload();
    } catch {
      setLocalDone(!newDone); // revert on error
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleMark}
      disabled={loading}
      className={`text-xs font-medium transition-colors disabled:opacity-50 ${
        localDone
          ? "text-emerald-600 hover:text-stone-500"
          : "text-emerald-600 hover:text-emerald-800"
      }`}
    >
      {loading ? "..." : localDone ? "✓ Done" : "Mark done"}
    </button>
  );
}
