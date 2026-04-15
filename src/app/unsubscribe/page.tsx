"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

function UnsubscribeInner() {
  const params = useSearchParams();
  const token = params.get("token") || "";
  const [state, setState] = useState<"loading" | "done" | "error">("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) {
      setState("error");
      setError("Missing unsubscribe token.");
      return;
    }
    fetch("/api/newsletter/unsubscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(async r => {
        if (!r.ok) {
          const d = await r.json().catch(() => ({}));
          setError(d.error || "Unsubscribe failed");
          setState("error");
        } else {
          setState("done");
        }
      })
      .catch(() => {
        setError("Network error");
        setState("error");
      });
  }, [token]);

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-8 max-w-md w-full text-center">
        <div className="text-4xl mb-3">🌿</div>
        {state === "loading" && <p className="text-stone-600">Unsubscribing…</p>}
        {state === "done" && (
          <>
            <h1 className="text-xl font-bold text-stone-900 mb-2">You&rsquo;re unsubscribed</h1>
            <p className="text-stone-600 text-sm mb-5">
              You won&rsquo;t receive any more newsletter emails from Stack Ritual. Sorry to see you go!
            </p>
            <Link href="/" className="text-emerald-700 text-sm font-semibold hover:underline">
              ← Back to Stack Ritual
            </Link>
          </>
        )}
        {state === "error" && (
          <>
            <h1 className="text-xl font-bold text-stone-900 mb-2">Something went wrong</h1>
            <p className="text-stone-600 text-sm mb-4">{error}</p>
            <p className="text-stone-500 text-xs">
              Email <a href="mailto:hello@stackritual.com" className="text-emerald-700">hello@stackritual.com</a> for help.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export default function UnsubscribePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-stone-50" />}>
      <UnsubscribeInner />
    </Suspense>
  );
}
