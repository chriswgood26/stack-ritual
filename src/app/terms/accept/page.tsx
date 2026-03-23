"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function AcceptTermsPage() {
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleAccept() {
    if (!agreed) return;
    setLoading(true);
    const res = await fetch("/api/terms", { method: "POST" });
    if (res.ok) {
      router.push("/dashboard");
    } else {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-stone-50 font-sans flex flex-col items-center justify-center px-4 py-10">
      <div className="max-w-md w-full">

        <div className="text-center mb-8">
          <span className="text-4xl">🌿</span>
          <h1 className="text-2xl font-bold text-stone-900 mt-3">Welcome to Stack Ritual</h1>
          <p className="text-stone-500 text-sm mt-2">Before you continue, please review and accept our Terms and Conditions.</p>
        </div>

        {/* Summary of key points */}
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5 mb-5 space-y-3">
          <h2 className="font-semibold text-stone-900 text-sm">Key points to know:</h2>
          <div className="space-y-2.5">
            {[
              { icon: "⚕️", text: "Stack Ritual provides educational information only — not medical advice. Always consult your doctor." },
              { icon: "⚖️", text: "Our liability is limited to your subscription payments. We are not liable for health outcomes." },
              { icon: "🤝", text: "By using the Service, you agree to resolve disputes through binding arbitration." },
              { icon: "💬", text: "User-submitted content (experiences, reviews) reflects personal opinions, not verified facts." },
              { icon: "🔗", text: "We may earn affiliate commissions on supplement purchases at no cost to you." },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3 text-sm text-stone-600">
                <span className="text-base flex-shrink-0">{item.icon}</span>
                <span>{item.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Full terms link */}
        <p className="text-xs text-stone-500 text-center mb-5">
          Read the{" "}
          <Link href="/terms" target="_blank" className="text-emerald-600 underline font-medium">
            full Terms and Conditions
          </Link>
          {" "}before agreeing.
        </p>

        {/* Agreement checkbox */}
        <label className="flex items-start gap-3 bg-white rounded-2xl border border-stone-200 p-4 cursor-pointer hover:border-emerald-300 transition-colors mb-5">
          <input
            type="checkbox"
            checked={agreed}
            onChange={e => setAgreed(e.target.checked)}
            className="mt-0.5 w-5 h-5 rounded accent-emerald-600 flex-shrink-0"
          />
          <span className="text-sm text-stone-700">
            I have read and agree to the{" "}
            <Link href="/terms" target="_blank" className="text-emerald-600 underline">Terms and Conditions</Link>
            , including the medical disclaimer, limitation of liability, indemnification, and arbitration clause.
          </span>
        </label>

        <button
          onClick={handleAccept}
          disabled={!agreed || loading}
          className="w-full bg-emerald-700 text-white py-4 rounded-2xl font-semibold hover:bg-emerald-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? "Continuing..." : "I agree — continue to Stack Ritual →"}
        </button>

        <p className="text-xs text-stone-400 text-center mt-4">
          By continuing you agree to the Terms and Conditions. You may not use Stack Ritual without accepting these terms.
        </p>
      </div>
    </div>
  );
}
