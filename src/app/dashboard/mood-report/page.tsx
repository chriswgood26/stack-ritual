"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface MoodDay {
  date: string;
  score: number;
  notes: string | null;
  completionPct: number;
}

const moodEmoji = (score: number) => {
  if (score <= 2) return "😞";
  if (score <= 4) return "😕";
  if (score <= 6) return "😐";
  if (score <= 8) return "🙂";
  return "😁";
};

function MoodReportContent() {
  const params = useSearchParams();
  const range = parseInt(params.get("range") || "180");
  const [data, setData] = useState<MoodDay[] | null>(null);
  const [userName, setUserName] = useState("");

  useEffect(() => {
    fetch(`/api/mood/report?range=${range}`)
      .then(r => r.json())
      .then(d => { setData(d.days); setUserName(d.userName || ""); });
  }, [range]);

  const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const rangeLabel = range === 365 ? "All time" : `Last ${range} days`;

  const avgMood = data && data.length > 0
    ? Math.round((data.reduce((a, d) => a + d.score, 0) / data.length) * 10) / 10
    : 0;

  const highCompDays = data?.filter(d => d.completionPct >= 80) || [];
  const lowCompDays = data?.filter(d => d.completionPct < 80) || [];
  const avgHighComp = highCompDays.length > 0
    ? Math.round((highCompDays.reduce((a, d) => a + d.score, 0) / highCompDays.length) * 10) / 10
    : null;
  const avgLowComp = lowCompDays.length > 0
    ? Math.round((lowCompDays.reduce((a, d) => a + d.score, 0) / lowCompDays.length) * 10) / 10
    : null;

  return (
    <div className="min-h-screen bg-stone-50 font-sans">
      <nav className="bg-white border-b border-stone-200 px-4 py-3.5 flex items-center justify-between sticky top-0 z-10 print:hidden">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/history" className="text-stone-400 text-lg">←</Link>
          <span className="font-bold text-stone-900">Mood Report</span>
        </div>
        <div className="flex gap-2">
          <a
            href={`mailto:?subject=My%20Mood%20%26%20Wellness%20Report&body=Hi%2C%0A%0AI%27ve%20attached%20my%20mood%20and%20wellness%20report%20as%20a%20PDF%20for%20your%20review.%0A%0AThis%20report%20was%20generated%20by%20Stack%20Ritual%20(stackritual.com)%20and%20shows%20my%20daily%20mood%20scores%2C%20supplement%20adherence%2C%20and%20the%20correlation%20between%20the%20two.%0A%0ANote%3A%20Please%20save%20this%20draft%2C%20use%20Print%20%2F%20Save%20PDF%20to%20generate%20the%20PDF%2C%20then%20attach%20it%20before%20sending.%0A%0AThanks`}
            className="bg-stone-700 text-white text-sm font-semibold px-4 py-2 rounded-full hover:bg-stone-800 transition-colors"
          >
            ✉️ Email
          </a>
          <button onClick={() => window.print()}
            className="bg-emerald-700 text-white text-sm font-semibold px-4 py-2 rounded-full hover:bg-emerald-800 transition-colors">
            🖨️ Print / Save PDF
          </button>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 py-6 pb-20 print:px-0 print:py-0">
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-8 print:shadow-none print:border-none print:rounded-none">

          {/* Header */}
          <div className="flex items-start justify-between mb-6 pb-6 border-b border-stone-200">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-2xl">🌿</span>
                <span className="text-xl font-bold text-stone-900">Stack Ritual</span>
              </div>
              <h1 className="text-2xl font-bold text-stone-900 mt-2">Mood & Wellness Report</h1>
              {userName && <p className="text-stone-500 text-sm mt-1">Prepared for: <strong>{userName}</strong></p>}
              <p className="text-stone-400 text-sm">{rangeLabel} · {today}</p>
            </div>
            <div className="text-right">
              <div className="text-5xl">{data ? moodEmoji(Math.round(avgMood)) : "😐"}</div>
              <div className="text-3xl font-bold text-stone-900 mt-1">{avgMood}<span className="text-sm text-stone-400 font-normal">/10</span></div>
              <div className="text-xs text-stone-500">Average mood</div>
            </div>
          </div>

          {!data ? (
            <p className="text-stone-400 text-sm text-center py-8">Loading...</p>
          ) : data.length === 0 ? (
            <p className="text-stone-400 text-sm text-center py-8">No mood data for this period.</p>
          ) : (
            <>
              {/* Stats summary */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-stone-50 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-stone-900">{data.length}</div>
                  <div className="text-xs text-stone-500">Days logged</div>
                </div>
                <div className="bg-stone-50 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-emerald-700">{Math.max(...data.map(d => d.score))}/10</div>
                  <div className="text-xs text-stone-500">Best score</div>
                </div>
                <div className="bg-stone-50 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-stone-900">{Math.min(...data.map(d => d.score))}/10</div>
                  <div className="text-xs text-stone-500">Lowest score</div>
                </div>
              </div>

              {/* Mood Graph */}
              {data.length >= 2 && (
                <div className="mb-6">
                  <h2 className="font-semibold text-stone-900 text-sm mb-3">Mood Over Time</h2>
                  <div className="bg-stone-50 rounded-xl p-4 print:bg-white">
                    <ResponsiveContainer width="100%" height={240}>
                      <LineChart
                        data={data.map((d) => ({
                          date: new Date(d.date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }),
                          score: d.score,
                        }))}
                        margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
                        <XAxis
                          dataKey="date"
                          tick={{ fontSize: 11, fill: "#a8a29e" }}
                          tickLine={false}
                          axisLine={{ stroke: "#d6d3d1" }}
                          interval="preserveStartEnd"
                        />
                        <YAxis
                          domain={[1, 10]}
                          ticks={[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]}
                          tick={{ fontSize: 11, fill: "#a8a29e" }}
                          tickLine={false}
                          axisLine={{ stroke: "#d6d3d1" }}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#fff",
                            border: "1px solid #e7e5e4",
                            borderRadius: "12px",
                            fontSize: "13px",
                            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                          }}
                          formatter={(value) => [`${value}/10`, "Mood"]}
                        />
                        <Line
                          type="monotone"
                          dataKey="score"
                          stroke="#047857"
                          strokeWidth={2.5}
                          dot={{ r: 4, fill: "#047857", strokeWidth: 0 }}
                          activeDot={{ r: 6, fill: "#047857", stroke: "#d1fae5", strokeWidth: 2 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Supplement correlation */}
              {avgHighComp !== null && avgLowComp !== null && (
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 mb-6">
                  <h2 className="font-semibold text-stone-900 text-sm mb-3">Supplement Adherence vs Mood</h2>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white rounded-lg p-3 text-center">
                      <div className="text-xl font-bold text-emerald-700">{avgHighComp}/10</div>
                      <div className="text-xs text-stone-500">Avg mood when ≥80% stack completed</div>
                    </div>
                    <div className="bg-white rounded-lg p-3 text-center">
                      <div className="text-xl font-bold text-stone-900">{avgLowComp}/10</div>
                      <div className="text-xs text-stone-500">Avg mood on other days</div>
                    </div>
                  </div>
                  {avgHighComp > avgLowComp && (
                    <p className="text-xs text-emerald-700 mt-2 font-medium text-center">
                      Mood is {Math.round((avgHighComp - avgLowComp) * 10) / 10} points higher on high-compliance days
                    </p>
                  )}
                </div>
              )}

              {/* Daily log */}
              <h2 className="font-semibold text-stone-900 text-sm mb-3">Daily Log</h2>
              <table className="w-full text-sm mb-6">
                <thead>
                  <tr className="text-xs text-stone-400 font-medium border-b border-stone-100">
                    <th className="text-left py-2">Date</th>
                    <th className="text-left py-2">Mood</th>
                    <th className="text-left py-2">Stack</th>
                    <th className="text-left py-2">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map(day => (
                    <tr key={day.date} className="border-b border-stone-50">
                      <td className="py-2 text-stone-600 text-xs">
                        {new Date(day.date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </td>
                      <td className="py-2">
                        <span className="font-semibold">{moodEmoji(day.score)} {day.score}/10</span>
                      </td>
                      <td className="py-2 text-stone-500 text-xs">{day.completionPct}%</td>
                      <td className="py-2 text-stone-500 text-xs">{day.notes || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Calendar link */}
              <Link
                href="/dashboard/history"
                className="flex items-center justify-between bg-stone-50 border border-stone-100 rounded-xl px-4 py-3 hover:border-emerald-300 transition-colors print:hidden"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">📅</span>
                  <div>
                    <div className="font-semibold text-stone-900 text-sm">Calendar</div>
                    <div className="text-xs text-stone-500">View your daily check-ins and streaks</div>
                  </div>
                </div>
                <span className="text-stone-300">›</span>
              </Link>

              {/* Disclaimer */}
              <div className="pt-4 border-t border-stone-200">
                <p className="text-xs text-stone-400 leading-relaxed">
                  <strong>Medical Disclaimer:</strong> This report reflects self-reported mood data and supplement adherence tracked in Stack Ritual. It does not constitute medical advice or diagnosis. Please share with your healthcare provider for professional interpretation.
                </p>
                <p className="text-xs text-stone-400 mt-1">Generated by Stack Ritual · stackritual.com · {today}</p>
              </div>
            </>
          )}
        </div>
      </div>

      <style>{`
        @media print {
          body { background: white; }
          @page { margin: 0.5in; }
          .print\\:hidden { display: none !important; }
        }
      `}</style>
    </div>
  );
}

export default function MoodReportPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-stone-50 flex items-center justify-center"><div className="text-4xl">🌿</div></div>}>
      <MoodReportContent />
    </Suspense>
  );
}
