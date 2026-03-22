import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase";
import ShareExperienceButton from "@/components/ShareExperienceButton";

export const dynamic = "force-dynamic";

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <span key={i} className={i <= rating ? "text-amber-400" : "text-stone-200"}>★</span>
      ))}
    </div>
  );
}

function DurationBadge({ weeks }: { weeks: number | null }) {
  if (!weeks) return null;
  const label = weeks < 4 ? `${weeks}w` : weeks < 52 ? `${Math.round(weeks / 4)}mo` : `${Math.round(weeks / 52)}yr`;
  return <span className="text-xs bg-stone-100 text-stone-500 px-2 py-0.5 rounded-full">{label}</span>;
}

export default async function ExperiencesPage() {
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
  const suppStats: Record<string, { count: number; avg: number; name: string; icon: string }> = {};
  experiences?.forEach(e => {
    if (e.supplement) {
      const key = e.supplement_id;
      if (!suppStats[key]) suppStats[key] = { count: 0, avg: 0, name: e.supplement.name, icon: e.supplement.icon };
      suppStats[key].count++;
      suppStats[key].avg = ((suppStats[key].avg * (suppStats[key].count - 1)) + e.rating) / suppStats[key].count;
    }
  });

  const topSupps = Object.entries(suppStats)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 5);

  return (
    <div className="min-h-screen bg-stone-50 font-sans pb-24">

      {/* Top Nav */}
      <nav className="bg-white border-b border-stone-200 px-4 py-3.5 flex items-center justify-between sticky top-0 z-10">
        <span className="font-bold text-stone-900 tracking-tight">Experiences</span>
        <ShareExperienceButton supplements={supplements || []} />
      </nav>

      <div className="max-w-lg mx-auto px-4 py-5 space-y-6">

        {/* Top rated supplements */}
        {topSupps.length > 0 && (
          <div>
            <h2 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-3">Most discussed</h2>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {topSupps.map(([id, stats]) => (
                <Link key={id} href={`/dashboard/search/${Object.values(supplements || []).find((s: { id: string }) => s.id === id)?.slug || id}`}
                  className="bg-white border border-stone-100 rounded-2xl px-4 py-3 flex-shrink-0 shadow-sm hover:border-emerald-300 transition-colors text-center min-w-[90px]">
                  <div className="text-2xl mb-1">{stats.icon}</div>
                  <div className="text-xs font-semibold text-stone-900 leading-tight">{stats.name.split(" ")[0]}</div>
                  <div className="text-xs text-amber-500 mt-0.5">{'★'.repeat(Math.round(stats.avg))}</div>
                  <div className="text-xs text-stone-400">{stats.count} reviews</div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Experience feed */}
        <div>
          <h2 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-3">
            Recent experiences ({experiences?.length ?? 0})
          </h2>

          {experiences?.length === 0 && (
            <div className="bg-white rounded-2xl border border-stone-100 p-8 text-center">
              <div className="text-4xl mb-3">💬</div>
              <p className="font-semibold text-stone-900 mb-1">No experiences yet</p>
              <p className="text-stone-500 text-sm">Be the first to share how a supplement is working for you!</p>
            </div>
          )}

          <div className="space-y-3">
            {experiences?.map(exp => (
              <div key={exp.id} className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center text-base flex-shrink-0">
                      {exp.supplement?.icon || "💊"}
                    </div>
                    <div>
                      <div className="font-semibold text-stone-900 text-sm">
                        {exp.supplement?.name || exp.custom_supplement_name}
                      </div>
                      <StarRating rating={exp.rating} />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <DurationBadge weeks={exp.duration_weeks} />
                    <span className="text-xs text-stone-400">
                      {new Date(exp.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                  </div>
                </div>

                {/* Title */}
                {exp.title && (
                  <p className="font-semibold text-stone-900 text-sm mb-1">{exp.title}</p>
                )}

                {/* Body */}
                <p className="text-stone-700 text-sm leading-relaxed">{exp.body}</p>

                {/* Footer */}
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-stone-50">
                  <button className="text-xs text-stone-400 hover:text-stone-600 transition-colors flex items-center gap-1">
                    👍 Helpful ({exp.helpful_count})
                  </button>
                  {exp.supplement?.slug && (
                    <Link href={`/dashboard/search/${exp.supplement.slug}`}
                      className="text-xs text-emerald-600 font-medium hover:text-emerald-700 transition-colors">
                      View supplement →
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

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
        <Link href="/dashboard/experiences" className="flex flex-col items-center gap-0.5 text-emerald-700">
          <span className="text-xl">💬</span>
          <span className="text-xs font-medium">Experiences</span>
        </Link>
        <Link href="/dashboard/profile" className="flex flex-col items-center gap-0.5 text-stone-400">
          <span className="text-xl">👤</span>
          <span className="text-xs">Profile</span>
        </Link>
      </div>

    </div>
  );
}
