import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { clerkClient } from "@clerk/nextjs/server";

export async function POST(req: NextRequest) {
  const { token } = await req.json();
  if (!token || typeof token !== "string") {
    return NextResponse.json({ error: "Token required" }, { status: 400 });
  }

  const { data: sub } = await supabaseAdmin
    .from("newsletter_subscribers")
    .select("id, email")
    .eq("unsubscribe_token", token)
    .maybeSingle();

  if (!sub) return NextResponse.json({ error: "Invalid token" }, { status: 404 });

  await supabaseAdmin
    .from("newsletter_subscribers")
    .update({ unsubscribed_at: new Date().toISOString() })
    .eq("id", sub.id);

  // Mark any active enrollments as stopped
  await supabaseAdmin
    .from("campaign_enrollments")
    .update({ status: "stopped" })
    .eq("subscriber_id", sub.id)
    .eq("status", "active");

  // Reverse sync: if a matching SR user exists, flip their email_marketing
  // toggle to false so the in-app UI reflects the unsubscribe.
  try {
    const subEmail = sub.email?.toLowerCase().trim();
    if (subEmail) {
      const client = await clerkClient();
      const userList = await client.users.getUserList({ emailAddress: [subEmail], limit: 1 });
      const userData = userList.data ?? userList;
      const matchedUserId = (Array.isArray(userData) ? userData[0]?.id : undefined) as string | undefined;
      if (matchedUserId) {
        await supabaseAdmin
          .from("user_profiles")
          .update({ email_marketing: false })
          .eq("user_id", matchedUserId);
      }
    }
  } catch (e) {
    console.warn("[newsletter/unsubscribe] reverse sync failed", e);
  }

  return NextResponse.json({ message: "unsubscribed" });
}
