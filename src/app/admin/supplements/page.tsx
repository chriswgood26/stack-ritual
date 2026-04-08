import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase";
import AddSupplementButton from "../AddSupplementButton";
import EditSubmissionButton from "../EditSubmissionButton";
import AdminActions from "../AdminActions";
import SupplementSearch from "../SupplementSearch";

const ADMIN_USER_IDS = process.env.ADMIN_USER_IDS?.split(",") || [];

export const dynamic = "force-dynamic";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = any;

export default async function SupplementsPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");
  if (!ADMIN_USER_IDS.includes(user.id)) redirect("/dashboard");

  const { data: pendingSupps } = await supabaseAdmin
    .from("user_submitted_supplements")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(50) as { data: AnyRecord[] | null };

  const { data: allSupplements } = await supabaseAdmin
    .from("supplements")
    .select("id, name, slug, category, icon, tagline, evidence_level, description, benefits, side_effects, timing_recommendation, dose_recommendation")
    .order("name") as { data: AnyRecord[] | null };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white mb-6">Supplements</h1>

      {/* Pending submissions */}
      <div className="bg-stone-800 rounded-2xl border border-stone-700 overflow-hidden">
        <div className="px-5 py-4 border-b border-stone-700 flex items-center justify-between">
          <h2 className="font-bold text-white">Pending Supplement Submissions</h2>
          <span className="text-xs bg-amber-500 text-white px-2 py-0.5 rounded-full font-medium">{pendingSupps?.length ?? 0} pending</span>
        </div>
        {!pendingSupps || pendingSupps.length === 0 ? (
          <div className="px-5 py-8 text-center text-stone-500 text-sm">No pending submissions ✓</div>
        ) : (
          <div className="divide-y divide-stone-700">
            {pendingSupps.map((supp: AnyRecord) => (
              <div key={supp.id} className="px-5 py-4 flex items-start gap-4">
                <div className="text-2xl">{supp.icon || "💊"}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-white">{supp.name}</div>
                  <div className="text-xs text-stone-400 mt-0.5">
                    Category: {supp.category} · Dose: {supp.dose || "—"} · Timing: {supp.timing || "—"}
                  </div>
                  {supp.tagline && <div className="text-xs text-stone-300 mt-1">{supp.tagline}</div>}
                  <div className="text-xs text-stone-500 mt-1">Submitted: {new Date(supp.created_at).toLocaleDateString()}</div>
                </div>
                <div className="flex gap-2">
                  <EditSubmissionButton submission={supp} />
                  <AdminActions itemId={supp.id} table="user_submitted_supplements" type="supplement" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Library */}
      <div className="bg-stone-800 rounded-2xl border border-stone-700 overflow-hidden">
        <div className="px-5 py-4 border-b border-stone-700 flex items-center justify-between">
          <h2 className="font-bold text-white">Supplement Library</h2>
          <div className="flex items-center gap-2">
            <span className="text-xs bg-emerald-800 text-emerald-200 px-2 py-0.5 rounded-full font-medium">{allSupplements?.length ?? 0}</span>
            <AddSupplementButton />
          </div>
        </div>
        <SupplementSearch supplements={allSupplements || []} />
      </div>
    </div>
  );
}
