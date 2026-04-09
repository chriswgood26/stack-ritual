"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const SHARE_URL = "https://stackritual.com";
const SHARE_TITLE = "Stack Ritual — Stack your habits. Own your health.";
const SHARE_TEXT = "Check out Stack Ritual — it helps you track and time your supplements and build consistent wellness habits. Thought you'd like it.";

export default function SharePage() {
  const [shared, setShared] = useState(false);
  const [fallback, setFallback] = useState(false);

  useEffect(() => {
    // Try native share first (mobile/PWA/modern browsers)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const nav = navigator as any;
    if (typeof nav.share === "function") {
      nav
        .share({
          title: SHARE_TITLE,
          text: SHARE_TEXT,
          url: SHARE_URL,
        })
        .then(() => setShared(true))
        .catch(() => {
          // User cancelled or share failed — show fallback UI
          setFallback(true);
        });
    } else {
      // Desktop — no navigator.share, go straight to mailto
      const mailto = `mailto:?subject=${encodeURIComponent(SHARE_TITLE)}&body=${encodeURIComponent(`${SHARE_TEXT}\n\n${SHARE_URL}`)}`;
      window.location.href = mailto;
      // Also show fallback in case the mailto handler doesn't open
      setTimeout(() => setFallback(true), 800);
    }
  }, []);

  const mailtoUrl = `mailto:?subject=${encodeURIComponent(SHARE_TITLE)}&body=${encodeURIComponent(`${SHARE_TEXT}\n\n${SHARE_URL}`)}`;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(SHARE_URL);
      alert("Link copied!");
    } catch {
      alert("Could not copy — please select and copy manually.");
    }
  }

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl border border-stone-100 shadow-sm max-w-md w-full p-8 text-center">
        <div className="text-5xl mb-4">🌿</div>
        <h1 className="text-2xl font-bold text-stone-900 mb-2">Share Stack Ritual</h1>
        <p className="text-stone-500 text-sm mb-6">Help someone else build better habits.</p>

        {shared && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-4 text-emerald-800 text-sm">
            ✓ Thanks for sharing!
          </div>
        )}

        {fallback && !shared && (
          <div className="space-y-3">
            <a
              href={mailtoUrl}
              className="block bg-emerald-700 text-white py-3 rounded-xl font-semibold text-sm hover:bg-emerald-800 transition-colors"
            >
              📧 Share by email
            </a>
            <button
              onClick={copyLink}
              className="w-full border border-stone-200 text-stone-700 py-3 rounded-xl font-semibold text-sm hover:bg-stone-50 transition-colors"
            >
              📋 Copy link
            </button>
            <div className="text-xs text-stone-400 bg-stone-50 rounded-xl p-3 font-mono break-all">
              {SHARE_URL}
            </div>
          </div>
        )}

        {!shared && !fallback && (
          <div className="text-sm text-stone-400 py-4">Opening share...</div>
        )}

        <div className="mt-6 pt-6 border-t border-stone-100 text-xs text-stone-400">
          Want to <Link href="/affiliate-program" className="text-emerald-700 underline">earn</Link> by sharing?
        </div>
      </div>
    </div>
  );
}
