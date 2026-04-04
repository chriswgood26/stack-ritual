import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";

const ADMIN_IDS = process.env.ADMIN_USER_IDS?.split(",") || [];

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId || !ADMIN_IDS.includes(userId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const email = searchParams.get("email");

  if (!email) return NextResponse.json({ error: "email required" }, { status: 400 });

  // Search Clerk for user by email
  const client = await clerkClient();
  const users = await client.users.getUserList({ emailAddress: [email] });

  if (!users.data.length) {
    return NextResponse.json({ error: "No user found with that email" }, { status: 404 });
  }

  const user = users.data[0];

  // Get their subscription
  const { data: sub } = await supabaseAdmin
    .from("subscriptions")
    .select("plan, status, stripe_customer_id")
    .eq("user_id", user.id)
    .single();

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.emailAddresses[0]?.emailAddress,
      firstName: user.firstName,
      lastName: user.lastName,
      createdAt: user.createdAt,
    },
    subscription: sub || { plan: "free", status: "active" },
  });
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId || !ADMIN_IDS.includes(userId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { target_user_id, plan } = await req.json();
  if (!target_user_id || !plan) {
    return NextResponse.json({ error: "target_user_id and plan required" }, { status: 400 });
  }

  await supabaseAdmin.from("subscriptions").upsert({
    user_id: target_user_id,
    plan,
    status: "active",
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id" });

  return NextResponse.json({ message: "updated", plan });
}
