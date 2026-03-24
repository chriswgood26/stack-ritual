"use client";

import { useEffect } from "react";

export default function TimezoneProvider() {
  useEffect(() => {
    // Detect user's timezone and save to a cookie so server can read it
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    document.cookie = `user_tz=${encodeURIComponent(tz)}; path=/; max-age=86400; SameSite=Lax`;
  }, []);

  return null;
}
