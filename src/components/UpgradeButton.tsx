"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  priceKey: string;
  label: string;
  className?: string;
}

export default function UpgradeButton({ priceKey, label, className }: Props) {
  const [loading, setLoading] = useState(false);

  async function handleUpgrade() {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceKey }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setLoading(false);
      }
    } catch {
      setLoading(false);
    }
  }

  return (
    <button onClick={handleUpgrade} disabled={loading}
      className={className || "bg-emerald-700 text-white px-4 py-2 rounded-full text-sm font-semibold hover:bg-emerald-800 transition-colors disabled:opacity-60"}>
      {loading ? "Loading..." : label}
    </button>
  );
}
