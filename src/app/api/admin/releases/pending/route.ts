import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

const ADMIN_USER_IDS = process.env.ADMIN_USER_IDS?.split(",") || [];

async function requireAdmin() {
  const { userId } = await auth();
  if (!userId || !ADMIN_USER_IDS.includes(userId)) return null;
  return userId;
}

// Returns done roadmap items not yet stamped with a release, plus a suggested next version.
export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: items, error } = await supabaseAdmin
    .from("roadmap_items")
    .select("id, title, description")
    .eq("status", "done")
    .is("release_version", null)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Suggest next version by reading latest released_at row
  const { data: latest } = await supabaseAdmin
    .from("releases")
    .select("version")
    .order("released_at", { ascending: false })
    .limit(1);

  let suggested = "v1.4";
  const last = latest?.[0]?.version;
  if (last) {
    const m = last.match(/^v(\d+)\.(\d+)$/);
    if (m) suggested = `v${m[1]}.${parseInt(m[2], 10) + 1}`;
  }

  return NextResponse.json({ items: items || [], suggestedVersion: suggested });
}
