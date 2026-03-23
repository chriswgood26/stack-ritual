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
