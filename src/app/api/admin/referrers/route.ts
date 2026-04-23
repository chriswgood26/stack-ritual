import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

const ADMIN_USER_IDS = process.env.ADMIN_USER_IDS?.split(",") || [];

async function requireAdmin() {
  const { userId } = await auth();
  if (!userId || !ADMIN_USER_IDS.includes(userId)) return null;
  return userId;
}

// Aggregates user_referrals rows per referrer and joins to Clerk for name/email.
// Used by the unified admin affiliate list (Refer tier).
export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin
    .from("user_referrals")
    .select("referrer_user_id, referral_code, status, credit_amount_cents");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const byReferrer = new Map<string, {
    referrer_user_id: string;
    referral_code: string;
    total_shared: number;
    credited: number;
    pending: number;
    expired: number;
    credit_cents: number;
  }>();

  for (const row of (data || []) as {
    referrer_user_id: string;
    referral_code: string;
    status: string;
    credit_amount_cents: number | null;
  }[]) {
    const existing = byReferrer.get(row.referrer_user_id) || {
      referrer_user_id: row.referrer_user_id,
      referral_code: row.referral_code,
      total_shared: 0,
      credited: 0,
      pending: 0,
      expired: 0,
      credit_cents: 0,
    };
    existing.total_shared += 1;
    if (row.status === "credited") existing.credited += 1;
    else if (row.status === "pending") existing.pending += 1;
    else if (row.status === "expired") existing.expired += 1;
    existing.credit_cents += Number(row.credit_amount_cents) || 0;
    // Keep the most recent-looking code (any row works; they all belong to same referrer).
    existing.referral_code = existing.referral_code || row.referral_code;
    byReferrer.set(row.referrer_user_id, existing);
  }

  const aggregates = Array.from(byReferrer.values());

  // Hydrate names/emails from Clerk. One fetch per unique user_id — acceptable
  // for admin surface; if the list grows, batch via getUserList.
  const client = await clerkClient();
  const hydrated = await Promise.all(
    aggregates.map(async (a) => {
      try {
        const user = await client.users.getUser(a.referrer_user_id);
        const email = user.emailAddresses?.[0]?.emailAddress || null;
        const name = [user.firstName, user.lastName].filter(Boolean).join(" ") || email || a.referrer_user_id;
        return { ...a, name, email };
      } catch {
        return { ...a, name: a.referrer_user_id, email: null };
      }
    }),
  );

  hydrated.sort((a, b) => b.credited - a.credited);

  return NextResponse.json({ referrers: hydrated });
}
