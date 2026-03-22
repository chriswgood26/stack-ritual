"use client";

import { useState } from "react";

export default function ShareAppButton() {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    const shareData = {
      title: "Stack Ritual",
      text: "I've been using Stack Ritual to track my supplements and optimize my health routine. Check it out!",
      url: "https://stackritual.com",
    };

    // Use native share sheet on mobile if available
    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch {
        // User cancelled or not supported — fall through to copy
      }
    }

    // Fallback: copy link to clipboard
    try {
      await navigator.clipboard.writeText("https://stackritual.com");
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Last resort: prompt
      prompt("Copy this link to share Stack Ritual:", "https://stackritual.com");
    }
  }

  return (
    <button
      onClick={handleShare}
      className="flex items-center justify-between px-4 py-4 w-full hover:bg-stone-50 transition-colors"
    >
      <div className="flex items-center gap-3">
        <span className="text-xl">🔗</span>
        <div className="text-left">
          <span className="font-medium text-stone-900 text-sm block">Share Stack Ritual</span>
          <span className="text-xs text-stone-400">
            {copied ? "✓ Link copied!" : "Invite a friend"}
          </span>
        </div>
      </div>
      <span className="text-stone-300">›</span>
    </button>
  );
}
