import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import {
  sendAffiliateInterestAdminEmail,
  sendAffiliateInterestConfirmationEmail,
} from "@/lib/emails";

const ADMIN_USER_IDS = process.env.ADMIN_USER_IDS?.split(",") || [];
const ADMIN_NOTIFICATION_EMAIL =
  process.env.AFFILIATE_ADMIN_EMAIL || "hello@stackritual.com";

// GET — admin only, list pending interest signups
export async function GET() {
  const { userId } = await auth();
  if (!userId || !ADMIN_USER_IDS.includes(userId)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { data, error } = await supabaseAdmin
    .from("affiliate_interest")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: data || [] });
}

// Public endpoint — handles affiliate program signup from /affiliate-program
// (creator-focused, no address) and /affiliate (store-focused, with mailing
// address for the counter display).
export async function POST(req: NextRequest) {
  const {
    name,
    email,
    message,
    store_name,
    street_address,
    street_address_2,
    city,
    state,
    zip,
    source,
  } = await req.json();

  if (!name || !email) {
    return NextResponse.json({ error: "Name and email are required" }, { status: 400 });
  }

  const resolvedSource: "store" | "personal" =
    source === "store" || source === "personal"
      ? source
      : (store_name || street_address ? "store" : "personal");

  const record = {
    name,
    email,
    message: message || null,
    store_name: store_name || null,
    street_address: street_address || null,
    street_address_2: street_address_2 || null,
    city: city || null,
    state: state || null,
    zip: zip || null,
    source: resolvedSource,
    status: "pending" as const,
  };

  const { error } = await supabaseAdmin.from("affiliate_interest").insert(record);
  if (error) {
    console.error("affiliate_interest insert failed:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Notifications. Resend SDK resolves with { data, error } rather than
  // throwing on API-level errors, so we inspect the result directly and log
  // each outcome. Failures here don't block the request — the DB insert
  // succeeded, so the applicant's submission is safe.
  try {
    const adminRes = await sendAffiliateInterestAdminEmail(
      ADMIN_NOTIFICATION_EMAIL,
      record,
    );
    if (adminRes.error) {
      console.error("Admin notification email failed:", adminRes.error);
    } else {
      console.log("Admin notification email sent:", adminRes.data?.id);
    }
  } catch (e) {
    console.error("Admin notification email threw:", e);
  }

  try {
    const userRes = await sendAffiliateInterestConfirmationEmail(
      email,
      name,
      !!store_name,
    );
    if (userRes.error) {
      console.error("Applicant confirmation email failed:", userRes.error);
    } else {
      console.log("Applicant confirmation email sent:", userRes.data?.id);
    }
  } catch (e) {
    console.error("Applicant confirmation email threw:", e);
  }

  return NextResponse.json({ ok: true });
}
