import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

const ADMIN_USER_IDS = process.env.ADMIN_USER_IDS?.split(",") || [];

async function requireAdmin() {
  const { userId } = await auth();
  if (!userId || !ADMIN_USER_IDS.includes(userId)) return null;
  return userId;
}

// POST cuts a new release. Body: { version, released_at, label?, label_color?, features[] }
// Features is a list of strings — typed/pasted into the admin form.
// Task tracking lives in a separate Project Tracker app; release notes are
// composed at deploy time from that app's "done" list.
export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  const version: string = (body.version || "").trim();
  const releasedAt: string = (body.released_at || "").trim();
  const label: string | null = body.label?.trim() || null;
  const labelColor: string | null = body.label_color?.trim() || null;
  const features: string[] = Array.isArray(body.features)
    ? body.features.map((f: unknown) => String(f || "").trim()).filter(Boolean)
    : [];

  if (!version) return NextResponse.json({ error: "Version required" }, { status: 400 });
  if (!releasedAt) return NextResponse.json({ error: "Date required" }, { status: 400 });
  if (features.length === 0) return NextResponse.json({ error: "Add at least one feature" }, { status: 400 });

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

  const featureRows = features.map((feature, i) => ({
    release_version: version,
    feature,
    sort_order: i,
  }));
  const { error: featErr } = await supabaseAdmin.from("release_features").insert(featureRows);
  if (featErr) {
    // Roll back the release row to keep things consistent
    await supabaseAdmin.from("releases").delete().eq("version", version);
    return NextResponse.json({ error: featErr.message }, { status: 500 });
  }

  return NextResponse.json({ message: "released", version, count: features.length });
}
