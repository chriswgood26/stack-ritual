"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  items: { id: string; doseIndex: number }[];
  date: string;
  allDone: boolean;
}

export default function MarkSlotDoneButton({ items, date, allDone }: Props) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleMark() {
    setLoading(true);
    try {
      await fetch("/api/stack/checkoff-bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map(item => ({ stack_item_id: item.id, dose_index: item.doseIndex ?? 0 })),
          date,
          checked: !allDone,
        }),
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  if (allDone) {
    return (
      <span className="text-xs text-emerald-600 font-medium">✓ Done</span>
    );
  }

  return (
    <button
      onClick={handleMark}
      disabled={loading}
      className="text-xs text-emerald-600 font-medium hover:text-emerald-800 transition-colors disabled:opacity-50"
    >
      {loading ? "..." : "Mark done"}
    </button>
  );
}
