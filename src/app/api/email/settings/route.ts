import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { currentUser } from "@clerk/nextjs/server";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data } = await supabaseAdmin
    .from("user_profiles")
    .select("email_reminders_enabled, email_consolidated_summary, email_weekly_summary, email_marketing, email_unsubscribed_all")
    .eq("user_id", userId)
    .single();

  return NextResponse.json({ settings: data });
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as {
    email_reminders_enabled?: boolean;
    email_consolidated_summary?: boolean;
    email_weekly_summary?: boolean;
    email_marketing?: boolean;
    email_unsubscribed_all?: boolean;
  };

  // Read current state so we can detect flips of email_marketing / email_unsubscribed_all
  const { data: prev } = await supabaseAdmin
    .from("user_profiles")
    .select("email_marketing, email_unsubscribed_all")
    .eq("user_id", userId)
    .maybeSingle();

  const update = {
    user_id: userId,
    email_reminders_enabled: !!body.email_reminders_enabled,
    email_consolidated_summary: !!body.email_consolidated_summary,
    email_weekly_summary: !!body.email_weekly_summary,
    email_marketing: !!body.email_marketing,
    email_unsubscribed_all: !!body.email_unsubscribed_all,
  };
  await supabaseAdmin.from("user_profiles").upsert(update, { onConflict: "user_id" });

  // Two-way sync to newsletter_subscribers when relevant flags flip.
  // Match by lowercased Clerk email.
  const newMarketing = update.email_marketing;
  const newUnsubAll = update.email_unsubscribed_all;
  const prevMarketing = prev?.email_marketing ?? null;
  const prevUnsubAll = prev?.email_unsubscribed_all ?? false;

  const marketingFlipped = newMarketing !== prevMarketing;
  const unsubAllJustEnabled = newUnsubAll === true && prevUnsubAll === false;

  if (marketingFlipped || unsubAllJustEnabled) {
    const user = await currentUser();
    const email = user?.emailAddresses?.[0]?.emailAddress?.toLowerCase().trim();
    if (email) {
      const { data: subscriber } = await supabaseAdmin
        .from("newsletter_subscribers")
        .select("id")
        .eq("email", email)
        .maybeSingle();
      if (subscriber) {
        // Decide what state the subscriber row should be in.
        // - email_unsubscribed_all just turned on → unsubscribed_at = now()
        // - email_marketing flipped to false → unsubscribed_at = now()
        // - email_marketing flipped to true (and unsub_all is OFF) → clear unsubscribed_at
        if (unsubAllJustEnabled || (marketingFlipped && newMarketing === false)) {
          await supabaseAdmin
            .from("newsletter_subscribers")
            .update({ unsubscribed_at: new Date().toISOString() })
            .eq("id", subscriber.id);
        } else if (marketingFlipped && newMarketing === true && newUnsubAll === false) {
          await supabaseAdmin
            .from("newsletter_subscribers")
            .update({ unsubscribed_at: null })
            .eq("id", subscriber.id);
        }
      }
    }
  }

  return NextResponse.json({ message: "saved" });
}
