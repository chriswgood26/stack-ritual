"use client";

import { useState, useCallback } from "react";

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

function MonthCalendar({ year, month, label, logsByDate, totalStack, today, moodByDate = {}, onDayClick, loadingDay }: {
  year: number; month: number; label: string;
  logsByDate: Record<string, number>; totalStack: number; today: string;
  moodByDate?: Record<string, number>;
  onDayClick?: (date: string) => void;
  loadingDay?: string | null;
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

          const isClickable = !isFuture && count > 0;
          return (
            <div key={day}
              onClick={() => isClickable && onDayClick?.(dateStr)}
              title={isFuture ? "" : count > 0 ? `${count}/${totalStack} taken${mood ? ` · Mood: ${mood}/10` : ""} — tap for details` : ""}
              className={`aspect-square rounded-md flex flex-col items-center justify-center relative ${
                isFuture ? "bg-stone-50 text-stone-200" : getCompletionColor(pct)
              } ${isToday ? "ring-2 ring-emerald-600 ring-offset-1" : ""} ${
                isClickable ? "cursor-pointer hover:opacity-80 transition-opacity" : ""
              } ${loadingDay === dateStr ? "opacity-50" : ""}`}
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

interface DayDetail {
  date: string;
  logs: { taken_at: string; dose_index: number; stack_item: { custom_name: string | null; dose: string | null; category: string; custom_icon: string | null; supplement: { name: string; icon: string } | null } }[];
  mood: { mood_score: number; notes: string | null } | null;
}

export default function HistoryCalendar({ logsByDate, totalStack, today, moodByDate = {} }: Props) {
  const [showAll, setShowAll] = useState(false);
  const [selectedDay, setSelectedDay] = useState<DayDetail | null>(null);
  const [loadingDay, setLoadingDay] = useState<string | null>(null);
  const now = new Date();

  const handleDayClick = useCallback(async (dateStr: string) => {
    if (dateStr > today || !logsByDate[dateStr]) return; // skip future and empty days
    setLoadingDay(dateStr);
    const res = await fetch(`/api/history/day?date=${dateStr}`);
    const data = await res.json();
    setSelectedDay({ date: dateStr, ...data });
    setLoadingDay(null);
  }, [today, logsByDate]);

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
    <>
    <div className="space-y-4">
      {legend}

      {/* Current month — always shown */}
      <MonthCalendar {...currentMonth} logsByDate={logsByDate} totalStack={totalStack} today={today} moodByDate={moodByDate} onDayClick={handleDayClick} loadingDay={loadingDay} />

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
            <MonthCalendar key={`${m.year}-${m.month}`} {...m} logsByDate={logsByDate} totalStack={totalStack} today={today} moodByDate={moodByDate} onDayClick={handleDayClick} loadingDay={loadingDay} />
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

    {/* Day detail modal */}
    {selectedDay && (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center p-4 pb-20">
        <div className="bg-white rounded-2xl w-full max-w-lg p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-stone-900">
              {new Date(selectedDay.date + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            </h2>
            <button onClick={() => setSelectedDay(null)} className="text-stone-400 hover:text-stone-700 text-xl">✕</button>
          </div>

          {selectedDay.mood && (
            <div className="bg-stone-50 rounded-xl p-4">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">
                  {selectedDay.mood.mood_score <= 2 ? "😞" : selectedDay.mood.mood_score <= 4 ? "😕" : selectedDay.mood.mood_score <= 6 ? "😐" : selectedDay.mood.mood_score <= 8 ? "🙂" : "😁"}
                </span>
                <div className="font-semibold text-stone-900 text-sm">Mood: {selectedDay.mood.mood_score}/10</div>
              </div>
              {selectedDay.mood.notes && (
                <p className="text-stone-600 text-sm leading-relaxed">{selectedDay.mood.notes}</p>
              )}
            </div>
          )}

          <div>
            <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">
              Completed ({selectedDay.logs.length} items)
            </h3>
            {selectedDay.logs.length === 0 ? (
              <p className="text-stone-400 text-sm text-center py-3">Nothing logged this day.</p>
            ) : (
              <div className="space-y-2">
                {selectedDay.logs.map((log: { taken_at: string; dose_index: number; stack_item: { custom_name: string | null; dose: string | null; category: string; custom_icon: string | null; supplement: { name: string; icon: string } | { name: string; icon: string }[] | null } | { custom_name: string | null; dose: string | null; category: string; custom_icon: string | null; supplement: { name: string; icon: string } | { name: string; icon: string }[] | null }[] | null }, i: number) => {
                  const si = Array.isArray(log.stack_item) ? log.stack_item[0] : log.stack_item;
                  const supp = si ? (Array.isArray(si.supplement) ? si.supplement[0] : si.supplement) : null;
                  const name = supp?.name || si?.custom_name || "Unknown";
                  const icon = supp?.icon || si?.custom_icon || (si?.category === "ritual" ? "🧘" : "💊");
                  const time = new Date(log.taken_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
                  return (
                    <div key={i} className="flex items-center gap-3 bg-stone-50 rounded-xl px-4 py-2.5">
                      <span className="text-base">{icon}</span>
                      <div className="flex-1 min-w-0">
                        <span className="font-medium text-stone-900 text-sm">{name}</span>
                        {si?.dose && <span className="text-xs text-stone-400 ml-1">· {si.dose}</span>}
                      </div>
                      <span className="text-xs text-emerald-600 font-medium">{time}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    )}
    </>
  );
}
