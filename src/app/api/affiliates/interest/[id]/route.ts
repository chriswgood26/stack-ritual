import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

const ADMIN_USER_IDS = process.env.ADMIN_USER_IDS?.split(",") || [];

async function requireAdmin() {
  const { userId } = await auth();
  if (!userId || !ADMIN_USER_IDS.includes(userId)) return null;
  return userId;
}

function generateCode(name: string) {
  const base = (name || "AFFILIATE").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8) || "AFFILIATE";
  const suffix = Math.floor(Math.random() * 90 + 10); // 10-99
  return `${base}${suffix}`;
}

// PATCH — approve (creates affiliate row) or reject
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const { action } = await req.json();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: interest, error: fetchErr } = await supabaseAdmin
    .from("affiliate_interest")
    .select("*")
    .eq("id", id)
    .single() as { data: any; error: { message: string } | null };

  if (fetchErr || !interest) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (action === "reject") {
    const { error } = await supabaseAdmin.from("affiliate_interest").update({ status: "rejected" }).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (action === "approve") {
    // Try to generate a unique code (3 attempts)
    let code = generateCode(interest.name);
    for (let i = 0; i < 3; i++) {
      const { data: existing } = await supabaseAdmin.from("affiliates").select("id").eq("code", code).maybeSingle();
      if (!existing) break;
      code = generateCode(interest.name);
    }

    const { data: affiliate, error: createErr } = await supabaseAdmin
      .from("affiliates")
      .insert({
        name: interest.name,
        email: interest.email,
        code,
        first_month_percentage: 50,
        recurring_percentage: 10,
        status: "active",
        notes: interest.message || null,
      })
      .select()
      .single();
    if (createErr) return NextResponse.json({ error: createErr.message }, { status: 500 });

    await supabaseAdmin.from("affiliate_interest").update({ status: "approved" }).eq("id", id);
    return NextResponse.json({ ok: true, affiliate });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
