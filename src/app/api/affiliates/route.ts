import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

const ADMIN_USER_IDS = process.env.ADMIN_USER_IDS?.split(",") || [];

async function checkAdmin() {
  const { userId } = await auth();
  if (!userId) return false;
  return ADMIN_USER_IDS.includes(userId);
}

export async function GET() {
  if (!(await checkAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [affiliatesR, payoutsR, referralsR] = await Promise.all([
    supabaseAdmin.from("affiliates").select("*").order("created_at", { ascending: false }),
    supabaseAdmin.from("affiliate_payouts").select("affiliate_id, amount"),
    supabaseAdmin.from("affiliate_referrals").select("affiliate_id"),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const affiliates = (affiliatesR.data as any[]) || [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const payouts = (payoutsR.data as any[]) || [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const referrals = (referralsR.data as any[]) || [];

  const enriched = affiliates.map((a) => {
    const affPayouts = payouts.filter((p) => p.affiliate_id === a.id);
    const totalPaid = affPayouts.reduce((sum, p) => sum + Number(p.amount), 0);
    const referralCount = referrals.filter((r) => r.affiliate_id === a.id).length;
    return { ...a, total_paid: totalPaid, referral_count: referralCount };
  });

  return NextResponse.json({ affiliates: enriched });
}

export async function POST(req: NextRequest) {
  if (!(await checkAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  if (!body.name || !body.code) {
    return NextResponse.json({ error: "Name and code are required" }, { status: 400 });
  }

  const insert: Record<string, unknown> = {
    name: body.name,
    code: body.code,
    first_month_percentage: body.first_month_percentage ?? 50,
    recurring_percentage: body.recurring_percentage ?? 10,
    status: body.status || "active",
  };
  for (const field of ["email", "phone", "street", "city", "state", "zip", "country", "payout_method", "payout_details", "notes"]) {
    if (body[field] !== undefined) insert[field] = body[field] || null;
  }

  const { data, error } = await supabaseAdmin.from("affiliates").insert(insert).select().single();
  if (error) {
    if (error.code === "23505") return NextResponse.json({ error: "Affiliate code already exists" }, { status: 400 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ affiliate: data });
}
