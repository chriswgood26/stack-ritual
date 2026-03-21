"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DeleteStackItemButton({ itemId }: { itemId: string }) {
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleDelete() {
    setLoading(true);
    const res = await fetch(`/api/stack/remove`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ item_id: itemId }),
    });
    if (res.ok) {
      router.refresh();
    } else {
      setLoading(false);
      setConfirming(false);
    }
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-1">
        <button onClick={() => setConfirming(false)}
          className="text-xs text-stone-400 hover:text-stone-600 px-2 py-1 rounded-lg border border-stone-200">
          Cancel
        </button>
        <button onClick={handleDelete} disabled={loading}
          className="text-xs text-white bg-red-500 hover:bg-red-600 px-2 py-1 rounded-lg disabled:opacity-50">
          {loading ? "..." : "Remove"}
        </button>
      </div>
    );
  }

  return (
    <button onClick={() => setConfirming(true)}
      className="text-stone-300 hover:text-red-400 transition-colors text-lg p-1">
      🗑️
    </button>
  );
}
