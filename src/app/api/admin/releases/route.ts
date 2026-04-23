import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

const ADMIN_USER_IDS = process.env.ADMIN_USER_IDS?.split(",") || [];

async function requireAdmin() {
  const { userId } = await auth();
  if (!userId || !ADMIN_USER_IDS.includes(userId)) return null;
  return userId;
}

// POST cuts a new release. Body: { version, released_at, label?, label_color?, item_ids[] }
// Creates a row in `releases`, copies the selected roadmap items' titles into
// `release_features`, and stamps each item with release_version + released_at.
export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  const version: string = (body.version || "").trim();
  const releasedAt: string = (body.released_at || "").trim();
  const label: string | null = body.label?.trim() || null;
  const labelColor: string | null = body.label_color?.trim() || null;
  const itemIds: string[] = Array.isArray(body.item_ids) ? body.item_ids : [];

  if (!version) return NextResponse.json({ error: "Version required" }, { status: 400 });
  if (!releasedAt) return NextResponse.json({ error: "Date required" }, { status: 400 });
  if (itemIds.length === 0) return NextResponse.json({ error: "Select at least one item" }, { status: 400 });

  // Insert release row
  const { error: relErr } = await supabaseAdmin.from("releases").insert({
    version,
    released_at: releasedAt,
    label,
    label_color: labelColor,
  });
  if (relErr) return NextResponse.json({ error: relErr.message }, { status: 500 });

  // "Latest" is exclusive — demote any prior release that still holds the label
  if (label === "Latest") {
    await supabaseAdmin
      .from("releases")
      .update({ label: null, label_color: null })
      .eq("label", "Latest")
      .neq("version", version);
  }

  // Pull the selected items in their current order
  const { data: items, error: itemsErr } = await supabaseAdmin
    .from("roadmap_items")
    .select("id, title, sort_order, created_at")
    .in("id", itemIds)
    .is("release_version", null)
    .eq("status", "done")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });
  if (itemsErr) return NextResponse.json({ error: itemsErr.message }, { status: 500 });
  if (!items || items.length === 0) {
    // Roll back the release row to keep things consistent
    await supabaseAdmin.from("releases").delete().eq("version", version);
    return NextResponse.json({ error: "No matching done items to release" }, { status: 400 });
  }

  // Copy titles into release_features
  const features = items.map((item, i) => ({
    release_version: version,
    feature: item.title,
    sort_order: i,
  }));
  const { error: featErr } = await supabaseAdmin.from("release_features").insert(features);
  if (featErr) return NextResponse.json({ error: featErr.message }, { status: 500 });

  // Stamp the items
  const releasedAtIso = new Date(releasedAt).toISOString();
  const { error: stampErr } = await supabaseAdmin
    .from("roadmap_items")
    .update({ release_version: version, released_at: releasedAtIso })
    .in("id", items.map(i => i.id));
  if (stampErr) return NextResponse.json({ error: stampErr.message }, { status: 500 });

  return NextResponse.json({ message: "released", version, count: items.length });
}
