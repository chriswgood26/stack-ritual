import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

const ADMIN_USER_IDS = process.env.ADMIN_USER_IDS?.split(",") || [];

async function requireAdmin() {
  const { userId } = await auth();
  if (!userId || !ADMIN_USER_IDS.includes(userId)) return null;
  return userId;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const [campaignR, templatesR, enrollmentsR] = await Promise.all([
    supabaseAdmin.from("campaigns").select("*").eq("id", id).maybeSingle(),
    supabaseAdmin.from("campaign_templates").select("*").eq("campaign_id", id).order("sequence_order"),
    supabaseAdmin
      .from("campaign_enrollments")
      .select("id, status, enrolled_at, subscriber:subscriber_id(id, email, unsubscribed_at)")
      .eq("campaign_id", id)
      .order("enrolled_at", { ascending: false }),
  ]);

  if (!campaignR.data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({
    campaign: campaignR.data,
    templates: templatesR.data || [],
    enrollments: enrollmentsR.data || [],
  });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await req.json();
  const update: Record<string, unknown> = {};
  if (typeof body.name === "string") update.name = body.name.trim();
  if (typeof body.is_active === "boolean") update.is_active = body.is_active;
  if (typeof body.sender_email === "string") update.sender_email = body.sender_email.trim();
  if (typeof body.sender_name === "string") update.sender_name = body.sender_name.trim();

  const { error } = await supabaseAdmin.from("campaigns").update(update).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ message: "updated" });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const { error } = await supabaseAdmin.from("campaigns").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ message: "deleted" });
}
