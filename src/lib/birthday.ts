// Pure helpers for birthday celebration logic.
// Computing "is today the user's birthday in their timezone" requires the
// user's timezone string (IANA, e.g. "America/Los_Angeles"). We use
// Intl.DateTimeFormat to extract local date parts.

export type BirthdayProfile = {
  birth_month: number | null;
  birth_day: number | null;
  timezone: string | null;
};

function getLocalParts(tz: string, now: Date): { month: number; day: number; hour: number } | null {
  try {
    const fmt = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      hour12: false,
    });
    const parts = Object.fromEntries(
      fmt.formatToParts(now).map(p => [p.type, p.value]),
    ) as Record<string, string>;
    const month = Number(parts.month);
    const day = Number(parts.day);
    const hour = Number(parts.hour);
    if (!Number.isFinite(month) || !Number.isFinite(day) || !Number.isFinite(hour)) return null;
    return { month, day, hour };
  } catch {
    return null;
  }
}

export function isUserBirthdayToday(
  profile: BirthdayProfile,
  now: Date = new Date(),
): boolean {
  if (profile.birth_month == null || profile.birth_day == null) return false;
  if (!profile.timezone) return false;
  const local = getLocalParts(profile.timezone, now);
  if (!local) return false;
  return local.month === profile.birth_month && local.day === profile.birth_day;
}

export function userLocalHour(timezone: string, now: Date = new Date()): number | null {
  const local = getLocalParts(timezone, now);
  return local?.hour ?? null;
}
