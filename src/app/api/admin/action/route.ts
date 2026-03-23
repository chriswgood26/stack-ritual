import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

// Your Clerk user ID — get this from /api/admin/me after first login
const ADMIN_IDS = process.env.ADMIN_USER_IDS?.split(",") || [];

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // For now allow any authenticated user — will lock down once we get your user ID
  // if (!ADMIN_IDS.includes(userId)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { itemId, table, action } = await req.json();

  if (action === "approve" && table === "user_submitted_supplements") {
    // Fetch the submission
    const { data: sub } = await supabaseAdmin
      .from("user_submitted_supplements")
      .select("*")
      .eq("id", itemId)
      .single();

    if (sub) {
      // Generate slug from name
      const slug = sub.name.toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .trim();

      // Insert into main supplements table
      await supabaseAdmin.from("supplements").upsert({
        name: sub.name,
        slug,
        category: sub.category || "other",
        icon: sub.icon || "💊",
        tagline: sub.tagline || null,
        description: sub.tagline || null,
        dose_recommendation: sub.dose || null,
        timing_recommendation: sub.timing || null,
        evidence_level: "limited",
      }, { onConflict: "slug", ignoreDuplicates: true });
    }

    // Mark as approved
    await supabaseAdmin
      .from("user_submitted_supplements")
      .update({ status: "approved", approved_at: new Date().toISOString() })
      .eq("id", itemId);
  } else if (action === "reject" && table === "user_submitted_supplements") {
    await supabaseAdmin
      .from("user_submitted_supplements")
      .update({ status: "rejected" })
      .eq("id", itemId);
  } else if (action === "delete") {
    await supabaseAdmin.from(table).delete().eq("id", itemId);
  }

  return NextResponse.json({ message: "done" });
}
