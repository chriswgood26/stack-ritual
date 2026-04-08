import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase";
import AdminActions from "../AdminActions";

const ADMIN_USER_IDS = process.env.ADMIN_USER_IDS?.split(",") || [];

export const dynamic = "force-dynamic";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = any;

export default async function ExperiencesPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");
  if (!ADMIN_USER_IDS.includes(user.id)) redirect("/dashboard");

  const { data: experiences } = await supabaseAdmin
    .from("experiences")
    .select("*, supplement:supplement_id(name, icon)")
    .order("created_at", { ascending: false })
    .limit(50) as { data: AnyRecord[] | null };

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Experiences</h1>

      <div className="bg-stone-800 rounded-2xl border border-stone-700 overflow-hidden">
        {!experiences || experiences.length === 0 ? (
          <div className="px-5 py-8 text-center text-stone-500 text-sm">No experiences yet</div>
        ) : (
          <div className="divide-y divide-stone-700">
            {experiences.map((exp: AnyRecord) => {
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
                    <div className="text-xs text-stone-400 mt-1 line-clamp-3">{exp.body}</div>
                    <div className="text-xs text-stone-500 mt-1">{new Date(exp.created_at).toLocaleDateString()}</div>
                  </div>
                  <AdminActions itemId={exp.id} table="experiences" type="experience" />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
