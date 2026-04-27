import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { clerkClient } from "@clerk/nextjs/server";

const ADMIN_USER_IDS = process.env.ADMIN_USER_IDS?.split(",") || [];

// One-off backfill. For every user_profiles row with email_marketing=true,
// look up the user's email in Clerk, find a matching newsletter_subscribers
// row, and if that subscriber is unsubscribed, flip the profile to match.
// Run once after deploy. Delete this file after running.
export async function POST() {
  const { userId } = await auth();
  if (!userId || !ADMIN_USER_IDS.includes(userId)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { data: profiles } = await supabaseAdmin
    .from("user_profiles")
    .select("user_id")
    .eq("email_marketing", true);

  if (!profiles || profiles.length === 0) {
    return NextResponse.json({ checked: 0, flipped: 0 });
  }

  const client = await clerkClient();
  let checked = 0;
  let flipped = 0;
  let errors = 0;

  for (const p of profiles) {
    checked++;
    try {
      const user = await client.users.getUser(p.user_id);
      const email = user.emailAddresses?.[0]?.emailAddress?.toLowerCase().trim();
      if (!email) continue;
      const { data: sub } = await supabaseAdmin
        .from("newsletter_subscribers")
        .select("unsubscribed_at")
        .eq("email", email)
        .maybeSingle();
      if (sub?.unsubscribed_at) {
        await supabaseAdmin
          .from("user_profiles")
          .update({ email_marketing: false })
          .eq("user_id", p.user_id);
        flipped++;
      }
    } catch (e) {
      errors++;
      console.error("[backfill-email-marketing] error for", p.user_id, e);
    }
  }

  return NextResponse.json({ checked, flipped, errors });
}
