import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import crypto from "crypto";

function verifyToken(userId: string, date: string, itemIds: string[], token: string) {
  const secret = process.env.CLERK_SECRET_KEY!;
  const payload = `${userId}:${date}:${itemIds.join(",")}`;
  const expected = crypto.createHmac("sha256", secret).update(payload).digest("hex").slice(0, 16);
  return expected === token;
}

export async function POST(req: NextRequest) {
  const { uid, date, ids, token } = await req.json();

  if (!uid || !date || !ids?.length || !token) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  // Verify token
  if (!verifyToken(uid, date, ids, token)) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  // Check token expiry — reject if date is older than 24 hours
  const tokenDate = new Date(date);
  const now = new Date();
  const hoursDiff = (now.getTime() - tokenDate.getTime()) / (1000 * 60 * 60);
  if (isNaN(tokenDate.getTime()) || hoursDiff > 24) {
    return NextResponse.json({ error: "Token expired" }, { status: 403 });
  }

  // Check if already done
  const { count } = await supabaseAdmin
    .from("daily_logs")
    .select("*", { count: "exact", head: true })
    .eq("user_id", uid)
    .eq("logged_date", date)
    .in("stack_item_id", ids);

  if ((count || 0) >= ids.length) {
    return NextResponse.json({ message: "already_done" });
  }

  // Mark all as done
  const logsToInsert = ids.map((id: string) => ({
    user_id: uid,
    stack_item_id: id,
    logged_date: date,
    dose_index: 0,
    taken_at: new Date().toISOString(),
  }));

  await supabaseAdmin.from("daily_logs").upsert(logsToInsert, { ignoreDuplicates: true });

  return NextResponse.json({ message: "success", count: ids.length });
}
