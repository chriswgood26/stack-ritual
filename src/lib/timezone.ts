import { cookies } from "next/headers";

export function getUserTimezone(): string {
  try {
    const cookieStore = cookies();
    const tz = cookieStore.get("user_tz")?.value;
    if (tz) return decodeURIComponent(tz);
  } catch {}
  return "America/Los_Angeles"; // fallback
}

export function getTodayInTimezone(tz: string): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: tz }); // returns YYYY-MM-DD
}

export function getToday(): string {
  return getTodayInTimezone(getUserTimezone());
}
