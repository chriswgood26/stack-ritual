import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const { token } = await req.json();
  if (!token || typeof token !== "string") {
    return NextResponse.json({ error: "Token required" }, { status: 400 });
  }

  const { data: sub } = await supabaseAdmin
    .from("newsletter_subscribers")
    .select("id")
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

  return NextResponse.json({ message: "unsubscribed" });
}
