import Link from "next/link";
import { currentUser } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";
import { SignOutButton } from "@clerk/nextjs";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await currentUser();
  if (!user) return null;

  const userId = user.id;
  const firstName = user.firstName || "Friend";
  const email = user.emailAddresses?.[0]?.emailAddress || "";
  const initials = ((user.firstName?.[0] || "") + (user.lastName?.[0] || "")).toUpperCase() || email[0]?.toUpperCase() || "U";

  // Fetch stats
  const [{ count: stackCount }, { count: logCount }, { count: experienceCount }] = await Promise.all([
    supabaseAdmin.from("user_stacks").select("*", { count: "exact", head: true }).eq("user_id", userId).eq("is_active", true),
    supabaseAdmin.from("daily_logs").select("*", { count: "exact", head: true }).eq("user_id", userId),
    supabaseAdmin.from("experiences").select("*", { count: "exact", head: true }).eq("user_id", userId),
  ]);

  // Fetch recent stack items
  const { data: stackItems } = await supabaseAdmin
    .from("user_stacks")
    .select("id, custom_name, supplement:supplement_id(name, icon), timing, dose")
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(5);

  const memberSince = new Date(user.createdAt || Date.now()).toLocaleDateString("en-US", {
    month: "long", year: "numeric"
  });

  return (
    <div className="min-h-screen bg-stone-50 font-sans pb-24">

      {/* Top Nav */}
      <nav className="bg-white border-b border-stone-200 px-4 py-3.5 flex items-center justify-between sticky top-0 z-10">
        <span className="font-bold text-stone-900 tracking-tight">Profile</span>
        <SignOutButton>
          <button className="text-sm text-stone-500 hover:text-red-500 transition-colors font-medium">
            Sign out
          </button>
        </SignOutButton>
      </nav>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-5">

        {/* Profile card */}
        <div className="bg-emerald-700 rounded-2xl p-6 text-white">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center text-2xl font-bold">
              {initials}
            </div>
            <div>
              <h1 className="text-xl font-bold">{firstName}</h1>
              <p className="text-emerald-200 text-sm">{email}</p>
              <p className="text-emerald-300 text-xs mt-0.5">Member since {memberSince}</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-2xl p-4 border border-stone-100 shadow-sm text-center">
            <div className="text-2xl font-bold text-stone-900">{stackCount ?? 0}</div>
            <div className="text-xs text-stone-500 mt-0.5">In stack</div>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-stone-100 shadow-sm text-center">
            <div className="text-2xl font-bold text-stone-900">{logCount ?? 0}</div>
            <div className="text-xs text-stone-500 mt-0.5">Check-ins</div>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-stone-100 shadow-sm text-center">
            <div className="text-2xl font-bold text-stone-900">{experienceCount ?? 0}</div>
            <div className="text-xs text-stone-500 mt-0.5">Experiences</div>
          </div>
        </div>

        {/* Recent stack */}
        {stackItems && stackItems.length > 0 && (
          <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100 bg-stone-50">
              <span className="font-semibold text-stone-900 text-sm">My Stack</span>
              <Link href="/dashboard/stack" className="text-xs text-emerald-600 font-medium">View all →</Link>
            </div>
            <div className="divide-y divide-stone-50">
              {stackItems.map((item) => {
                const supp = Array.isArray(item.supplement) ? item.supplement[0] : item.supplement;
                return (
                  <div key={item.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center text-base flex-shrink-0">
                      {supp?.icon || "💊"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-stone-900 text-sm truncate">
                        {supp?.name || item.custom_name}
                      </div>
                      {item.dose && <div className="text-xs text-stone-400">{item.dose}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Quick links */}
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
          <div className="divide-y divide-stone-50">
            <Link href="/dashboard/print" className="flex items-center justify-between px-4 py-4 hover:bg-stone-50 transition-colors">
              <div className="flex items-center gap-3">
                <span className="text-xl">🖨️</span>
                <span className="font-medium text-stone-900 text-sm">Print stack summary</span>
              </div>
              <span className="text-stone-300">›</span>
            </Link>
            <Link href="/dashboard/experiences" className="flex items-center justify-between px-4 py-4 hover:bg-stone-50 transition-colors">
              <div className="flex items-center gap-3">
                <span className="text-xl">💬</span>
                <span className="font-medium text-stone-900 text-sm">My experiences</span>
              </div>
              <span className="text-stone-300">›</span>
            </Link>
            <Link href="/dashboard/search" className="flex items-center justify-between px-4 py-4 hover:bg-stone-50 transition-colors">
              <div className="flex items-center gap-3">
                <span className="text-xl">🔬</span>
                <span className="font-medium text-stone-900 text-sm">Research supplements</span>
              </div>
              <span className="text-stone-300">›</span>
            </Link>
          </div>
        </div>

        {/* App info */}
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
          <div className="divide-y divide-stone-50">
            <div className="flex items-center justify-between px-4 py-4">
              <span className="text-sm text-stone-600">Version</span>
              <span className="text-sm text-stone-400">1.0.0 beta</span>
            </div>
            <Link href="https://stackritual.com" target="_blank" className="flex items-center justify-between px-4 py-4 hover:bg-stone-50 transition-colors">
              <span className="text-sm text-stone-600">stackritual.com</span>
              <span className="text-stone-300">›</span>
            </Link>
          </div>
        </div>

        {/* Disclaimer */}
        <p className="text-xs text-stone-400 text-center leading-relaxed px-2">
          ⚕️ Nothing on Stack Ritual constitutes medical advice. Always consult your doctor before beginning or changing any supplement regimen.
        </p>

      </div>

      {/* Bottom Tab Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-stone-200 flex items-center justify-around px-4 py-2 z-10">
        <Link href="/dashboard" className="flex flex-col items-center gap-0.5 text-stone-400">
          <span className="text-xl">🏠</span>
          <span className="text-xs">Today</span>
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
        <Link href="/dashboard/profile" className="flex flex-col items-center gap-0.5 text-emerald-700">
          <span className="text-xl">👤</span>
          <span className="text-xs font-medium">Profile</span>
        </Link>
      </div>

    </div>
  );
}
