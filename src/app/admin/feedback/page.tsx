import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase";
import FeedbackManager from "@/components/FeedbackManager";

const ADMIN_USER_IDS = process.env.ADMIN_USER_IDS?.split(",") || [];

export const dynamic = "force-dynamic";

export default async function FeedbackPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");
  if (!ADMIN_USER_IDS.includes(user.id)) redirect("/dashboard");

  const { data: feedback } = await supabaseAdmin
    .from("app_feedback")
    .select("id, user_id, rating, message, page, created_at, display_message, display_author, display_role, show_on_landing")
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-2">App Feedback</h1>
      <p className="text-stone-400 text-sm mb-6">
        Edit a testimonial and toggle &ldquo;Add to landing&rdquo; to feature it on the public landing page.
      </p>

      <div className="bg-stone-800 rounded-2xl border border-stone-700 overflow-hidden">
        <FeedbackManager items={feedback || []} />
      </div>
    </div>
  );
}
