"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function PauseStackItemButton({ itemId, paused }: { itemId: string; paused: boolean }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function toggle() {
    setLoading(true);
    const res = await fetch("/api/stack/pause", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ item_id: itemId, paused: !paused }),
    });
    if (res.ok) {
      router.refresh();
    } else {
      setLoading(false);
    }
  }

  if (paused) {
    return (
      <button
        onClick={toggle}
        disabled={loading}
        title="Resume — show on Today again"
        className="text-xs font-medium text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-200 disabled:opacity-50 transition-colors"
      >
        {loading ? "..." : "▶ Resume"}
      </button>
    );
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      title="Pause — keep in stack but hide from Today"
      className="text-stone-300 hover:text-amber-500 transition-colors text-lg p-1 disabled:opacity-50"
    >
      {loading ? "…" : "⏸"}
    </button>
  );
}
