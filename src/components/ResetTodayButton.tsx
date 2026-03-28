"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ResetTodayButton() {
  const [loading, setLoading] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const router = useRouter();

  async function handleReset() {
    if (!confirm) { setConfirm(true); return; }
    setLoading(true);
    try {
      await fetch("/api/stack/reset-today", { method: "POST" });
      router.refresh();
    } finally {
      setLoading(false);
      setConfirm(false);
    }
  }

  return (
    <button
      onClick={handleReset}
      disabled={loading}
      className={`text-xs font-medium transition-colors disabled:opacity-50 ${
        confirm
          ? "text-red-500 hover:text-red-700"
          : "text-stone-400 hover:text-stone-600"
      }`}
    >
      {loading ? "Resetting..." : confirm ? "Tap again to confirm reset" : "↺ Reset today"}
    </button>
  );
}
