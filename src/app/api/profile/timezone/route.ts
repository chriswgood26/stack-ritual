import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

// Valid IANA timezones look like "Area/City". Quick guard against garbage.
function looksLikeIanaTz(tz: string) {
  if (!tz || tz.length > 80) return false;
  return /^[A-Za-z_]+\/[A-Za-z_+\-/0-9]+$/.test(tz) || tz === "UTC";
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { timezone } = await req.json();
  if (!looksLikeIanaTz(timezone)) {
    return NextResponse.json({ error: "Invalid timezone" }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from("user_profiles")
    .upsert(
      { user_id: userId, timezone, updated_at: new Date().toISOString() },
      { onConflict: "user_id" }
    );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
