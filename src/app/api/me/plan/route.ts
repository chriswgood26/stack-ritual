import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { data } = await supabaseAdmin
    .from("subscriptions")
    .select("plan, status")
    .eq("user_id", userId)
    .maybeSingle();
  const isActive = data?.status === "active";
  const plan: "free" | "plus" | "pro" =
    isActive && (data?.plan === "plus" || data?.plan === "pro")
      ? data.plan
      : "free";
  return NextResponse.json({ plan });
}
