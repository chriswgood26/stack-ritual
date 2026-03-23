import Link from "next/link";
import { currentUser } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";
import BottomNav from "@/components/BottomNav";
import TopNav from "@/components/TopNav";

export const dynamic = "force-dynamic";

function getCompletionColor(pct: number): string {
  if (pct === 0) return "bg-stone-100";
  if (pct < 25) return "bg-emerald-100";
  if (pct < 50) return "bg-emerald-200";
  if (pct < 75) return "bg-emerald-300";
  if (pct < 100) return "bg-emerald-400";
  return "bg-emerald-600";
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

export default async function HistoryPage() {
  const user = await currentUser();
  if (!user) return null;

  // Fetch all daily logs
  const { data: logs } = await supabaseAdmin
    .from("daily_logs")
    .select("logged_date, stack_item_id")
    .eq("user_id", user.id)
    .order("logged_date", { ascending: true });

  // Fetch stack size over time (approximate — use current count)
  const { count: stackSize } = await supabaseAdmin
    .from("user_stacks")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("is_active", true);

  // Group logs by date
  const logsByDate: Record<string, number> = {};
  (logs || []).forEach(log => {
    const date = log.logged_date;
    logsByDate[date] = (logsByDate[date] || 0) + 1;
  });

  const totalStack = stackSize || 1;

  // Build last 6 months of calendar data
  const now = new Date();
  const months: { year: number; month: number; label: string }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      year: d.getFullYear(),
      month: d.getMonth(),
      label: d.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
    });
  }

  // Overall stats
  const totalDays = Object.keys(logsByDate).length;
  const totalCheckins = Object.values(logsByDate).reduce((a, b) => a + b, 0);
  const avgPerDay = totalDays > 0 ? Math.round((totalCheckins / totalDays) * 10) / 10 : 0;
  const perfectDays = Object.values(logsByDate).filter(count => count >= totalStack).length;

  // Current streak
  let streak = 0;
  const today = now.toISOString().split("T")[0];
  let checkDate = new Date(now);
  while (true) {
    const dateStr = checkDate.toISOString().split("T")[0];
    if (logsByDate[dateStr] && logsByDate[dateStr] >= totalStack) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else if (dateStr === today && !logsByDate[dateStr]) {
      // Today not done yet — don't break streak, just move to yesterday
      checkDate.setDate(checkDate.getDate() - 1);
      const yesterday = checkDate.toISOString().split("T")[0];
      if (!logsByDate[yesterday] || logsByDate[yesterday] < totalStack) break;
    } else {
      break;
    }
  }

  return (
    <div className="min-h-screen bg-stone-50 font-sans pb-24">
      <TopNav />

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">

        {/* Summary stats */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { value: totalCheckins, label: "Total check-ins" },
            { value: perfectDays, label: "Perfect days" },
            { value: `${streak}🔥`, label: "Day streak" },
            { value: avgPerDay, label: "Avg/day" },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl p-3 border border-stone-100 shadow-sm text-center">
              <div className="text-base font-bold text-stone-900">{s.value}</div>
              <div className="text-xs text-stone-500 leading-tight mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 justify-end">
          <span className="text-xs text-stone-400">Less</span>
          {["bg-stone-100", "bg-emerald-100", "bg-emerald-200", "bg-emerald-400", "bg-emerald-600"].map(c => (
            <div key={c} className={`w-4 h-4 rounded-sm ${c}`} />
          ))}
          <span className="text-xs text-stone-400">More</span>
        </div>

        {/* Monthly calendars */}
        {months.map(({ year, month, label }) => {
          const daysInMonth = getDaysInMonth(year, month);
          const firstDay = getFirstDayOfMonth(year, month);

          return (
            <div key={`${year}-${month}`} className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5">
              <h2 className="font-semibold text-stone-900 mb-4">{label}</h2>

              {/* Day headers */}
              <div className="grid grid-cols-7 mb-1">
                {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                  <div key={i} className="text-center text-xs text-stone-400 font-medium py-1">{d}</div>
                ))}
              </div>

              {/* Calendar grid */}
              <div className="grid grid-cols-7 gap-1">
                {/* Empty cells for offset */}
                {Array.from({ length: firstDay }).map((_, i) => (
                  <div key={`empty-${i}`} />
                ))}

                {/* Day cells */}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                  const count = logsByDate[dateStr] || 0;
                  const pct = totalStack > 0 ? (count / totalStack) * 100 : 0;
                  const isToday = dateStr === today;
                  const isFuture = dateStr > today;

                  return (
                    <div
                      key={day}
                      title={isFuture ? "" : `${count}/${totalStack} taken`}
                      className={`aspect-square rounded-md flex items-center justify-center text-xs font-medium relative ${
                        isFuture
                          ? "bg-stone-50 text-stone-300"
                          : count === 0
                          ? "bg-stone-100 text-stone-400"
                          : `${getCompletionColor(pct)} text-white`
                      } ${isToday ? "ring-2 ring-emerald-600 ring-offset-1" : ""}`}
                    >
                      {day}
                      {pct >= 100 && !isFuture && (
                        <span className="absolute -top-0.5 -right-0.5 text-xs">✓</span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Month summary */}
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-stone-50 text-xs text-stone-500">
                <span>{Object.keys(logsByDate).filter(d => d.startsWith(`${year}-${String(month + 1).padStart(2, "0")}`)).length} active days</span>
                <span>{Object.keys(logsByDate).filter(d => d.startsWith(`${year}-${String(month + 1).padStart(2, "0")}`)).filter(d => logsByDate[d] >= totalStack).length} perfect days</span>
              </div>
            </div>
          );
        })}

      </div>
      <BottomNav />
    </div>
  );
}
