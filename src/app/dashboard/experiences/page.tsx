import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase";
import ShareExperienceButton from "@/components/ShareExperienceButton";
import BottomNav from "@/components/BottomNav";
import TopNav from "@/components/TopNav";
import ExperiencesFeed from "@/components/ExperiencesFeed";
import { currentUser } from "@clerk/nextjs/server";

export const dynamic = "force-dynamic";

export default async function ExperiencesPage() {
  const user = await currentUser();

  const { data: experiences } = await supabaseAdmin
    .from("experiences")
    .select("*, supplement:supplement_id(name, slug, icon)")
    .order("created_at", { ascending: false })
    .limit(50);

  const { data: supplements } = await supabaseAdmin
    .from("supplements")
    .select("id, name, icon, slug")
    .order("name");

  // Aggregate stats per supplement
  const suppStats: Record<string, { count: number; avg: number; name: string; icon: string; slug: string }> = {};
  (experiences || []).forEach(e => {
    const supp = Array.isArray(e.supplement) ? e.supplement[0] : e.supplement;
    if (supp) {
      const key = e.supplement_id;
      if (!suppStats[key]) suppStats[key] = { count: 0, avg: 0, name: supp.name, icon: supp.icon, slug: supp.slug };
      suppStats[key].count++;
      suppStats[key].avg = ((suppStats[key].avg * (suppStats[key].count - 1)) + e.rating) / suppStats[key].count;
    }
  });

  const topSupps = Object.entries(suppStats)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 5);

  return (
    <div className="min-h-screen bg-stone-50 font-sans pb-24">
      <TopNav />

      <div className="max-w-lg mx-auto px-4 py-5 space-y-6">

        {/* Most discussed */}
        {topSupps.length > 0 && (
          <div>
            <h2 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-3">Most discussed</h2>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {topSupps.map(([id, stats]) => (
                <Link key={id} href={`/dashboard/search/${stats.slug}`}
                  className="bg-white border border-stone-100 rounded-2xl px-4 py-3 flex-shrink-0 shadow-sm hover:border-emerald-300 transition-colors text-center min-w-[90px]">
                  <div className="text-2xl mb-1">{stats.icon}</div>
                  <div className="text-xs font-semibold text-stone-900 leading-tight">{stats.name.split(" ")[0]}</div>
                  <div className="text-xs text-amber-500 mt-0.5">{"★".repeat(Math.round(stats.avg))}</div>
                  <div className="text-xs text-stone-400">{stats.count} reviews</div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Feed with My/All filter */}
        <ExperiencesFeed
          experiences={experiences || []}
          currentUserId={user?.id}
          supplements={supplements || []}
        />

      </div>
      <BottomNav />
    </div>
  );
}
