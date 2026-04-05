"use client";

import { useState, useCallback } from "react";

interface StackItem {
  id: string;
  custom_name: string | null;
  dose: string | null;
  category: string;
  custom_icon: string | null;
  supplement: { name: string; icon: string } | null;
}

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
                <span className="text-xs leading-none" style={{fontSize: '10px'}}>
                  {mood <= 2 ? "😞" : mood <= 4 ? "😕" : mood <= 6 ? "😐" : mood <= 8 ? "🙂" : "😁"}
                </span>
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

interface DayLog {
  id?: string;
  stack_item_id: string;
  taken_at: string;
  dose_index: number;
  stack_item: { custom_name: string | null; dose: string | null; category: string; custom_icon: string | null; supplement: { name: string; icon: string } | { name: string; icon: string }[] | null } | { custom_name: string | null; dose: string | null; category: string; custom_icon: string | null; supplement: { name: string; icon: string } | { name: string; icon: string }[] | null }[] | null;
}

interface DayDetail {
  date: string;
  logs: DayLog[];
  mood: { mood_score: number; notes: string | null } | null;
}

export default function HistoryCalendar({ logsByDate, totalStack, today, moodByDate = {} }: Props) {
  const [showAll, setShowAll] = useState(false);
  const [selectedDay, setSelectedDay] = useState<DayDetail | null>(null);
  const [loadingDay, setLoadingDay] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [allStackItems, setAllStackItems] = useState<StackItem[]>([]);
  const [loadingEdit, setLoadingEdit] = useState(false);
  const [savingItem, setSavingItem] = useState<string | null>(null);
  const [editTimes, setEditTimes] = useState<Record<string, string>>({}); // stack_item_id -> HH:MM
  const now = new Date();

  const refreshDayData = useCallback(async (dateStr: string) => {
    const res = await fetch(`/api/history/day?date=${dateStr}`);
    const data = await res.json();
    setSelectedDay({ date: dateStr, ...data });
    return data;
  }, []);

  const handleDayClick = useCallback(async (dateStr: string) => {
    if (dateStr > today || !logsByDate[dateStr]) return; // skip future and empty days
    setLoadingDay(dateStr);
    setEditMode(false);
    const res = await fetch(`/api/history/day?date=${dateStr}`);
    const data = await res.json();
    setSelectedDay({ date: dateStr, ...data });
    setLoadingDay(null);
  }, [today, logsByDate]);

  const enterEditMode = useCallback(async () => {
    if (!selectedDay) return;
    setLoadingEdit(true);
    // Fetch full stack item list
    const res = await fetch("/api/stack/list");
    const data = await res.json();
    setAllStackItems(data.items || []);
    // Initialize edit times from existing logs
    const times: Record<string, string> = {};
    selectedDay.logs.forEach((log) => {
      const d = new Date(log.taken_at);
      const hh = String(d.getHours()).padStart(2, "0");
      const mm = String(d.getMinutes()).padStart(2, "0");
      times[log.stack_item_id] = `${hh}:${mm}`;
    });
    setEditTimes(times);
    setEditMode(true);
    setLoadingEdit(false);
  }, [selectedDay]);

  const togglePastItem = useCallback(async (stackItemId: string, currentlyChecked: boolean) => {
    if (!selectedDay) return;
    setSavingItem(stackItemId);
    await fetch("/api/stack/checkoff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        stack_item_id: stackItemId,
        date: selectedDay.date,
        checked: !currentlyChecked,
        dose_index: 0,
      }),
    });
    const data = await refreshDayData(selectedDay.date);
    // Update edit times if newly checked
    if (!currentlyChecked) {
      const d = new Date();
      const hh = String(d.getHours()).padStart(2, "0");
      const mm = String(d.getMinutes()).padStart(2, "0");
      setEditTimes(prev => ({ ...prev, [stackItemId]: `${hh}:${mm}` }));
    } else {
      setEditTimes(prev => {
        const next = { ...prev };
        delete next[stackItemId];
        return next;
      });
    }
    // Update logsByDate count estimate
    if (data.logs) {
      logsByDate[selectedDay.date] = data.logs.length;
    }
    setSavingItem(null);
  }, [selectedDay, refreshDayData, logsByDate]);

  const updateTime = useCallback(async (stackItemId: string, timeStr: string) => {
    if (!selectedDay) return;
    setEditTimes(prev => ({ ...prev, [stackItemId]: timeStr }));
    await fetch("/api/history/update-log", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        stack_item_id: stackItemId,
        date: selectedDay.date,
        time: timeStr,
        dose_index: 0,
      }),
    });
    await refreshDayData(selectedDay.date);
  }, [selectedDay, refreshDayData]);

  const closeModal = useCallback(() => {
    setSelectedDay(null);
    setEditMode(false);
    setAllStackItems([]);
    setEditTimes({});
  }, []);

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
            <div className="flex items-center gap-2">
              {!editMode ? (
                <button
                  onClick={enterEditMode}
                  disabled={loadingEdit}
                  className="text-xs font-medium text-emerald-700 border border-emerald-200 rounded-lg px-2.5 py-1 hover:bg-emerald-50 transition-colors disabled:opacity-50"
                >
                  {loadingEdit ? "Loading…" : "✏️ Edit"}
                </button>
              ) : (
                <button
                  onClick={() => setEditMode(false)}
                  className="text-xs font-medium text-stone-600 border border-stone-200 rounded-lg px-2.5 py-1 hover:bg-stone-50 transition-colors"
                >
                  Done
                </button>
              )}
              <button onClick={closeModal} className="text-stone-400 hover:text-stone-700 text-xl">✕</button>
            </div>
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

          {/* Edit mode: show all stack items with toggle + time edit */}
          {editMode ? (
            <div>
              <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">
                Edit Selections
              </h3>
              {allStackItems.length === 0 ? (
                <p className="text-stone-400 text-sm text-center py-3">No stack items found.</p>
              ) : (
                <div className="space-y-2">
                  {allStackItems.map((item) => {
                    const supp = Array.isArray(item.supplement) ? item.supplement[0] : item.supplement;
                    const name = supp?.name || item.custom_name || "Unknown";
                    const icon = supp?.icon || item.custom_icon || (item.category === "ritual" ? "🧘" : "💊");
                    const isChecked = selectedDay.logs.some(l => l.stack_item_id === item.id);
                    const isSaving = savingItem === item.id;
                    const timeVal = editTimes[item.id] || "";

                    return (
                      <div key={item.id} className={`flex items-center gap-3 rounded-xl px-4 py-2.5 transition-colors ${isChecked ? "bg-emerald-50" : "bg-stone-50"}`}>
                        <button
                          onClick={() => togglePastItem(item.id, isChecked)}
                          disabled={isSaving}
                          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                            isChecked
                              ? "bg-emerald-700 border-emerald-700 text-white"
                              : "border-stone-300 hover:border-emerald-400"
                          } ${isSaving ? "opacity-50" : ""}`}
                        >
                          {isChecked && <span className="text-xs font-bold">✓</span>}
                        </button>
                        <span className="text-base">{icon}</span>
                        <div className="flex-1 min-w-0">
                          <span className={`font-medium text-sm ${isChecked ? "text-stone-900" : "text-stone-400"}`}>{name}</span>
                          {item.dose && <span className="text-xs text-stone-400 ml-1">· {item.dose}</span>}
                        </div>
                        {isChecked && (
                          <input
                            type="time"
                            value={timeVal}
                            onChange={(e) => updateTime(item.id, e.target.value)}
                            className="text-xs text-emerald-700 font-medium border border-emerald-200 rounded-lg px-1.5 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-emerald-400 w-[90px]"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div>
              <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">
                Completed ({selectedDay.logs.length} items)
              </h3>
              {selectedDay.logs.length === 0 ? (
                <p className="text-stone-400 text-sm text-center py-3">Nothing logged this day.</p>
              ) : (
                <div className="space-y-2">
                  {selectedDay.logs.map((log, i) => {
                    const si = Array.isArray(log.stack_item) ? log.stack_item[0] : log.stack_item;
                    const supp = si ? (Array.isArray(si.supplement) ? si.supplement[0] : si.supplement) : null;
                    const name = (supp as { name: string; icon: string } | null)?.name || si?.custom_name || "Unknown";
                    const icon = (supp as { name: string; icon: string } | null)?.icon || si?.custom_icon || (si?.category === "ritual" ? "🧘" : "💊");
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
          )}
        </div>
      </div>
    )}
    </>
  );
}
