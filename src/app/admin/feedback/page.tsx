import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase";

const ADMIN_USER_IDS = process.env.ADMIN_USER_IDS?.split(",") || [];

export const dynamic = "force-dynamic";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = any;

export default async function FeedbackPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");
  if (!ADMIN_USER_IDS.includes(user.id)) redirect("/dashboard");

  const { data: feedback } = await supabaseAdmin
    .from("app_feedback")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100) as { data: AnyRecord[] | null };

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">App Feedback</h1>

      <div className="bg-stone-800 rounded-2xl border border-stone-700 overflow-hidden">
        {!feedback || feedback.length === 0 ? (
          <div className="px-5 py-8 text-center text-stone-500 text-sm">No feedback yet</div>
        ) : (
          <div className="divide-y divide-stone-700">
            {feedback.map((fb: AnyRecord) => (
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
      </div>
    </div>
  );
}
