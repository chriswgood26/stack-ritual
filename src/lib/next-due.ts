export const LESS_THAN_DAILY_TIMINGS = new Set([
  "weekly",
  "biweekly",
  "3x-week",
  "monthly",
  "cycle-5-2",
  "cycle-8-2w",
]);

export function isLessThanDaily(timing: string | null | undefined): boolean {
  return !!timing && LESS_THAN_DAILY_TIMINGS.has(timing);
}

function parseDate(ymd: string): Date {
  return new Date(`${ymd}T00:00:00Z`);
}

function toYmd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setUTCDate(out.getUTCDate() + n);
  return out;
}

function daysBetween(from: Date, to: Date): number {
  const ms = to.getTime() - from.getTime();
  return Math.round(ms / 86_400_000);
}

function consecutiveDayStreak(lastTakenYmd: string, logYmds: Set<string>): number {
  let streak = 0;
  let cursor = parseDate(lastTakenYmd);
  while (logYmds.has(toYmd(cursor))) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

function consecutiveWeekStreak(lastTakenYmd: string, logYmds: Set<string>): number {
  const lastTaken = parseDate(lastTakenYmd);
  const weekStart = addDays(lastTaken, -((lastTaken.getUTCDay() + 6) % 7));
  const weeksWithLog = new Set<string>();
  for (const ymd of logYmds) {
    const d = parseDate(ymd);
    const ws = addDays(d, -((d.getUTCDay() + 6) % 7));
    weeksWithLog.add(toYmd(ws));
  }
  let streak = 0;
  let cursor = weekStart;
  while (weeksWithLog.has(toYmd(cursor))) {
    streak += 1;
    cursor = addDays(cursor, -7);
  }
  return streak;
}

function computeNextDueYmd(
  timing: string,
  lastTakenYmd: string,
  logYmds: Set<string>,
): string | null {
  const last = parseDate(lastTakenYmd);
  switch (timing) {
    case "weekly":
      return toYmd(addDays(last, 7));
    case "biweekly":
      return toYmd(addDays(last, 3));
    case "3x-week":
      return toYmd(addDays(last, 2));
    case "monthly":
      return toYmd(addDays(last, 30));
    case "cycle-5-2": {
      const streak = consecutiveDayStreak(lastTakenYmd, logYmds);
      return toYmd(addDays(last, streak >= 5 ? 3 : 1));
    }
    case "cycle-8-2w": {
      const weekStreak = consecutiveWeekStreak(lastTakenYmd, logYmds);
      return toYmd(addDays(last, weekStreak >= 8 ? 21 : 7));
    }
    default:
      return null;
  }
}

function formatRelative(nextDueYmd: string, todayYmd: string): string {
  const diff = daysBetween(parseDate(todayYmd), parseDate(nextDueYmd));
  if (diff < 0) {
    const n = -diff;
    return `Overdue by ${n} day${n === 1 ? "" : "s"}`;
  }
  if (diff === 0) return "Due today";
  if (diff === 1) return "Due tomorrow";
  if (diff < 14) return `Due in ${diff} days`;
  const d = parseDate(nextDueYmd);
  return `Due ${d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })}`;
}

export function nextDueLabel(
  timing: string | null | undefined,
  lastTakenYmd: string | null,
  todayYmd: string,
  itemLogYmds: string[],
  startDateYmd?: string | null,
): string | null {
  if (!isLessThanDaily(timing)) return null;

  // No logs yet → anchor to start_date (if set) or "today".
  if (!lastTakenYmd) {
    return formatRelative(startDateYmd || todayYmd, todayYmd);
  }

  // Schedule was restarted after the last log → anchor to start_date.
  if (startDateYmd && startDateYmd > lastTakenYmd) {
    return formatRelative(startDateYmd, todayYmd);
  }

  const logSet = new Set(itemLogYmds);
  const nextDueYmd = computeNextDueYmd(timing!, lastTakenYmd, logSet);
  if (!nextDueYmd) return null;
  return formatRelative(nextDueYmd, todayYmd);
}
