import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import TopNav from "@/components/TopNav";
import { currentUser } from "@clerk/nextjs/server";
import { getToday } from "@/lib/timezone";
import { supabaseAdmin } from "@/lib/supabase";
import { getRitualIcon } from "@/lib/ritual-icons";
import Disclaimer from "@/components/Disclaimer";
import CheckoffButton from "@/components/CheckoffButton";
import MarkAllDoneButton from "@/components/MarkAllDoneButton";
import ResetTodayButton from "@/components/ResetTodayButton";
import EditStackItemButton from "@/components/EditStackItemButton";
import MarkSlotDoneButton from "@/components/MarkSlotDoneButton";
import QuantityAdjuster from "@/components/QuantityAdjuster";
import MoodSlider from "@/components/MoodSlider";
import ReferralCard from "@/components/ReferralCard";
import { isLessThanDaily, nextDueLabel } from "@/lib/next-due";
import { isUserBirthdayToday } from "@/lib/birthday";

export const dynamic = "force-dynamic";

const timingOrder = [
  { key: "morning-fasted", label: "Morning — Fasted", time: "6:00 – 8:00 AM", icon: "🌅" },
  { key: "morning-food", label: "Morning — With Food", time: "8:00 – 9:00 AM", icon: "☀️" },
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
  const firstName = user.firstName || user.emailAddresses?.[0]?.emailAddress?.split("@")[0] || "";

  // Fetch user's active stack
  const { data: stackItems } = await supabaseAdmin
    .from("user_stacks")
    .select("*, supplement:supplement_id(name, icon, slug)")
    .eq("user_id", userId)
    .eq("is_active", true)
    .or("is_paused.is.null,is_paused.eq.false")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  // Fetch today's checkoffs — use Pacific time
  const now = new Date();
  const today = await getToday(); // YYYY-MM-DD in Pacific time
  const { data: todayLogs } = await supabaseAdmin
    .from("daily_logs")
    .select("stack_item_id, dose_index, taken_at")
    .eq("user_id", userId)
    .eq("logged_date", today);

  // Build set of "itemId_doseIndex" keys and taken_at map
  const checkedIds = new Set((todayLogs || []).map((l: { stack_item_id: string; dose_index: number }) => `${l.stack_item_id}_${l.dose_index}`));
  const takenAtMap = Object.fromEntries((todayLogs || []).map((l: { stack_item_id: string; dose_index: number; taken_at: string }) => [`${l.stack_item_id}_${l.dose_index}`, l.taken_at]));

  // Fetch recent history (last 100 days) for less-than-daily next-due calc
  const historyStart = (() => {
    const d = new Date(`${today}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() - 100);
    return d.toISOString().slice(0, 10);
  })();
  const { data: recentLogs } = await supabaseAdmin
    .from("daily_logs")
    .select("stack_item_id, logged_date")
    .eq("user_id", userId)
    .gte("logged_date", historyStart)
    .order("logged_date", { ascending: false });

  const logsByItem = new Map<string, string[]>();
  for (const log of (recentLogs || []) as { stack_item_id: string; logged_date: string }[]) {
    const arr = logsByItem.get(log.stack_item_id) || [];
    arr.push(log.logged_date);
    logsByItem.set(log.stack_item_id, arr);
  }

  // Fetch user's subscription plan
  const { data: subData } = await supabaseAdmin
    .from("subscriptions")
    .select("plan, stripe_customer_id")
    .eq("user_id", userId)
    .maybeSingle();
  const userPlan = subData?.plan || "free";
  const isPayingPro = userPlan === "pro" && !!subData?.stripe_customer_id;

  // Fetch today's mood
  const { data: moodData } = await supabaseAdmin
    .from("daily_mood")
    .select("mood_score, notes")
    .eq("user_id", userId)
    .eq("logged_date", today)
    .single();

  // Fetch birthday profile for Today page banner
  const { data: bdayProfile } = await supabaseAdmin
    .from("user_profiles")
    .select("birth_month, birth_day, timezone")
    .eq("user_id", userId)
    .maybeSingle();

  // Expand multi-dose items into multiple entries
  type StackItem = NonNullable<typeof stackItems>[0] & { doseLabel?: string; doseIndex?: number; checkoffId?: string };
  const expandedItems: StackItem[] = [];

  (stackItems || []).forEach(item => {
    const freq = item.timing || "unscheduled";
    const multiMap: Record<string, { count: number; slots: string[] }> = {
      "2x-daily":       { count: 2, slots: ["morning-food", "evening"] },
      "2x-with-meals":  { count: 2, slots: ["morning-food", "evening"] },
      "split":          { count: 2, slots: ["morning-food", "evening"] },
      "3x-daily":       { count: 3, slots: ["morning-food", "afternoon", "evening"] },
      "3x-with-meals":  { count: 3, slots: ["morning-food", "afternoon", "evening"] },
      "4x-daily":       { count: 4, slots: ["morning-food", "afternoon", "evening", "bedtime"] },
    };
    const multi = multiMap[freq];
    if (multi) {
      multi.slots.forEach((slot, idx) => {
        expandedItems.push({
          ...item,
          timing: slot,
          doseLabel: ["1st dose", "2nd dose", "3rd dose", "4th dose"][idx],
          doseIndex: idx,
          checkoffId: `${item.id}_${idx}`,
        });
      });
    } else {
      expandedItems.push({ ...item, doseIndex: 0, checkoffId: `${item.id}_0` });
    }
  });

  // Separate as-needed from scheduled
  const scheduledItems = expandedItems.filter(i => i.timing !== "as-needed");
  const asNeededItems = expandedItems.filter(i => i.timing === "as-needed");

  // Group scheduled items by timing only
  const grouped: Record<string, StackItem[]> = {};
  scheduledItems.forEach(item => {
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

  // Less-than-daily timings should not be checked off by "Mark all done"
  const LESS_THAN_DAILY_TIMINGS = new Set(["weekly", "biweekly", "3x-week", "monthly", "cycle-5-2", "cycle-8-2w"]);
  const dailyScheduledItems = scheduledItems.filter(i => !LESS_THAN_DAILY_TIMINGS.has(i.timing || ""));

  const totalItems = scheduledItems.length;
  const supplements = scheduledItems.filter(i => i.category === "supplement").length;
  const rituals = scheduledItems.filter(i => i.category === "ritual").length;

  const dailyCheckedCount = dailyScheduledItems.filter(i => checkedIds.has(i.checkoffId || i.id)).length;
  const allDailyDone = dailyScheduledItems.length > 0 && dailyCheckedCount === dailyScheduledItems.length;

  // Use UTC offset for LA time (PDT = UTC-7, PST = UTC-8)
  const laHour = (now.getUTCHours() - 7 + 24) % 24; // PDT
  const greeting = laHour < 12 ? "Good morning" : laHour < 17 ? "Good afternoon" : "Good evening";
  const dateStr = now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "America/Los_Angeles" });

  return (
    <div className="min-h-screen bg-stone-50 font-sans">
      <TopNav />

      {bdayProfile && isUserBirthdayToday({
        birth_month: bdayProfile.birth_month ?? null,
        birth_day: bdayProfile.birth_day ?? null,
        timezone: bdayProfile.timezone ?? null,
      }) ? (
        <div className="max-w-lg mx-auto px-4 pt-4">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            🎉 Happy birthday{firstName ? `, ${firstName}` : ""}! Wishing you a great year ahead.
          </div>
        </div>
      ) : null}

      <div className="max-w-lg mx-auto px-4 py-6 pb-28">

        {/* Header */}
        <div className="mb-5">
          <h1 className="text-xl font-bold text-stone-900">{greeting}{firstName ? `, ${firstName}` : ""} 👋</h1>
          <Link href="/dashboard/history" className="text-stone-500 text-sm mt-0.5 hover:text-emerald-600 transition-colors">{dateStr} →</Link>
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
              <Link href="/dashboard/stack" className="bg-white rounded-xl p-3 border border-stone-100 shadow-sm text-center hover:border-emerald-300 transition-colors">
                <div className="text-base font-bold text-stone-900">{totalItems}</div>
                <div className="text-xs text-stone-500 leading-tight">Total</div>
              </Link>
              <Link href="/dashboard/stack" className="bg-white rounded-xl p-3 border border-stone-100 shadow-sm text-center hover:border-emerald-300 transition-colors">
                <div className="text-base font-bold text-stone-900">{supplements}</div>
                <div className="text-xs text-stone-500 leading-tight">Supps</div>
              </Link>
              <Link href="/dashboard/stack" className="bg-white rounded-xl p-3 border border-stone-100 shadow-sm text-center hover:border-emerald-300 transition-colors">
                <div className="text-base font-bold text-stone-900">{rituals}</div>
                <div className="text-xs text-stone-500 leading-tight">Rituals</div>
              </Link>
              <Link href="/dashboard/mood-report?range=30" className="bg-white rounded-xl p-3 border border-stone-100 shadow-sm text-center hover:border-emerald-300 transition-colors">
                <div className={`text-base font-bold ${allDailyDone ? "text-emerald-600" : "text-stone-900"}`}>
                  {dailyCheckedCount}/{dailyScheduledItems.length}
                </div>
                <div className="text-xs text-stone-500 leading-tight">Done</div>
              </Link>
            </div>

            {/* Progress bar */}
            {dailyScheduledItems.length > 0 && (
              <div className="mb-5">
                <div className="flex items-center justify-between mb-1.5">
                  <Link href="/dashboard/history" className="text-xs text-stone-500 hover:text-emerald-600 transition-colors flex items-center gap-1">
                    📅 Today&apos;s progress
                  </Link>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-stone-500">{Math.round((dailyCheckedCount / dailyScheduledItems.length) * 100)}%</span>
                    <MarkAllDoneButton
                      stackItems={dailyScheduledItems.map(i => ({ id: i.id, doseIndex: i.doseIndex ?? 0 }))}
                      date={today}
                      allDone={allDailyDone}
                    />
                  </div>
                </div>
                <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                    style={{ width: `${(dailyCheckedCount / dailyScheduledItems.length) * 100}%` }}
                  />
                </div>
              </div>
            )}



            {/* Time slots */}
            <div className="space-y-4">
              {orderedGroups.map(group => (
                <div key={group.key} className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-amber-100 bg-amber-50">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{group.icon}</span>
                      <div>
                        <div className="font-semibold text-stone-900 text-sm">{group.label}</div>
                        <div className="text-xs text-stone-500">{group.time}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <MarkSlotDoneButton
                        items={group.items.map(i => ({ id: i.id, doseIndex: i.doseIndex ?? 0 }))}
                        date={today}
                        allDone={group.items.every(i => checkedIds.has(i.checkoffId || i.id))}
                      />
                      <span className="text-xs font-medium text-stone-400 bg-stone-100 px-2 py-0.5 rounded-full">
                        {group.items.length}
                      </span>
                    </div>
                  </div>

                  <div className="divide-y divide-stone-50">
                    {group.items.map(item => {
                      const supp = Array.isArray(item.supplement) ? item.supplement[0] : item.supplement;
                      const name = supp?.name || item.custom_name || "Unknown";
                      const icon = supp?.icon || item.custom_icon || (item.category === "ritual" ? getRitualIcon(item.custom_name || "") : "💊");
                      const checkId = item.checkoffId || item.id;
                      const isChecked = checkedIds.has(checkId);
                      const displayName = isChecked && name.length > 18 ? name.slice(0, 18) + "…" : name;

                      return (
                        <div key={checkId} className="flex items-center justify-between px-4 py-3.5">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0 ${
                              item.category === "ritual" ? "bg-amber-100" : "bg-emerald-100"
                            }`}>
                              {icon}
                            </div>
                            <div className="min-w-0 flex-1">
                              <EditStackItemButton
                                itemId={item.id}
                                name={name}
                                displayName={displayName}
                                currentDose={item.dose}
                                currentTiming={item.timing}
                                currentBrand={item.brand}
                                currentNotes={item.notes}
                                currentFrequency={item.frequency_type}
                                currentQuantityTotal={item.quantity_total}
                                currentQuantityRemaining={item.quantity_remaining}
                                currentQuantityUnit={item.quantity_unit}
                                currentAutoDecrement={item.auto_decrement}
                                currentDosesPerServing={item.doses_per_serving}
                                currentPaused={item.is_paused}
                                currentStartDate={item.start_date}
                                isRitual={item.category === "ritual"}
                                asLabel
                                labelClassName={`font-medium text-sm truncate block ${isChecked ? "text-stone-400 line-through" : "text-stone-900 hover:text-emerald-700 transition-colors cursor-pointer"}`}
                              />
                              <div className="text-xs text-stone-400 truncate">
                                {item.doseLabel ? item.doseLabel : item.dose ? item.dose.split(".")[0] : ""}
                              </div>
                              {isLessThanDaily(item.timing) && (() => {
                                const itemLogs = logsByItem.get(item.id) || [];
                                const lastTaken = itemLogs[0] || null;
                                const label = nextDueLabel(item.timing, lastTaken, today, itemLogs, item.start_date);
                                if (!label) return null;
                                const overdue = label.startsWith("Overdue");
                                const dueToday = label === "Due today";
                                return (
                                  <div className={`text-[11px] mt-0.5 font-medium ${overdue ? "text-red-500" : dueToday ? "text-emerald-600" : "text-stone-500"}`}>
                                    {label}
                                  </div>
                                );
                              })()}
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-0.5 ml-2 flex-shrink-0 min-w-fit">
                            <CheckoffButton
                              stackItemId={item.id}
                              userId={userId}
                              isChecked={isChecked}
                              date={today}
                              doseIndex={item.doseIndex ?? 0}
                              takenAt={takenAtMap[checkId] || null}
                            />
                            {item.quantity_remaining !== null && item.quantity_remaining !== undefined && (
                              <QuantityAdjuster
                                itemId={item.id}
                                currentRemaining={item.quantity_remaining}
                                currentTotal={item.quantity_total}
                                unit={item.quantity_unit}
                                name={name}
                                compact
                                dosesPerServing={item.doses_per_serving}
                                resupplyOrdered={item.resupply_ordered}
                              />
                            )}
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

        {/* As needed section */}
        {asNeededItems.length > 0 && (
          <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden mt-4">
            <div className="flex items-center justify-between px-4 py-3 border-b border-amber-100 bg-amber-50">
              <div className="flex items-center gap-2">
                <span className="text-lg">⚡</span>
                <div>
                  <div className="font-semibold text-stone-900 text-sm">As Needed</div>
                  <div className="text-xs text-stone-500">Only take if required today</div>
                </div>
              </div>
              <span className="text-xs font-medium text-stone-400 bg-stone-100 px-2 py-0.5 rounded-full">{asNeededItems.length}</span>
            </div>
            <div className="divide-y divide-stone-50">
              {asNeededItems.map(item => {
                const supp = Array.isArray(item.supplement) ? item.supplement[0] : item.supplement;
                const name = supp?.name || item.custom_name || "Unknown";
                const icon = supp?.icon || item.custom_icon || (item.category === "ritual" ? getRitualIcon(item.custom_name || "") : "💊");
                const checkId = item.checkoffId || item.id;
                const isChecked = checkedIds.has(checkId);
                return (
                  <div key={checkId} className="flex items-center justify-between px-4 py-3.5">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0 ${item.category === "ritual" ? "bg-amber-100" : "bg-stone-100"}`}>
                        {icon}
                      </div>
                      <div className="min-w-0 flex-1">
                        <EditStackItemButton
                          itemId={item.id}
                          name={name}
                          displayName={isChecked && name.length > 18 ? name.slice(0, 18) + "…" : name}
                          currentDose={item.dose}
                          currentTiming={item.timing}
                          currentBrand={item.brand}
                          currentNotes={item.notes}
                          currentFrequency={item.frequency_type}
                          currentQuantityTotal={item.quantity_total}
                          currentQuantityRemaining={item.quantity_remaining}
                          currentQuantityUnit={item.quantity_unit}
                          currentAutoDecrement={item.auto_decrement}
                          currentDosesPerServing={item.doses_per_serving}
                          currentPaused={item.is_paused}
                          currentStartDate={item.start_date}
                          asLabel
                          labelClassName={`font-medium text-sm truncate block ${isChecked ? "text-stone-400 line-through" : "text-stone-900 hover:text-emerald-700 transition-colors cursor-pointer"}`}
                        />
                        {item.dose && <div className="text-xs text-stone-400 truncate">{item.dose.split(".")[0]}</div>}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-0.5 ml-2 flex-shrink-0 min-w-fit">
                      <CheckoffButton stackItemId={item.id} userId={userId} isChecked={isChecked} date={today} doseIndex={item.doseIndex ?? 0} takenAt={takenAtMap[checkId] || null} />
                      {item.quantity_remaining !== null && item.quantity_remaining !== undefined && (
                        <QuantityAdjuster
                          itemId={item.id}
                          currentRemaining={item.quantity_remaining}
                          currentTotal={item.quantity_total}
                          unit={item.quantity_unit}
                          name={name}
                          compact
                          dosesPerServing={item.doses_per_serving}
                          resupplyOrdered={item.resupply_ordered}
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Add to stack link */}
        <Link href="/dashboard/stack"
          className="flex items-center justify-center gap-2 bg-white border border-stone-200 text-stone-600 rounded-2xl py-3 text-sm font-medium hover:border-emerald-300 hover:text-emerald-700 transition-colors">
          + Add or manage my stack
        </Link>

        {/* Mood slider */}
        <div className="mt-6">
          <MoodSlider date={today} initialScore={moodData?.mood_score ?? null} initialNotes={moodData?.notes ?? null} />
        </div>

        {/* Referral card — paying Pro only (comped Pros can't accrue credits) */}
        {isPayingPro && <ReferralCard />}

        <div className="mt-4">
          <Disclaimer compact />
        </div>

      </div>
      <BottomNav />
    </div>
  );
}
