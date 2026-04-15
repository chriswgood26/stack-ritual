import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

const ADMIN_USER_IDS = process.env.ADMIN_USER_IDS?.split(",") || [];

async function requireAdmin() {
  const { userId } = await auth();
  if (!userId || !ADMIN_USER_IDS.includes(userId)) return null;
  return userId;
}

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: campaigns } = await supabaseAdmin
    .from("campaigns")
    .select("*")
    .order("created_at", { ascending: false });

  const { data: templates } = await supabaseAdmin
    .from("campaign_templates")
    .select("id, campaign_id, sequence_order, name, subject, delay_days")
    .order("sequence_order", { ascending: true });

  const { data: enrollments } = await supabaseAdmin
    .from("campaign_enrollments")
    .select("campaign_id, status");

  const templatesByCampaign: Record<string, typeof templates> = {};
  for (const t of templates || []) {
    (templatesByCampaign[t.campaign_id] ||= []).push(t);
  }
  const enrollCounts: Record<string, { active: number; total: number }> = {};
  for (const e of enrollments || []) {
    const c = (enrollCounts[e.campaign_id] ||= { active: 0, total: 0 });
    c.total += 1;
    if (e.status === "active") c.active += 1;
  }

  return NextResponse.json({
    campaigns: (campaigns || []).map(c => ({
      ...c,
      templates: templatesByCampaign[c.id] || [],
      enrollmentCounts: enrollCounts[c.id] || { active: 0, total: 0 },
    })),
  });
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { name, type } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "Name required" }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from("campaigns")
    .insert({ name: name.trim(), type: type === "newsletter" ? "newsletter" : "drip" })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ campaign: data }, { status: 201 });
}
