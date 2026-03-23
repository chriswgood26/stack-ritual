import Link from "next/link";
import { currentUser } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";
import BottomNav from "@/components/BottomNav";
import TopNav from "@/components/TopNav";
import HistoryCalendar from "@/components/HistoryCalendar";

export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  const user = await currentUser();
  if (!user) return null;

  const { data: logs } = await supabaseAdmin
    .from("daily_logs")
    .select("logged_date, stack_item_id, dose_index")
    .eq("user_id", user.id)
    .order("logged_date", { ascending: true });

  const { count: stackSize } = await supabaseAdmin
    .from("user_stacks")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("is_active", true);

  const logsByDate: Record<string, number> = {};
  (logs || []).forEach(log => {
    logsByDate[log.logged_date] = (logsByDate[log.logged_date] || 0) + 1;
  });

  const totalStack = stackSize || 1;
  const totalCheckins = Object.values(logsByDate).reduce((a, b) => a + b, 0);
  const perfectDays = Object.values(logsByDate).filter(c => c >= totalStack).length;
  const totalDays = Object.keys(logsByDate).length;
  const avgPerDay = totalDays > 0 ? Math.round((totalCheckins / totalDays) * 10) / 10 : 0;

  // Current streak
  let streak = 0;
  const now = new Date();
  const today = now.toISOString().split("T")[0];
  const checkDate = new Date(now);
  while (true) {
    const dateStr = checkDate.toISOString().split("T")[0];
    if (logsByDate[dateStr] && logsByDate[dateStr] >= totalStack) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else if (dateStr === today) {
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
            { value: totalCheckins, label: "Total" },
            { value: perfectDays, label: "Perfect" },
            { value: `${streak}🔥`, label: "Streak" },
            { value: avgPerDay, label: "Avg/day" },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl p-3 border border-stone-100 shadow-sm text-center">
              <div className="text-base font-bold text-stone-900">{s.value}</div>
              <div className="text-xs text-stone-500 leading-tight mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Pass data to client component */}
        <HistoryCalendar
          logsByDate={logsByDate}
          totalStack={totalStack}
          today={today}
        />

      </div>
      <BottomNav />
    </div>
  );
}
