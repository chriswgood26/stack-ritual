"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  stackItemIds: string[];
  date: string;
  allDone: boolean;
}

export default function MarkAllDoneButton({ stackItemIds, date, allDone }: Props) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleMarkAll() {
    setLoading(true);
    try {
      await Promise.all(
        stackItemIds.map(id =>
          fetch("/api/stack/checkoff", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ stack_item_id: id, date, checked: !allDone }),
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
