import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

const ADMIN_USER_IDS = process.env.ADMIN_USER_IDS?.split(",") || [];

async function requireAdmin() {
  const { userId } = await auth();
  if (!userId || !ADMIN_USER_IDS.includes(userId)) return null;
  return userId;
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: campaignId } = await params;
  const { name, subject, body_html, delay_days } = await req.json();

  if (!name?.trim() || !subject?.trim() || !body_html?.trim()) {
    return NextResponse.json({ error: "Name, subject, and body required" }, { status: 400 });
  }

  // Auto-increment sequence_order
  const { data: last } = await supabaseAdmin
    .from("campaign_templates")
    .select("sequence_order")
    .eq("campaign_id", campaignId)
    .order("sequence_order", { ascending: false })
    .limit(1);
  const nextOrder = ((last?.[0]?.sequence_order as number | undefined) || 0) + 1;

  const { data, error } = await supabaseAdmin
    .from("campaign_templates")
    .insert({
      campaign_id: campaignId,
      sequence_order: nextOrder,
      name: name.trim(),
      subject: subject.trim(),
      body_html,
      delay_days: Number(delay_days) || 0,
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ template: data }, { status: 201 });
}
