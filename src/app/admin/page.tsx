import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase";
import Link from "next/link";
import AdminActions from "./AdminActions";
import UserManager from "./UserManager";
import EditSubmissionButton from "./EditSubmissionButton";
import EditSupplementButton from "./EditSupplementButton";
import AddSupplementButton from "./AddSupplementButton";
import SupplementSearch from "./SupplementSearch";

export const dynamic = "force-dynamic";

const ADMIN_USER_IDS = ["user_3BGCbiChIFduGWHj5gzAmUxoK51"];

export default async function AdminPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");
  if (!ADMIN_USER_IDS.includes(user.id)) redirect("/dashboard");

  // Fetch pending supplement submissions
  const { data: pendingSupps } = await supabaseAdmin
    .from("user_submitted_supplements")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(50);

  const { data: experiences } = await supabaseAdmin
    .from("experiences")
    .select("*, supplement:supplement_id(name, icon)")
    .order("created_at", { ascending: false })
    .limit(20);

  const { data: feedback } = await supabaseAdmin
    .from("app_feedback")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(20);

  const { data: allSupplements } = await supabaseAdmin
    .from("supplements")
    .select("id, name, slug, category, icon, tagline, evidence_level, description, benefits, side_effects, timing_recommendation, dose_recommendation")
    .order("name");

  const { count: totalUsers } = await supabaseAdmin
    .from("user_profiles")
    .select("*", { count: "exact", head: true });

  const { count: totalStacks } = await supabaseAdmin
    .from("user_stacks")
    .select("*", { count: "exact", head: true })
    .eq("is_active", true);

  const { count: totalExperiences } = await supabaseAdmin
    .from("experiences")
    .select("*", { count: "exact", head: true });

  const { count: totalFeedback } = await supabaseAdmin
    .from("app_feedback")
    .select("*", { count: "exact", head: true });

  return (
    <div className="min-h-screen bg-stone-900 text-white font-sans">
      {/* Admin nav */}
      <nav className="bg-stone-800 border-b border-stone-700 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xl">🌿</span>
          <span className="font-bold text-white">Stack Ritual Admin</span>
          <span className="text-xs bg-emerald-700 text-emerald-100 px-2 py-0.5 rounded-full">Private</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/admin/releases" className="text-stone-400 hover:text-white text-sm transition-colors">📋 Release Notes</Link>
          <Link href="/dashboard" className="text-stone-400 hover:text-white text-sm transition-colors">← Back to app</Link>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: "Total Users", value: totalUsers ?? 0, icon: "👤", href: "#users" },
            { label: "Stack Items", value: totalStacks ?? 0, icon: "🧱", note: "Supplement rows across all users", href: "#users" },
            { label: "Experiences", value: totalExperiences ?? 0, icon: "⭐", href: "#experiences" },
            { label: "Feedback", value: totalFeedback ?? 0, icon: "💬", href: "#feedback" },
          ].map(s => (
            <a key={s.label} href={s.href} className="bg-stone-800 rounded-xl p-4 border border-stone-700 hover:border-emerald-600 transition-colors block">
              <div className="text-2xl mb-1">{s.icon}</div>
              <div className="text-2xl font-bold text-white">{s.value}</div>
              <div className="text-xs text-stone-400 mt-0.5">{s.label}</div>
              {'note' in s && s.note && <div className="text-xs text-stone-500 mt-0.5 leading-tight">{s.note}</div>}
            </a>
          ))}
        </div>

        {/* App feedback */}
        <div id="feedback" />
        <details className="bg-stone-800 rounded-2xl border border-stone-700">
          <summary className="px-5 py-4 border-b border-stone-700 cursor-pointer flex items-center justify-between list-none">
            <h2 className="font-bold text-white">App Feedback ({totalFeedback ?? 0})</h2>
            <span className="text-stone-400 text-sm select-none">▼</span>
          </summary>
          {!feedback || feedback.length === 0 ? (
            <div className="px-5 py-8 text-center text-stone-500 text-sm">No feedback yet</div>
          ) : (
            <div className="divide-y divide-stone-700 max-h-96 overflow-y-auto">
              {feedback.map(fb => (
                <div key={fb.id} className="px-5 py-4">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-amber-400">{"★".repeat(fb.rating || 0)}</span>
                    <span className="text-xs text-stone-500">{new Date(fb.created_at).toLocaleDateString()}</span>
                  </div>
                  <p className="text-sm text-stone-300">{fb.message}</p>
                </div>
              ))}
            </div>
          )}
        </details>

        {/* Pending supplement submissions */}
        <div className="bg-stone-800 rounded-2xl border border-stone-700 overflow-hidden">
          <div className="px-5 py-4 border-b border-stone-700 flex items-center justify-between">
            <h2 className="font-bold text-white">Pending Supplement Submissions</h2>
            <span className="text-xs bg-amber-500 text-white px-2 py-0.5 rounded-full font-medium">{pendingSupps?.length ?? 0} pending</span>
          </div>
          {!pendingSupps || pendingSupps.length === 0 ? (
            <div className="px-5 py-8 text-center text-stone-500 text-sm">No pending submissions ✓</div>
          ) : (
            <div className="divide-y divide-stone-700">
              {pendingSupps.map(supp => (
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

        {/* Recent experiences */}
        <div id="experiences" />
        <details className="bg-stone-800 rounded-2xl border border-stone-700">
          <summary className="px-5 py-4 border-b border-stone-700 cursor-pointer flex items-center justify-between list-none">
            <h2 className="font-bold text-white">Recent Experiences ({experiences?.length ?? 0})</h2>
            <span className="text-stone-400 text-sm select-none">▼</span>
          </summary>
          {!experiences || experiences.length === 0 ? (
            <div className="px-5 py-8 text-center text-stone-500 text-sm">No experiences yet</div>
          ) : (
            <div className="divide-y divide-stone-700">
              {experiences.map(exp => {
                const supp = Array.isArray(exp.supplement) ? exp.supplement[0] : exp.supplement;
                return (
                  <div key={exp.id} className="px-5 py-4 flex items-start gap-4">
                    <div className="text-xl">{supp?.icon || "💊"}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white text-sm">{supp?.name || "Custom"}</span>
                        <span className="text-amber-400">{"★".repeat(exp.rating)}</span>
                      </div>
                      {exp.title && <div className="text-xs font-medium text-stone-300 mt-0.5">{exp.title}</div>}
                      <div className="text-xs text-stone-400 mt-1 line-clamp-2">{exp.body}</div>
                      <div className="text-xs text-stone-500 mt-1">{new Date(exp.created_at).toLocaleDateString()}</div>
                    </div>
                    <AdminActions itemId={exp.id} table="experiences" type="experience" />
                  </div>
                );
              })}
            </div>
          )}
        </details>

        {/* Supplement Library */}
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

        {/* User Management */}
        <div id="users" />
        <UserManager />

      </div>
    </div>
  );
}
