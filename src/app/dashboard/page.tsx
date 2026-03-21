import Link from "next/link";
import { currentUser } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";
import Disclaimer from "@/components/Disclaimer";
import CheckoffButton from "@/components/CheckoffButton";

export const dynamic = "force-dynamic";

const timingOrder = [
  { key: "morning-fasted", label: "Morning — Fasted", time: "6:00 – 8:00 AM", icon: "🌅" },
  { key: "morning-food", label: "Morning — With Food", time: "8:00 – 9:00 AM", icon: "☀️" },
  { key: "2x-daily", label: "2x Daily", time: "AM + PM", icon: "☀️" },
  { key: "2x-with-meals", label: "2x Daily with Meals", time: "AM + PM meals", icon: "☀️" },
  { key: "3x-daily", label: "3x Daily", time: "AM, Midday, PM", icon: "🔄" },
  { key: "3x-with-meals", label: "3x Daily with Meals", time: "With each meal", icon: "🔄" },
  { key: "split", label: "Split Dose", time: "AM + PM", icon: "🔄" },
  { key: "afternoon", label: "Afternoon", time: "12:00 – 2:00 PM", icon: "🌤️" },
  { key: "evening", label: "Evening", time: "6:00 – 8:00 PM", icon: "🌆" },
  { key: "bedtime", label: "Bedtime", time: "9:00 – 10:00 PM", icon: "🌙" },
  { key: "as-needed", label: "As Needed", time: "When required", icon: "⚡" },
  { key: "weekly", label: "Weekly", time: "Once a week", icon: "📅" },
  { key: "biweekly", label: "Twice a Week", time: "2x per week", icon: "📅" },
  { key: "3x-week", label: "3x per Week", time: "3x per week", icon: "📅" },
  { key: "monthly", label: "Monthly", time: "Once a month", icon: "📅" },
  { key: "cycle-5-2", label: "Cycle 5/2", time: "5 on, 2 off", icon: "🔁" },
  { key: "cycle-8-2w", label: "Cycle 8wk/2wk", time: "8 weeks on, 2 off", icon: "🔁" },
];

