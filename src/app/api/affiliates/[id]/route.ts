import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

const ADMIN_USER_IDS = process.env.ADMIN_USER_IDS?.split(",") || [];

async function checkAdmin() {
  const { userId } = await auth();
  if (!userId) return false;
  return ADMIN_USER_IDS.includes(userId);
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await checkAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const [affiliateR, payoutsR, referralsR, commissionsR] = await Promise.all([
    supabaseAdmin.from("affiliates").select("*").eq("id", id).single(),
    supabaseAdmin.from("affiliate_payouts").select("*").eq("affiliate_id", id).order("paid_date", { ascending: false }),
    supabaseAdmin.from("affiliate_referrals").select("*").eq("affiliate_id", id).order("created_at", { ascending: false }),
    supabaseAdmin.from("affiliate_commissions").select("*").eq("affiliate_id", id).order("occurred_at", { ascending: false }),
  ]);

  if (affiliateR.error || !affiliateR.data) {
    return NextResponse.json({ error: "Affiliate not found" }, { status: 404 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const payouts = (payoutsR.data as any[]) || [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const commissions = (commissionsR.data as any[]) || [];
  const totalPaid = payouts.reduce((sum, p) => sum + Number(p.amount), 0);
  const earnedCents = commissions.reduce((sum, c) => sum + Number(c.commission_cents), 0);
  const owedCents = Math.max(0, earnedCents - Math.round(totalPaid * 100));

  return NextResponse.json({
    affiliate: {
      ...affiliateR.data,
      total_paid: totalPaid,
      referral_count: referralsR.data?.length ?? 0,
      earned_cents: earnedCents,
      owed_cents: owedCents,
    },
    payouts,
    referrals: referralsR.data || [],
    commissions,
  });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await checkAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await req.json();

  const { data, error } = await supabaseAdmin
    .from("affiliates")
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    if (error.code === "23505") return NextResponse.json({ error: "Affiliate code already exists" }, { status: 400 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ affiliate: data });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await checkAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const { error } = await supabaseAdmin.from("affiliates").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
