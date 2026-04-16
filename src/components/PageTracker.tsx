"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function PageTracker() {
  const pathname = usePathname();

  useEffect(() => {
    // Capture affiliate ref code from URL into 90-day cookie
    const params = new URLSearchParams(window.location.search);
    const refFromUrl = params.get("ref");
    if (refFromUrl) {
      document.cookie = `affiliate_ref=${refFromUrl}; path=/; max-age=${60 * 60 * 24 * 90}; samesite=lax`;
    }

    // Capture user referral code from URL into 90-day cookie
    const referralFromUrl = params.get("referral");
    if (referralFromUrl) {
      document.cookie = `referral_code=${referralFromUrl}; path=/; max-age=${60 * 60 * 24 * 90}; samesite=lax`;
    }

    // Only track public pages
    if (pathname.startsWith("/dashboard") || pathname.startsWith("/admin")) return;

    fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        path: pathname,
        referrer: document.referrer || null,
        utm_source: params.get("utm_source"),
        utm_medium: params.get("utm_medium"),
        utm_campaign: params.get("utm_campaign"),
      }),
    }).catch(() => {});
  }, [pathname]);

  return null;
}
