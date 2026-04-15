import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

const ADMIN_USER_IDS = process.env.ADMIN_USER_IDS?.split(",") || [];

async function requireAdmin() {
  const { userId } = await auth();
  if (!userId || !ADMIN_USER_IDS.includes(userId)) return null;
  return userId;
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string; templateId: string }> }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { templateId } = await params;
  const body = await req.json();

  const update: Record<string, unknown> = {};
  if (typeof body.name === "string") update.name = body.name.trim();
  if (typeof body.subject === "string") update.subject = body.subject.trim();
  if (typeof body.body_html === "string") update.body_html = body.body_html;
  if (body.delay_days !== undefined) update.delay_days = Number(body.delay_days) || 0;
  if (body.sequence_order !== undefined) update.sequence_order = Number(body.sequence_order) || 1;

  const { error } = await supabaseAdmin.from("campaign_templates").update(update).eq("id", templateId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ message: "updated" });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; templateId: string }> }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { templateId } = await params;
  const { error } = await supabaseAdmin.from("campaign_templates").delete().eq("id", templateId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ message: "deleted" });
}
