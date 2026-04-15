import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

const ADMIN_USER_IDS = process.env.ADMIN_USER_IDS?.split(",") || [];

async function requireAdmin() {
  const { userId } = await auth();
  if (!userId || !ADMIN_USER_IDS.includes(userId)) return null;
  return userId;
}

// POST { subscriber_id? , email?, bulk?: true, status? }
// - subscriber_id: enroll one subscriber
// - email: look up by email then enroll
// - bulk: enroll all active subscribers not yet enrolled in this campaign
// - status (with enrollment id in body.enrollment_id): update status
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: campaignId } = await params;
  const body = await req.json();

  // Status update path
  if (body.enrollment_id && body.status) {
    const { error } = await supabaseAdmin
      .from("campaign_enrollments")
      .update({ status: body.status })
      .eq("id", body.enrollment_id)
      .eq("campaign_id", campaignId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ message: "updated" });
  }

  // Bulk enroll all active subscribers
  if (body.bulk) {
    const { data: subs } = await supabaseAdmin
      .from("newsletter_subscribers")
      .select("id")
      .is("unsubscribed_at", null);
    const { data: existing } = await supabaseAdmin
      .from("campaign_enrollments")
      .select("subscriber_id")
      .eq("campaign_id", campaignId);
    const existingIds = new Set((existing || []).map(e => e.subscriber_id));
    const toInsert = (subs || [])
      .filter(s => !existingIds.has(s.id))
      .map(s => ({ campaign_id: campaignId, subscriber_id: s.id, status: "active" }));
    if (toInsert.length === 0) return NextResponse.json({ message: "none to enroll", added: 0 });

    const { error } = await supabaseAdmin.from("campaign_enrollments").insert(toInsert);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ message: "bulk enrolled", added: toInsert.length });
  }

  // Single enroll
  let subscriberId: string | null = body.subscriber_id || null;
  if (!subscriberId && body.email) {
    const { data } = await supabaseAdmin
      .from("newsletter_subscribers")
      .select("id")
      .eq("email", body.email.trim().toLowerCase())
      .maybeSingle();
    subscriberId = data?.id || null;
  }
  if (!subscriberId) return NextResponse.json({ error: "Subscriber not found" }, { status: 404 });

  const { error } = await supabaseAdmin
    .from("campaign_enrollments")
    .upsert(
      { campaign_id: campaignId, subscriber_id: subscriberId, status: "active" },
      { onConflict: "subscriber_id,campaign_id" },
    );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ message: "enrolled" });
}
