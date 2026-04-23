import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import TopNav from "@/components/TopNav";
import { currentUser } from "@clerk/nextjs/server";
import { getToday } from "@/lib/timezone";
import { supabaseAdmin } from "@/lib/supabase";
import { SignOutButton } from "@clerk/nextjs";
import FeedbackButton from "@/components/FeedbackButton";
import ShareModalButton from "@/components/ShareModalButton";
import EditProfileButton from "@/components/EditProfileButton";
import UpgradeButton from "@/components/UpgradeButton";
import ManageBillingButton from "@/components/ManageBillingButton";
import SMSSettings from "@/components/SMSSettings";
import EmailSettings from "@/components/EmailSettings";
import ReferralCodeInput from "@/components/ReferralCodeInput";
import { visitorHasAnnualPerk } from "@/lib/affiliatePerks";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await currentUser();
  if (!user) return null;
  const annualUnlocked = await visitorHasAnnualPerk();

  const userId = user.id;
  const firstName = user.firstName || user.emailAddresses?.[0]?.emailAddress?.split("@")[0] || "Friend";
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ") || firstName;
  const email = user.emailAddresses?.[0]?.emailAddress || "";
  const initials = ((user.firstName?.[0] || "") + (user.lastName?.[0] || "")).toUpperCase() || email[0]?.toUpperCase() || "U";

  // Fetch stats
  const today = await getToday();
  const [{ count: stackCount }, { count: logCount }, { count: experienceCount }, { count: todayCount }] = await Promise.all([
    supabaseAdmin.from("user_stacks").select("*", { count: "exact", head: true }).eq("user_id", userId).eq("is_active", true),
    supabaseAdmin.from("daily_logs").select("*", { count: "exact", head: true }).eq("user_id", userId),
    supabaseAdmin.from("experiences").select("*", { count: "exact", head: true }).eq("user_id", userId),
    supabaseAdmin.from("daily_logs").select("*", { count: "exact", head: true }).eq("user_id", userId).eq("logged_date", today),
  ]);

  // Fetch all remaining data in parallel
  const [
    { data: myExperiences },
    { data: subscription },
    { data: stackItems },
    { data: latestRelease }
  ] = await Promise.all([
    supabaseAdmin.from("experiences").select("id, rating, title, body, created_at, supplement:supplement_id(name, icon, slug)").eq("user_id", userId).order("created_at", { ascending: false }).limit(10),
    supabaseAdmin.from("subscriptions").select("plan, status, current_period_end, stripe_customer_id").eq("user_id", userId).single(),
    supabaseAdmin.from("user_stacks").select("id, custom_name, supplement:supplement_id(name, icon), timing, dose").eq("user_id", userId).eq("is_active", true).order("created_at", { ascending: false }).limit(5),
    supabaseAdmin.from("releases").select("version").order("released_at", { ascending: false }).order("version", { ascending: false }).limit(1).maybeSingle(),
  ]);

  const plan = subscription?.plan || "free";
  const isPayingPro = plan === "pro" && !!subscription?.stripe_customer_id;

  const memberSince = new Date(user.createdAt || Date.now()).toLocaleDateString("en-US", {
    month: "long", year: "numeric"
  });

  return (
    <div className="min-h-screen bg-stone-50 font-sans pb-24">

      {/* Top Nav */}
      <TopNav />

      <div className="max-w-lg mx-auto px-4 py-6 space-y-5">

        {/* Profile card */}
        <div className="bg-emerald-700 rounded-2xl p-6 text-white">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center text-2xl font-bold">
              {initials}
            </div>
            <div>
              <h1 className="text-xl font-bold">{fullName}</h1>
              <p className="text-emerald-200 text-sm">{email}</p>
              <p className="text-emerald-300 text-xs mt-0.5">Member since {memberSince}</p>
            </div>
          </div>
          <div className="border-t border-white/20 pt-3">
            <EditProfileButton inCard />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Link href="/dashboard/stack" className="bg-white rounded-2xl p-4 border border-stone-100 shadow-sm text-center hover:border-emerald-300 transition-colors">
            <div className="text-2xl font-bold text-stone-900">{stackCount ?? 0}</div>
            <div className="text-xs text-stone-500 mt-0.5">In stack</div>
          </Link>
          <Link href="/dashboard" className="bg-white rounded-2xl p-4 border border-stone-100 shadow-sm text-center hover:border-emerald-300 transition-colors">
            <div className="text-2xl font-bold text-emerald-600">{todayCount ?? 0}<span className="text-stone-400 text-lg font-normal">/{stackCount ?? 0}</span></div>
            <div className="text-xs text-stone-500 mt-0.5">Taken today</div>
          </Link>
          <Link href="/dashboard/experiences" className="bg-white rounded-2xl p-4 border border-stone-100 shadow-sm text-center hover:border-emerald-300 transition-colors">
            <div className="text-2xl font-bold text-stone-900">{experienceCount ?? 0}</div>
            <div className="text-xs text-stone-500 mt-0.5">Experiences</div>
          </Link>
        </div>

        {/* Lifetime check-ins */}
        <Link href="/dashboard/history" className="bg-white rounded-2xl border border-stone-100 shadow-sm px-5 py-4 flex items-center justify-between hover:border-emerald-300 transition-colors">
          <div className="flex items-center gap-3">
            <span className="text-2xl">✅</span>
            <div>
              <div className="font-semibold text-stone-900 text-sm">Lifetime check-ins</div>
              <div className="text-xs text-stone-500">View full history calendar →</div>
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-700">{logCount ?? 0}</div>
        </Link>

        {/* Referral code — hidden unless clicked. Lets visitors who arrived
            without the ref cookie (e.g. from a physical postcard) claim
            attribution and potentially unlock annual plans. Only shown on
            the free plan since paid users already past the attribution point. */}
        {plan === "free" && !annualUnlocked && <ReferralCodeInput />}

        {/* Plan card */}
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-stone-900">
                  {plan === "free" && "Free Plan"}
                  {plan === "plus" && "⭐ Plus Plan"}
                  {plan === "pro" && "🚀 Pro Plan"}
                </span>
                {plan !== "free" && (
                  <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">Active</span>
                )}
              </div>
              {plan === "free" && <p className="text-xs text-stone-500 mt-0.5">Up to 5 supplements · Basic features</p>}
              {plan === "plus" && <p className="text-xs text-stone-500 mt-0.5">Unlimited supplements · Email reminders</p>}
              {plan === "pro" && <p className="text-xs text-stone-500 mt-0.5">All features · SMS reminders</p>}
            </div>
            {plan === "free" && (
              <UpgradeButton priceKey="plus_monthly" label="Upgrade →" />
            )}
            {plan === "plus" && (
              <UpgradeButton priceKey="pro_monthly" label="Go Pro →" />
            )}
          </div>

          {annualUnlocked && plan === "free" && (
            <div className="bg-gradient-to-r from-amber-50 to-emerald-50 border border-amber-200 rounded-xl p-3 mt-3">
              <div className="text-xs font-semibold text-amber-900 mb-1">✨ Affiliate perk unlocked — save with annual</div>
              <p className="text-xs text-stone-600 mb-2">
                Plus <strong>$39.99/yr</strong> (save 33%) · Pro <strong>$79.99/yr</strong> (save 33%)
              </p>
              <div className="flex gap-2">
                <UpgradeButton priceKey="plus_yearly" label="Plus — Annual" className="flex-1 bg-stone-800 text-white py-2 rounded-xl text-xs font-semibold hover:bg-stone-900 transition-colors" />
                <UpgradeButton priceKey="pro_yearly" label="Pro — Annual" className="flex-1 bg-emerald-700 text-white py-2 rounded-xl text-xs font-semibold hover:bg-emerald-800 transition-colors" />
              </div>
            </div>
          )}

          {annualUnlocked && plan === "plus" && (
            <div className="bg-gradient-to-r from-amber-50 to-emerald-50 border border-amber-200 rounded-xl p-3 mt-3">
              <div className="text-xs font-semibold text-amber-900 mb-1">✨ Affiliate perk — upgrade to Pro Annual</div>
              <p className="text-xs text-stone-600 mb-2">Pro <strong>$79.99/yr</strong> (save 33% vs monthly)</p>
              <UpgradeButton priceKey="pro_yearly" label="Upgrade to Pro Annual" className="w-full bg-emerald-700 text-white py-2 rounded-xl text-xs font-semibold hover:bg-emerald-800 transition-colors" />
            </div>
          )}

          {plan === "plus" && (
            <div className="bg-emerald-50 rounded-xl p-3 mt-2">
              <div className="font-semibold text-stone-900 text-xs mb-0.5">🚀 Upgrade to Pro — $9.99/mo</div>
              <p className="text-xs text-stone-600">All features + SMS reminders coming soon</p>
            </div>
          )}

          {plan === "free" && (
            <div className="space-y-2 mt-4">
              <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide">Upgrade to unlock:</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-stone-50 rounded-xl p-3 text-xs text-stone-600">
                  <div className="font-semibold text-stone-900 mb-0.5">⭐ Plus — $4.99/mo</div>
                  Unlimited supplements, email reminders
                </div>
                <div className="bg-emerald-50 rounded-xl p-3 text-xs text-stone-600">
                  <div className="font-semibold text-stone-900 mb-0.5">🚀 Pro — $9.99/mo</div>
                  SMS reminders (coming soon)
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <UpgradeButton priceKey="plus_monthly" label="Get Plus" className="flex-1 bg-stone-800 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-stone-900 transition-colors" />
                <UpgradeButton priceKey="pro_monthly" label="Get Pro" className="flex-1 bg-emerald-700 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-emerald-800 transition-colors" />
              </div>
            </div>
          )}
        </div>

        {/* Recent stack */}
        {stackItems && stackItems.length > 0 && (
          <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100 bg-stone-50">
              <div>
                <span className="font-semibold text-stone-900 text-sm">My Stack</span>
                <p className="text-xs text-stone-400 mt-0.5">5 most recently added</p>
              </div>
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
            <Link href="/dashboard/mood-report?range=30" className="flex items-center justify-between px-4 py-4 hover:bg-stone-50 transition-colors">
              <div className="flex items-center gap-3">
                <span className="text-xl">📊</span>
                <span className="font-medium text-stone-900 text-sm">Mood & wellness report</span>
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

        {/* My Experiences */}
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100 bg-stone-50">
            <span className="font-semibold text-stone-900 text-sm">My Experiences ({experienceCount ?? 0})</span>
            <Link href="/dashboard/experiences" className="text-xs text-emerald-600 font-medium">+ Add new</Link>
          </div>
          {!myExperiences || myExperiences.length === 0 ? (
            <div className="px-4 py-6 text-center">
              <p className="text-stone-500 text-sm">You haven&apos;t shared any experiences yet.</p>
              <Link href="/dashboard/experiences" className="text-emerald-600 text-sm font-medium mt-1 inline-block">Share your first experience →</Link>
            </div>
          ) : (
            <div className="divide-y divide-stone-50">
              {myExperiences.map((exp) => {
                const supp = Array.isArray(exp.supplement) ? exp.supplement[0] : exp.supplement;
                return (
                  <div key={exp.id} className="px-4 py-3.5">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-base">{supp?.icon || "💊"}</span>
                      <span className="font-medium text-stone-900 text-sm">{supp?.name || "Custom supplement"}</span>
                      <div className="flex gap-0.5 ml-auto">
                        {[1,2,3,4,5].map(i => (
                          <span key={i} className={`text-xs ${i <= exp.rating ? "text-amber-400" : "text-stone-200"}`}>★</span>
                        ))}
                      </div>
                    </div>
                    {exp.title && <p className="text-xs font-semibold text-stone-700">{exp.title}</p>}
                    <p className="text-xs text-stone-500 leading-relaxed mt-0.5 line-clamp-2">{exp.body}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* App info + feedback */}
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
          <div className="divide-y divide-stone-50">
            <EmailSettings isPlusOrPro={plan === "plus" || plan === "pro"} />
            <SMSSettings isPro={plan === "pro"} />
            <ShareModalButton isPayingPro={isPayingPro} />
            <FeedbackButton />
            {plan !== "free" && <ManageBillingButton />}
            <div className="flex items-center justify-between px-4 py-4">
              <span className="text-sm text-stone-600">Version</span>
              <span className="text-sm text-stone-400">{latestRelease?.version || "—"}</span>
            </div>
            <Link href="/help" className="flex items-center justify-between px-4 py-4 hover:bg-stone-50 transition-colors">
              <div className="flex items-center gap-3">
                <span className="text-xl">📖</span>
                <span className="text-sm text-stone-900 font-medium">User Guide</span>
              </div>
              <span className="text-stone-300">›</span>
            </Link>
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
      <BottomNav />
    </div>
  );
}
