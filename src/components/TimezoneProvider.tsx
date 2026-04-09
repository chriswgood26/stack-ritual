"use client";

import { useEffect } from "react";

export default function TimezoneProvider() {
  useEffect(() => {
    // Detect user's timezone and save to a cookie so server components can read it
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    document.cookie = `user_tz=${encodeURIComponent(tz)}; path=/; max-age=86400; SameSite=Lax`;

    // Also persist to user_profiles so cron jobs (SMS reminders) can use it.
    // Throttle to once per day per browser to avoid hammering the API.
    const lastSynced = localStorage.getItem("tz_synced_at");
    const dayMs = 24 * 60 * 60 * 1000;
    if (!lastSynced || Date.now() - parseInt(lastSynced, 10) > dayMs) {
      fetch("/api/profile/timezone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ timezone: tz }),
      })
        .then(res => {
          if (res.ok) localStorage.setItem("tz_synced_at", String(Date.now()));
        })
        .catch(() => {});
    }
  }, []);

  return null;
}
