import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase";

const TERMS_VERSION = "1.0";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await currentUser();

  if (!user) {
    redirect("/sign-in");
  }

  // Check terms acceptance
  const { data: profile } = await supabaseAdmin
    .from("user_profiles")
    .select("terms_accepted_at, terms_version")
    .eq("user_id", user.id)
    .single();

  const termsAccepted = profile?.terms_accepted_at && profile?.terms_version === TERMS_VERSION;

  if (!termsAccepted) {
    redirect("/terms/accept");
  }

  return <>{children}</>;
}
