import Link from "next/link";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase";

const ADMIN_USER_IDS = process.env.ADMIN_USER_IDS?.split(",") || [];

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");
  if (!ADMIN_USER_IDS.includes(user.id)) redirect("/dashboard");

  // Quick stats
  const [usersR, stacksR, expsR, feedbackR, suppsR, affiliatesR] = await Promise.all([
    supabaseAdmin.from("user_profiles").select("*", { count: "exact", head: true }),
    supabaseAdmin.from("user_stacks").select("*", { count: "exact", head: true }).eq("is_active", true),
    supabaseAdmin.from("experiences").select("*", { count: "exact", head: true }),
    supabaseAdmin.from("app_feedback").select("*", { count: "exact", head: true }),
    supabaseAdmin.from("user_submitted_supplements").select("*", { count: "exact", head: true }).eq("status", "pending"),
    supabaseAdmin.from("affiliates").select("*", { count: "exact", head: true }).eq("status", "active"),
  ]);

  // Page views
  const now = new Date();
  const yr = now.getFullYear();
  const mo = now.getMonth();
  const day = now.getDate();
  const dow = now.getDay();

  const startOfToday = new Date(yr, mo, day).toISOString();
  const startOfYesterday = new Date(yr, mo, day - 1).toISOString();
  const endOfYesterday = new Date(yr, mo, day).toISOString();
  const startOfWeek = new Date(yr, mo, day - dow).toISOString();
  const startOfLastWeek = new Date(yr, mo, day - dow - 7).toISOString();
  const endOfLastWeek = new Date(yr, mo, day - dow).toISOString();
  const startOfMonth = new Date(yr, mo, 1).toISOString();
  const startOfLastMonth = new Date(yr, mo - 1, 1).toISOString();
  const endOfLastMonth = new Date(yr, mo, 1).toISOString();
  const startOfLastYear = new Date(yr - 1, 0, 1).toISOString();
  const endOfLastYear = new Date(yr, 0, 1).toISOString();

  // Sign-up counts
  const [signupsTodayR, signupsWeekR, signupsMonthR] = await Promise.all([
    supabaseAdmin.from("user_profiles").select("*", { count: "exact", head: true }).gte("created_at", startOfToday),
    supabaseAdmin.from("user_profiles").select("*", { count: "exact", head: true }).gte("created_at", startOfWeek),
    supabaseAdmin.from("user_profiles").select("*", { count: "exact", head: true }).gte("created_at", startOfMonth),
  ]);

  const signupsToday = signupsTodayR.count ?? 0;
  const signupsWeek = signupsWeekR.count ?? 0;
  const signupsMonth = signupsMonthR.count ?? 0;

  const [viewsTodayR, viewsYesterdayR, viewsWeekR, viewsLastWeekR, viewsMonthR, viewsLastMonthR, viewsTotalR, viewsLastYearR, sourcesR] = await Promise.all([
    supabaseAdmin.from("page_views").select("*", { count: "exact", head: true }).gte("created_at", startOfToday),
    supabaseAdmin.from("page_views").select("*", { count: "exact", head: true }).gte("created_at", startOfYesterday).lt("created_at", endOfYesterday),
    supabaseAdmin.from("page_views").select("*", { count: "exact", head: true }).gte("created_at", startOfWeek),
    supabaseAdmin.from("page_views").select("*", { count: "exact", head: true }).gte("created_at", startOfLastWeek).lt("created_at", endOfLastWeek),
    supabaseAdmin.from("page_views").select("*", { count: "exact", head: true }).gte("created_at", startOfMonth),
    supabaseAdmin.from("page_views").select("*", { count: "exact", head: true }).gte("created_at", startOfLastMonth).lt("created_at", endOfLastMonth),
    supabaseAdmin.from("page_views").select("*", { count: "exact", head: true }),
    supabaseAdmin.from("page_views").select("*", { count: "exact", head: true }).gte("created_at", startOfLastYear).lt("created_at", endOfLastYear),
    supabaseAdmin.from("page_views").select("referrer, utm_source, utm_medium, utm_campaign").gte("created_at", startOfMonth),
  ]);

  const viewsToday = viewsTodayR.count || 0;
  const viewsYesterday = viewsYesterdayR.count || 0;
  const viewsWeek = viewsWeekR.count || 0;
  const viewsLastWeek = viewsLastWeekR.count || 0;
  const viewsMonth = viewsMonthR.count || 0;
  const viewsLastMonth = viewsLastMonthR.count || 0;
  const viewsTotal = viewsTotalR.count || 0;
  const viewsLastYear = viewsLastYearR.count || 0;

  // Aggregate sources: prefer utm_source when present, fall back to referrer hostname parsing
  const sourceCounts: Record<string, number> = {};
  const campaignCounts: Record<string, number> = {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const row of (sourcesR.data as any[] || [])) {
    let source = "Direct";
    if (row.utm_source) {
      // Normalize UTM source to Title Case for display
      source = row.utm_source.charAt(0).toUpperCase() + row.utm_source.slice(1).toLowerCase();
    } else if (row.referrer) {
      try {
        const url = new URL(row.referrer);
        const host = url.hostname.replace(/^www\./, "");
        if (host.includes("google")) source = "Google";
        else if (host.includes("facebook") || host.includes("fb.com")) source = "Facebook";
        else if (host.includes("instagram")) source = "Instagram";
        else if (host.includes("twitter") || host.includes("x.com")) source = "Twitter/X";
        else if (host.includes("linkedin")) source = "LinkedIn";
        else if (host.includes("tiktok")) source = "TikTok";
        else if (host.includes("reddit")) source = "Reddit";
        else if (host.includes("bing")) source = "Bing";
        else if (host.includes("duckduckgo")) source = "DuckDuckGo";
        else if (host.includes("stackritual.com")) source = "Direct";
        else source = host;
      } catch {
        source = "Other";
      }
    }
    sourceCounts[source] = (sourceCounts[source] || 0) + 1;

    // Also aggregate campaigns when utm_campaign is set
    if (row.utm_campaign) {
      campaignCounts[row.utm_campaign] = (campaignCounts[row.utm_campaign] || 0) + 1;
    }
  }
  const topSources = Object.entries(sourceCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([source, count]) => ({ source, count }));
  const topCampaigns = Object.entries(campaignCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([campaign, count]) => ({ campaign, count }));

  function pctChange(current: number, previous: number) {
    if (previous === 0) return { pct: current > 0 ? 100 : 0, up: current >= 0 };
    const pct = Math.round(((current - previous) / previous) * 100);
    return { pct: Math.abs(pct), up: pct >= 0 };
  }
  const dayChange = pctChange(viewsToday, viewsYesterday);
  const weekChange = pctChange(viewsWeek, viewsLastWeek);
  const monthChange = pctChange(viewsMonth, viewsLastMonth);

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Dashboard</h1>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        <Link href="/admin/users" className="bg-stone-800 border border-stone-700 rounded-xl p-4 hover:border-emerald-500/40 hover:bg-stone-800/70 transition-colors">
          <div className="text-2xl mb-1">👤</div>
          <div className="text-2xl font-bold text-white">{usersR.count ?? 0}</div>
          <div className="text-xs text-stone-400 mt-0.5">Total Users</div>
        </Link>
        <Link href="/admin/supplements" className="bg-stone-800 border border-stone-700 rounded-xl p-4 hover:border-emerald-500/40 hover:bg-stone-800/70 transition-colors">
          <div className="text-2xl mb-1">🧱</div>
          <div className="text-2xl font-bold text-white">{stacksR.count ?? 0}</div>
          <div className="text-xs text-stone-400 mt-0.5">Stack Items</div>
        </Link>
        <Link href="/admin/experiences" className="bg-stone-800 border border-stone-700 rounded-xl p-4 hover:border-emerald-500/40 hover:bg-stone-800/70 transition-colors">
          <div className="text-2xl mb-1">⭐</div>
          <div className="text-2xl font-bold text-white">{expsR.count ?? 0}</div>
          <div className="text-xs text-stone-400 mt-0.5">Experiences</div>
        </Link>
        <Link href="/admin/feedback" className="bg-stone-800 border border-stone-700 rounded-xl p-4 hover:border-emerald-500/40 hover:bg-stone-800/70 transition-colors">
          <div className="text-2xl mb-1">💬</div>
          <div className="text-2xl font-bold text-white">{feedbackR.count ?? 0}</div>
          <div className="text-xs text-stone-400 mt-0.5">Feedback</div>
        </Link>
        <Link href="/admin/supplements?filter=pending" className="bg-stone-800 border border-stone-700 rounded-xl p-4 hover:border-amber-500/40 hover:bg-stone-800/70 transition-colors">
          <div className="text-2xl mb-1">📝</div>
          <div className="text-2xl font-bold text-amber-400">{suppsR.count ?? 0}</div>
          <div className="text-xs text-stone-400 mt-0.5">Pending Subs</div>
        </Link>
        <Link href="/admin/affiliates" className="bg-stone-800 border border-stone-700 rounded-xl p-4 hover:border-emerald-500/40 hover:bg-stone-800/70 transition-colors">
          <div className="text-2xl mb-1">🤝</div>
          <div className="text-2xl font-bold text-white">{affiliatesR.count ?? 0}</div>
          <div className="text-xs text-stone-400 mt-0.5">Affiliates</div>
        </Link>
      </div>

      {/* Recent Sign Ups */}
      <div className="bg-stone-800 rounded-2xl border border-stone-700 p-5 mb-6">
        <h2 className="font-bold text-white mb-4">Recent Sign Ups</h2>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-stone-900 rounded-xl p-4">
            <div className="text-xs text-stone-400 uppercase tracking-wider">Today</div>
            <div className="text-white text-2xl font-bold mt-1">{signupsToday}</div>
            <div className="text-stone-500 text-xs mt-1">new users</div>
          </div>
          <div className="bg-stone-900 rounded-xl p-4">
            <div className="text-xs text-stone-400 uppercase tracking-wider">This Week</div>
            <div className="text-white text-2xl font-bold mt-1">{signupsWeek}</div>
            <div className="text-stone-500 text-xs mt-1">new users</div>
          </div>
          <div className="bg-stone-900 rounded-xl p-4">
            <div className="text-xs text-stone-400 uppercase tracking-wider">This Month</div>
            <div className="text-white text-2xl font-bold mt-1">{signupsMonth}</div>
            <div className="text-stone-500 text-xs mt-1">new users</div>
          </div>
        </div>
      </div>

      {/* Website Traffic */}
      <div className="bg-stone-800 rounded-2xl border border-stone-700 p-5">
        <h2 className="font-bold text-white mb-4">Website Traffic</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          <div className="bg-stone-900 rounded-xl p-4">
            <div className="text-xs text-stone-400 uppercase tracking-wider">Today</div>
            <div className="text-white text-2xl font-bold mt-1">{viewsToday}</div>
            <div className={`text-xs mt-1 ${dayChange.up ? "text-emerald-400" : "text-red-400"}`}>
              {dayChange.up ? "↑" : "↓"} {dayChange.pct}% vs yesterday
            </div>
            <div className="border-t border-stone-700 mt-2 pt-2">
              <div className="text-stone-500 text-[10px] uppercase tracking-wider">Yesterday</div>
              <div className="text-stone-300 text-sm font-semibold">{viewsYesterday}</div>
            </div>
          </div>
          <div className="bg-stone-900 rounded-xl p-4">
            <div className="text-xs text-stone-400 uppercase tracking-wider">This Week</div>
            <div className="text-white text-2xl font-bold mt-1">{viewsWeek}</div>
            <div className={`text-xs mt-1 ${weekChange.up ? "text-emerald-400" : "text-red-400"}`}>
              {weekChange.up ? "↑" : "↓"} {weekChange.pct}% vs last week
            </div>
            <div className="border-t border-stone-700 mt-2 pt-2">
              <div className="text-stone-500 text-[10px] uppercase tracking-wider">Last Week</div>
              <div className="text-stone-300 text-sm font-semibold">{viewsLastWeek}</div>
            </div>
          </div>
          <div className="bg-stone-900 rounded-xl p-4">
            <div className="text-xs text-stone-400 uppercase tracking-wider">This Month</div>
            <div className="text-white text-2xl font-bold mt-1">{viewsMonth}</div>
            <div className={`text-xs mt-1 ${monthChange.up ? "text-emerald-400" : "text-red-400"}`}>
              {monthChange.up ? "↑" : "↓"} {monthChange.pct}% vs last month
            </div>
            <div className="border-t border-stone-700 mt-2 pt-2">
              <div className="text-stone-500 text-[10px] uppercase tracking-wider">Last Month</div>
              <div className="text-stone-300 text-sm font-semibold">{viewsLastMonth}</div>
            </div>
          </div>
          <div className="bg-stone-900 rounded-xl p-4">
            <div className="text-xs text-stone-400 uppercase tracking-wider">All Time</div>
            <div className="text-white text-2xl font-bold mt-1">{viewsTotal}</div>
            <div className="text-stone-500 text-xs mt-1">&nbsp;</div>
            <div className="border-t border-stone-700 mt-2 pt-2">
              <div className="text-stone-500 text-[10px] uppercase tracking-wider">Last Year</div>
              <div className="text-stone-300 text-sm font-semibold">{viewsLastYear}</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {topSources.length > 0 && (
            <div>
              <h3 className="text-xs text-stone-400 uppercase tracking-wider mb-2">Traffic Sources (This Month)</h3>
              <div className="space-y-1.5">
                {topSources.map((s) => {
                  const pct = viewsMonth > 0 ? Math.round((s.count / viewsMonth) * 100) : 0;
                  return (
                    <div key={s.source}>
                      <div className="flex justify-between text-sm mb-0.5">
                        <span className="text-stone-300">{s.source}</span>
                        <span className="text-stone-400">{s.count} ({pct}%)</span>
                      </div>
                      <div className="bg-stone-900 rounded h-1.5 overflow-hidden">
                        <div className="bg-emerald-600 h-full rounded" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {topCampaigns.length > 0 && (
            <div>
              <h3 className="text-xs text-stone-400 uppercase tracking-wider mb-2">Campaigns (This Month)</h3>
              <div className="space-y-1.5">
                {topCampaigns.map((c) => {
                  const pct = viewsMonth > 0 ? Math.round((c.count / viewsMonth) * 100) : 0;
                  return (
                    <div key={c.campaign}>
                      <div className="flex justify-between text-sm mb-0.5">
                        <span className="text-stone-300">{c.campaign}</span>
                        <span className="text-stone-400">{c.count} ({pct}%)</span>
                      </div>
                      <div className="bg-stone-900 rounded h-1.5 overflow-hidden">
                        <div className="bg-amber-500 h-full rounded" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
