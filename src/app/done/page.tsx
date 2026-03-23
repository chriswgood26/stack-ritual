"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";

function DoneContent() {
  const params = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error" | "already">("loading");
  const [count, setCount] = useState(0);

  useEffect(() => {
    const uid = params.get("uid");
    const date = params.get("date");
    const ids = params.get("ids");
    const token = params.get("t");

    if (!uid || !date || !ids || !token) {
      setStatus("error");
      return;
    }

    fetch("/api/sms/done", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uid, date, ids: ids.split(","), token }),
    })
      .then(r => r.json())
      .then(d => {
        if (d.message === "success") { setStatus("success"); setCount(d.count); }
        else if (d.message === "already_done") setStatus("already");
        else setStatus("error");
      })
      .catch(() => setStatus("error"));
  }, [params]);

  return (
    <div className="min-h-screen bg-stone-50 font-sans flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-8 max-w-sm w-full text-center">
        <div className="text-5xl mb-4">
          {status === "loading" && "🌿"}
          {status === "success" && "✅"}
          {status === "already" && "🌿"}
          {status === "error" && "❌"}
        </div>

        {status === "loading" && (
          <>
            <h1 className="text-xl font-bold text-stone-900 mb-2">Marking done...</h1>
            <p className="text-stone-500 text-sm">Just a moment</p>
          </>
        )}

        {status === "success" && (
          <>
            <h1 className="text-xl font-bold text-stone-900 mb-2">Stack marked complete! 🎉</h1>
            <p className="text-stone-500 text-sm mb-6">{count} supplement{count !== 1 ? "s" : ""} checked off for today.</p>
            <Link href="/dashboard" className="bg-emerald-700 text-white px-6 py-3 rounded-full font-semibold text-sm hover:bg-emerald-800 transition-colors inline-block">
              View my stack →
            </Link>
          </>
        )}

        {status === "already" && (
          <>
            <h1 className="text-xl font-bold text-stone-900 mb-2">Already done! 🌿</h1>
            <p className="text-stone-500 text-sm mb-6">Your stack was already marked complete for today.</p>
            <Link href="/dashboard" className="bg-emerald-700 text-white px-6 py-3 rounded-full font-semibold text-sm hover:bg-emerald-800 transition-colors inline-block">
              View my stack →
            </Link>
          </>
        )}

        {status === "error" && (
          <>
            <h1 className="text-xl font-bold text-stone-900 mb-2">Link expired</h1>
            <p className="text-stone-500 text-sm mb-6">This link has expired or is invalid. Please open the app to mark your stack.</p>
            <Link href="/dashboard" className="bg-emerald-700 text-white px-6 py-3 rounded-full font-semibold text-sm hover:bg-emerald-800 transition-colors inline-block">
              Open app →
            </Link>
          </>
        )}

        <p className="text-xs text-stone-400 mt-6">Stack Ritual · stackritual.com</p>
      </div>
    </div>
  );
}

export default function DonePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-stone-50 flex items-center justify-center"><div className="text-4xl">🌿</div></div>}>
      <DoneContent />
    </Suspense>
  );
}
