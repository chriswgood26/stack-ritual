"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  itemId: string;
  table: string;
  type: "supplement" | "experience";
}

export default function AdminActions({ itemId, table, type }: Props) {
  const [loading, setLoading] = useState<string | null>(null);
  const router = useRouter();

  async function handleAction(action: "approve" | "reject" | "delete") {
    setLoading(action);
    await fetch("/api/admin/action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId, table, action }),
    });
    router.refresh();
    setLoading(null);
  }

  if (type === "supplement") {
    return (
      <div className="flex gap-2 flex-shrink-0">
        <button onClick={() => handleAction("approve")} disabled={!!loading}
          className="text-xs bg-emerald-700 hover:bg-emerald-600 text-white px-3 py-1.5 rounded-lg font-medium transition-colors disabled:opacity-50">
          {loading === "approve" ? "..." : "✓ Approve"}
        </button>
        <button onClick={() => handleAction("reject")} disabled={!!loading}
          className="text-xs bg-stone-700 hover:bg-stone-600 text-stone-300 px-3 py-1.5 rounded-lg font-medium transition-colors disabled:opacity-50">
          {loading === "reject" ? "..." : "✗ Reject"}
        </button>
      </div>
    );
  }

  return (
    <button onClick={() => handleAction("delete")} disabled={!!loading}
      className="text-xs bg-red-900 hover:bg-red-800 text-red-300 px-3 py-1.5 rounded-lg font-medium transition-colors disabled:opacity-50 flex-shrink-0">
      {loading === "delete" ? "..." : "🗑️ Delete"}
    </button>
  );
}
