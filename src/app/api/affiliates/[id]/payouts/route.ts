import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

const ADMIN_USER_IDS = process.env.ADMIN_USER_IDS?.split(",") || [];

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId || !ADMIN_USER_IDS.includes(userId)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  if (!body.amount) return NextResponse.json({ error: "Amount required" }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from("affiliate_payouts")
    .insert({
      affiliate_id: id,
      amount: body.amount,
      paid_date: body.paid_date || new Date().toISOString().split("T")[0],
      method: body.method || null,
      reference_number: body.reference_number || null,
      notes: body.notes || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ payout: data });
}
