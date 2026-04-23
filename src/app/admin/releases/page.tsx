import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import CutReleaseButton from "@/components/CutReleaseButton";
import { supabaseAdmin } from "@/lib/supabase";

const ADMIN_USER_IDS = process.env.ADMIN_USER_IDS?.split(",") || [];

export const dynamic = "force-dynamic";

interface ReleaseRow {
  version: string;
  released_at: string;
  label: string | null;
  label_color: string | null;
}
interface FeatureRow {
  release_version: string;
  feature: string;
  sort_order: number;
}

export default async function ReleasesPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");
  if (!ADMIN_USER_IDS.includes(user.id)) redirect("/dashboard");

  const [releasesR, featuresR] = await Promise.all([
    supabaseAdmin
      .from("releases")
      .select("version, released_at, label, label_color")
      .order("released_at", { ascending: false })
      .order("version", { ascending: false }),
    supabaseAdmin
      .from("release_features")
      .select("release_version, feature, sort_order")
      .order("sort_order", { ascending: true }),
  ]);

  const releases: ReleaseRow[] = releasesR.data || [];
  const features: FeatureRow[] = featuresR.data || [];
  const featuresByVersion = new Map<string, string[]>();
  for (const f of features) {
    if (!featuresByVersion.has(f.release_version)) featuresByVersion.set(f.release_version, []);
    featuresByVersion.get(f.release_version)!.push(f.feature);
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Releases</h1>

      <div className="max-w-3xl space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-stone-300">Release Notes</h2>
          <CutReleaseButton />
        </div>

        {releases.length === 0 && (
          <div className="bg-stone-800 border border-stone-700 rounded-2xl px-6 py-8 text-center text-stone-500 text-sm">
            No releases yet. Click &ldquo;Cut Release&rdquo; to publish one.
          </div>
        )}

        {releases.map(release => {
          const feats = featuresByVersion.get(release.version) || [];
          return (
            <div key={release.version} className="bg-stone-800 rounded-2xl border border-stone-700 overflow-hidden">
              <div className="px-6 py-4 border-b border-stone-700 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-white text-xl">{release.version}</span>
                  {release.label && (
                    <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${release.label_color || "bg-stone-200 text-stone-700"}`}>
                      {release.label}
                    </span>
                  )}
                </div>
                <span className="text-stone-500 text-sm">{release.released_at}</span>
              </div>
              <ul className="px-6 py-4 space-y-2">
                {feats.length === 0 ? (
                  <li className="text-stone-500 text-sm italic">No features recorded for this release.</li>
                ) : (
                  feats.map((f, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-stone-300">
                      <span className="text-emerald-500 mt-0.5 flex-shrink-0">✓</span>
                      {f}
                    </li>
                  ))
                )}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
