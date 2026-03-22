"use client";

import { useState } from "react";

export default function ManageBillingButton() {
  const [loading, setLoading] = useState(false);

  async function handlePortal() {
    setLoading(true);
    const res = await fetch("/api/stripe/portal", { method: "POST" });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
    else setLoading(false);
  }

  return (
    <button onClick={handlePortal} disabled={loading}
      className="flex items-center justify-between px-4 py-4 w-full hover:bg-stone-50 transition-colors">
      <div className="flex items-center gap-3">
        <span className="text-xl">💳</span>
        <span className="font-medium text-stone-900 text-sm">{loading ? "Loading..." : "Manage billing"}</span>
      </div>
      <span className="text-stone-300">›</span>
    </button>
  );
}
