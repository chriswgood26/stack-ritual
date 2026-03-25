"use client";

import { useState, useMemo } from "react";
import Link from "next/link";

interface Props {
  logsByDate: Record<string, number>;
  moodByDate: Record<string, number>;
  moodNotesByDate: Record<string, string>;
  totalStack: number;
  today: string;
}

const ranges = [
  { label: "7 days", days: 7 },
  { label: "30 days", days: 30 },
  { label: "90 days", days: 90 },
  { label: "All time", days: 365 },
];

const moodEmoji = (score: number) => {
  if (score <= 2) return "😞";
  if (score <= 4) return "😕";
  if (score <= 6) return "😐";
  if (score <= 8) return "🙂";
  return "😁";
};

const moodColor = (score: number) => {
  if (score <= 2) return "#ef4444";
  if (score <= 4) return "#f97316";
  if (score <= 6) return "#eab308";
  if (score <= 8) return "#22c55e";
  return "#059669";
};

export default function MoodAnalytics({ logsByDate, moodByDate, moodNotesByDate, totalStack, today }: Props) {
  const [selectedRange, setSelectedRange] = useState(30);

  const stats = useMemo(() => {
    const cutoff = new Date(today);
    cutoff.setDate(cutoff.getDate() - selectedRange);
    const cutoffStr = cutoff.toISOString().split("T")[0];

    const moodDays = Object.entries(moodByDate)
      .filter(([date]) => date >= cutoffStr && date <= today)
      .sort(([a], [b]) => a.localeCompare(b));

    if (moodDays.length === 0) return null;

    const scores = moodDays.map(([, score]) => score);
    const avgMood = Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10;
    const bestDay = moodDays.reduce((a, b) => b[1] > a[1] ? b : a);
    const worstDay = moodDays.reduce((a, b) => b[1] < a[1] ? b : a);

    // Correlation: mood on high completion days vs low
    const highCompDays = moodDays.filter(([date]) => {
      const count = logsByDate[date] || 0;
      return totalStack > 0 && (count / totalStack) >= 0.8;
    });
    const lowCompDays = moodDays.filter(([date]) => {
      const count = logsByDate[date] || 0;
      return totalStack > 0 && (count / totalStack) < 0.8;
    });

    const avgHighComp = highCompDays.length > 0
      ? Math.round((highCompDays.reduce((a, [, s]) => a + s, 0) / highCompDays.length) * 10) / 10
      : null;
    const avgLowComp = lowCompDays.length > 0
      ? Math.round((lowCompDays.reduce((a, [, s]) => a + s, 0) / lowCompDays.length) * 10) / 10
      : null;

    // Trend: first half vs second half
    const half = Math.floor(moodDays.length / 2);
    const firstHalf = moodDays.slice(0, half);
    const secondHalf = moodDays.slice(half);
    const firstAvg = firstHalf.length > 0 ? firstHalf.reduce((a, [, s]) => a + s, 0) / firstHalf.length : 0;
    const secondAvg = secondHalf.length > 0 ? secondHalf.reduce((a, [, s]) => a + s, 0) / secondHalf.length : 0;
    const trend = secondAvg > firstAvg ? "improving" : secondAvg < firstAvg ? "declining" : "stable";

    return { moodDays, avgMood, bestDay, worstDay, avgHighComp, avgLowComp, trend, totalMoodDays: moodDays.length };
  }, [moodByDate, logsByDate, selectedRange, today, totalStack]);

  const formatDate = (d: string) => new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });

  return (
    <div className="space-y-4">
      {/* Range selector */}
      <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-4">
        <h2 className="font-semibold text-stone-900 mb-3">Mood Analytics</h2>
        <div className="flex gap-2">
          {ranges.map(r => (
            <button key={r.days} onClick={() => setSelectedRange(r.days)}
              className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-colors ${
                selectedRange === r.days
                  ? "bg-emerald-700 text-white"
                  : "bg-stone-100 text-stone-600 hover:bg-stone-200"
              }`}>
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {!stats ? (
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-6 text-center">
          <div className="text-3xl mb-2">😐</div>
          <p className="text-stone-500 text-sm">No mood data for this period yet.</p>
          <p className="text-stone-400 text-xs mt-1">Log your mood daily on the Today page to see trends here.</p>
        </div>
      ) : (
        <>
          {/* Summary stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-4 text-center">
              <div className="text-3xl mb-1">{moodEmoji(Math.round(stats.avgMood))}</div>
              <div className="text-2xl font-bold text-stone-900">{stats.avgMood}</div>
              <div className="text-xs text-stone-500 mt-0.5">Avg mood</div>
            </div>
            <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-4 text-center">
              <div className="text-2xl font-bold text-stone-900">{stats.totalMoodDays}</div>
              <div className="text-xs text-stone-500 mt-0.5">Days logged</div>
            </div>
            <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-4 text-center">
              <div className={`text-sm font-bold mt-1 ${stats.trend === "improving" ? "text-emerald-600" : stats.trend === "declining" ? "text-red-500" : "text-stone-500"}`}>
                {stats.trend === "improving" ? "📈 Improving" : stats.trend === "declining" ? "📉 Declining" : "➡️ Stable"}
              </div>
              <div className="text-xs text-stone-500 mt-0.5">Trend</div>
            </div>
          </div>

          {/* Mood bar chart */}
          <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5">
            <h3 className="font-semibold text-stone-900 text-sm mb-4">Daily mood</h3>
            <div className="flex items-end gap-1 h-20">
              {stats.moodDays.slice(-30).map(([date, score]) => (
                <div key={date} className="flex-1 flex flex-col items-center justify-end" title={`${formatDate(date)}: ${score}/10`}>
                  <div
                    className="w-full rounded-t-sm transition-all"
                    style={{
                      height: `${(score / 10) * 72}px`,
                      backgroundColor: moodColor(score),
                      minHeight: "4px",
                    }}
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-between text-xs text-stone-400 mt-2">
              <span>{formatDate(stats.moodDays[0][0])}</span>
              <span>{formatDate(stats.moodDays[stats.moodDays.length - 1][0])}</span>
            </div>
          </div>

          {/* Supplement correlation */}
          {stats.avgHighComp !== null && stats.avgLowComp !== null && (
            <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5">
              <h3 className="font-semibold text-stone-900 text-sm mb-3">💡 Supplement correlation</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white rounded-xl p-3 text-center">
                  <div className="text-xl font-bold text-emerald-700">{stats.avgHighComp}</div>
                  <div className="text-xs text-stone-500 mt-0.5">Avg mood when 80%+ stack done</div>
                </div>
                <div className="bg-white rounded-xl p-3 text-center">
                  <div className="text-xl font-bold text-stone-500">{stats.avgLowComp}</div>
                  <div className="text-xs text-stone-500 mt-0.5">Avg mood on other days</div>
                </div>
              </div>
              {stats.avgHighComp > stats.avgLowComp && (
                <p className="text-xs text-emerald-700 mt-3 font-medium text-center">
                  Your mood is {Math.round((stats.avgHighComp - stats.avgLowComp) * 10) / 10} points higher on days you complete your stack! 🌿
                </p>
              )}
            </div>
          )}

          {/* Best/worst days */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-4">
              <div className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">Best day</div>
              <div className="text-2xl">{moodEmoji(stats.bestDay[1])}</div>
              <div className="font-semibold text-stone-900 text-sm mt-1">{formatDate(stats.bestDay[0])}</div>
              <div className="text-emerald-600 font-bold">{stats.bestDay[1]}/10</div>
              {moodNotesByDate[stats.bestDay[0]] && (
                <p className="text-xs text-stone-500 mt-1 line-clamp-2">{moodNotesByDate[stats.bestDay[0]]}</p>
              )}
            </div>
            <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-4">
              <div className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">Roughest day</div>
              <div className="text-2xl">{moodEmoji(stats.worstDay[1])}</div>
              <div className="font-semibold text-stone-900 text-sm mt-1">{formatDate(stats.worstDay[0])}</div>
              <div className="text-red-500 font-bold">{stats.worstDay[1]}/10</div>
              {moodNotesByDate[stats.worstDay[0]] && (
                <p className="text-xs text-stone-500 mt-1 line-clamp-2">{moodNotesByDate[stats.worstDay[0]]}</p>
              )}
            </div>
          </div>

          {/* Print link */}
          <Link href={`/dashboard/mood-report?range=${selectedRange}`}
            className="flex items-center justify-center gap-2 bg-stone-800 text-white rounded-2xl py-3.5 text-sm font-semibold hover:bg-stone-900 transition-colors">
            🖨️ Print mood report
          </Link>
        </>
      )}
    </div>
  );
}