export default async function Dashboard() {
  const user = await currentUser();
  if (!user) return null;

  const userId = user.id;
  const firstName = user.firstName || "there";

  // Fetch user's active stack
  const { data: stackItems } = await supabaseAdmin
    .from("user_stacks")
    .select("*, supplement:supplement_id(name, icon, slug)")
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  // Fetch today's checkoffs
  const today = new Date().toISOString().split("T")[0];
  const { data: todayLogs } = await supabaseAdmin
    .from("daily_logs")
    .select("stack_item_id")
    .eq("user_id", userId)
    .eq("logged_date", today);

  const checkedIds = new Set((todayLogs || []).map((l: { stack_item_id: string }) => l.stack_item_id));

  // Group by timing
  const grouped: Record<string, typeof stackItems> = {};
  (stackItems || []).forEach(item => {
    const timing = item.timing || "unscheduled";
    if (!grouped[timing]) grouped[timing] = [];
    grouped[timing]!.push(item);
  });

  // Sort groups by timingOrder
  const orderedGroups = timingOrder
    .filter(t => grouped[t.key]?.length)
    .map(t => ({ ...t, items: grouped[t.key]! }));

  // Add unscheduled at end if any
  if (grouped["unscheduled"]?.length) {
    orderedGroups.push({
      key: "unscheduled",
      label: "Unscheduled",
      time: "No time set",
      icon: "📋",
      items: grouped["unscheduled"]!,
    });
  }

  const totalItems = stackItems?.length ?? 0;
  const checkedCount = checkedIds.size;
  const supplements = stackItems?.filter(i => i.category === "supplement").length ?? 0;
  const rituals = stackItems?.filter(i => i.category === "ritual").length ?? 0;

  const now = new Date();
  const greeting = now.getHours() < 12 ? "Good morning" : now.getHours() < 17 ? "Good afternoon" : "Good evening";
  const dateStr = now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  return (
    <div className="min-h-screen bg-stone-50 font-sans">

      {/* Top Nav */}
      <nav className="bg-white border-b border-stone-200 px-4 py-3.5 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <span className="text-lg">🌿</span>
          <span className="font-bold text-stone-900 tracking-tight">Stack Ritual</span>
        </div>
        <Link href="/dashboard/search" className="text-emerald-700 text-sm font-semibold">
          + Add
        </Link>
      </nav>

      <div className="max-w-lg mx-auto px-4 py-6 pb-28">

        {/* Header */}
        <div className="mb-5">
          <h1 className="text-xl font-bold text-stone-900">{greeting}, {firstName} 👋</h1>
          <p className="text-stone-500 text-sm mt-0.5">{dateStr}</p>
        </div>

        {totalItems === 0 ? (
          /* Empty state */
          <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-8 text-center">
            <div className="text-5xl mb-4">🌿</div>
            <h2 className="text-lg font-bold text-stone-900 mb-2">Your stack is empty</h2>
            <p className="text-stone-500 text-sm mb-6">Start by searching our supplement database and adding what you take.</p>
            <Link href="/dashboard/search"
              className="bg-emerald-700 text-white px-6 py-3 rounded-full font-semibold text-sm hover:bg-emerald-800 transition-colors inline-block">
              🔬 Browse supplements
            </Link>
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-4 gap-2 mb-5">
              <div className="bg-white rounded-xl p-3 border border-stone-100 shadow-sm text-center">
                <div className="text-base font-bold text-stone-900">{totalItems}</div>
                <div className="text-xs text-stone-500 leading-tight">Total</div>
              </div>
              <div className="bg-white rounded-xl p-3 border border-stone-100 shadow-sm text-center">
                <div className="text-base font-bold text-stone-900">{supplements}</div>
                <div className="text-xs text-stone-500 leading-tight">Supps</div>
              </div>
              <div className="bg-white rounded-xl p-3 border border-stone-100 shadow-sm text-center">
                <div className="text-base font-bold text-stone-900">{rituals}</div>
                <div className="text-xs text-stone-500 leading-tight">Rituals</div>
              </div>
              <div className="bg-white rounded-xl p-3 border border-stone-100 shadow-sm text-center">
                <div className={`text-base font-bold ${checkedCount === totalItems ? "text-emerald-600" : "text-stone-900"}`}>
                  {checkedCount}/{totalItems}
                </div>
                <div className="text-xs text-stone-500 leading-tight">Done</div>
              </div>
            </div>

            {/* Progress bar */}
            {totalItems > 0 && (
              <div className="mb-5">
                <div className="flex items-center justify-between text-xs text-stone-500 mb-1.5">
                  <span>Today&apos;s progress</span>
                  <span>{Math.round((checkedCount / totalItems) * 100)}%</span>
                </div>
                <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                    style={{ width: `${(checkedCount / totalItems) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {/* Quick actions */}
            <div className="flex gap-2 mb-6">
              <Link href="/dashboard/print"
                className="flex-1 flex items-center justify-center gap-1.5 bg-white border border-stone-200 text-stone-700 px-3 py-2.5 rounded-full text-sm font-medium hover:bg-stone-50 transition-colors shadow-sm">
                🖨️ Print
              </Link>
              <Link href="/dashboard/search"
                className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-700 text-white px-3 py-2.5 rounded-full text-sm font-medium hover:bg-emerald-800 transition-colors shadow-sm">
                🔬 Research
              </Link>
            </div>

            {/* Time slots */}
            <div className="space-y-4">
              {orderedGroups.map(group => (
                <div key={group.key} className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100 bg-stone-50">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{group.icon}</span>
                      <div>
                        <div className="font-semibold text-stone-900 text-sm">{group.label}</div>
                        <div className="text-xs text-stone-500">{group.time}</div>
                      </div>
                    </div>
                    <span className="text-xs font-medium text-stone-400 bg-stone-100 px-2 py-0.5 rounded-full">
                      {group.items.length}
                    </span>
                  </div>

                  <div className="divide-y divide-stone-50">
                    {group.items.map(item => {
                      const supp = Array.isArray(item.supplement) ? item.supplement[0] : item.supplement;
                      const name = supp?.name || item.custom_name || "Unknown";
                      const icon = supp?.icon || item.custom_icon || (item.category === "ritual" ? "🧘" : "💊");
                      const isChecked = checkedIds.has(item.id);

                      return (
                        <div key={item.id} className="flex items-center justify-between px-4 py-3.5">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0 ${
                              item.category === "ritual" ? "bg-amber-100" : "bg-emerald-100"
                            }`}>
                              {icon}
                            </div>
                            <div className="min-w-0">
                              <div className={`font-medium text-sm ${isChecked ? "text-stone-400 line-through" : "text-stone-900"}`}>
                                {name}
                              </div>
                              {item.dose && (
                                <div className="text-xs text-stone-400">{item.dose}</div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                            {item.dose && (
                              <span className="text-xs font-medium text-stone-600 bg-stone-100 px-2 py-1 rounded-full whitespace-nowrap hidden sm:block">
                                {item.dose}
                              </span>
                            )}
                            <CheckoffButton
                              stackItemId={item.id}
                              userId={userId}
                              isChecked={isChecked}
                              date={today}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="mt-6">
          <Disclaimer compact />
        </div>

      </div>

      {/* Bottom Tab Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-stone-200 flex items-center justify-around px-4 py-2 z-10">
        <Link href="/dashboard" className="flex flex-col items-center gap-0.5 text-emerald-700">
          <span className="text-xl">🏠</span>
          <span className="text-xs font-medium">Today</span>
        </Link>
        <Link href="/dashboard/search" className="flex flex-col items-center gap-0.5 text-stone-400">
          <span className="text-xl">🔍</span>
          <span className="text-xs">Research</span>
        </Link>
        <Link href="/dashboard/stack" className="flex flex-col items-center gap-0.5 text-stone-400">
          <span className="text-xl">🧱</span>
          <span className="text-xs">My Stack</span>
        </Link>
        <Link href="/dashboard/experiences" className="flex flex-col items-center gap-0.5 text-stone-400">
          <span className="text-xl">💬</span>
          <span className="text-xs">Experiences</span>
        </Link>
        <Link href="/dashboard/profile" className="flex flex-col items-center gap-0.5 text-stone-400">
          <span className="text-xl">👤</span>
          <span className="text-xs">Profile</span>
        </Link>
      </div>

    </div>
  );
}
