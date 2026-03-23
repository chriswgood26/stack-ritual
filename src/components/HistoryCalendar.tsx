"use client";

import { useState } from "react";

interface Props {
  logsByDate: Record<string, number>;
  totalStack: number;
  today: string;
  moodByDate?: Record<string, number>;
}

function getCompletionColor(pct: number): string {
  if (pct === 0) return "bg-stone-100 text-stone-400";
  if (pct < 25) return "bg-emerald-100 text-emerald-700";
  if (pct < 50) return "bg-emerald-200 text-emerald-700";
  if (pct < 75) return "bg-emerald-300 text-white";
  if (pct < 100) return "bg-emerald-400 text-white";
  return "bg-emerald-600 text-white";
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

function MonthCalendar({ year, month, label, logsByDate, totalStack, today, moodByDate = {} }: {
  year: number; month: number; label: string;
  logsByDate: Record<string, number>; totalStack: number; today: string;
  moodByDate?: Record<string, number>;
}) {
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const monthPrefix = `${year}-${String(month + 1).padStart(2, "0")}`;

  const activeDays = Object.keys(logsByDate).filter(d => d.startsWith(monthPrefix)).length;
  const perfectDaysMonth = Object.keys(logsByDate)
    .filter(d => d.startsWith(monthPrefix))
    .filter(d => logsByDate[d] >= totalStack).length;

  return (
    <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-stone-900">{label}</h2>
        <div className="text-xs text-stone-400">{activeDays} active · {perfectDaysMonth} perfect</div>
      </div>

      <div className="grid grid-cols-7 mb-1">
        {["S","M","T","W","T","F","S"].map((d, i) => (
          <div key={i} className="text-center text-xs text-stone-400 font-medium py-1">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const dateStr = `${monthPrefix}-${String(day).padStart(2, "0")}`;
          const count = logsByDate[dateStr] || 0;
          const pct = (count / totalStack) * 100;
          const isToday = dateStr === today;
          const isFuture = dateStr > today;
          const mood = moodByDate[dateStr];

          return (
            <div key={day}
              title={isFuture ? "" : `${count}/${totalStack} taken${mood ? ` · Mood: ${mood}/10` : ""}`}
              className={`aspect-square rounded-md flex flex-col items-center justify-center relative ${
                isFuture ? "bg-stone-50 text-stone-200" : getCompletionColor(pct)
              } ${isToday ? "ring-2 ring-emerald-600 ring-offset-1" : ""}`}
            >
              <span className="text-xs font-medium leading-none">{day}</span>
              {!isFuture && mood && (
                <span className="text-xs leading-none mt-0.5 opacity-90 font-bold">{mood}</span>
              )}
              {!isFuture && pct >= 100 && !mood && (
                <span className="absolute -top-0.5 -right-0.5 text-xs leading-none">✓</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function HistoryCalendar({ logsByDate, totalStack, today, moodByDate = {} }: Props) {
  const [showAll, setShowAll] = useState(false);
  const now = new Date();

  // Current month
  const currentMonth = {
    year: now.getFullYear(),
    month: now.getMonth(),
    label: now.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
  };

  // Previous 11 months
  const previousMonths = Array.from({ length: 11 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (i + 1), 1);
    return {
      year: d.getFullYear(),
      month: d.getMonth(),
      label: d.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
    };
  });

  // Legend
  const legend = (
    <div className="flex items-center gap-2 justify-end">
      <span className="text-xs text-stone-400">Less</span>
      {["bg-stone-100", "bg-emerald-100", "bg-emerald-200", "bg-emerald-400", "bg-emerald-600"].map(c => (
        <div key={c} className={`w-4 h-4 rounded-sm ${c}`} />
      ))}
      <span className="text-xs text-stone-400">More</span>
    </div>
  );

  return (
    <div className="space-y-4">
      {legend}

      {/* Current month — always shown */}
      <MonthCalendar {...currentMonth} logsByDate={logsByDate} totalStack={totalStack} today={today} moodByDate={moodByDate} />

      {/* Previous months — behind toggle */}
      {!showAll ? (
        <button
          onClick={() => setShowAll(true)}
          className="w-full bg-white border border-stone-200 rounded-2xl py-4 text-sm font-medium text-stone-600 hover:border-emerald-300 hover:text-emerald-700 transition-colors"
        >
          📅 View full history ({previousMonths.length} more months)
        </button>
      ) : (
        <>
          {previousMonths.map(m => (
            <MonthCalendar key={`${m.year}-${m.month}`} {...m} logsByDate={logsByDate} totalStack={totalStack} today={today} moodByDate={moodByDate} />
          ))}
          <button
            onClick={() => setShowAll(false)}
            className="w-full bg-white border border-stone-200 rounded-2xl py-3 text-sm font-medium text-stone-500 hover:bg-stone-50 transition-colors"
          >
            ↑ Show less
          </button>
        </>
      )}
    </div>
  );
}
