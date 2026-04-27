import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { resend } from "@/lib/resend";
import { clerkClient } from "@clerk/nextjs/server";

const CRON_SECRET = process.env.CRON_SECRET;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://stackritual.com";

interface EnrollmentRow {
  id: string;
  status: string;
  enrolled_at: string;
  campaign: {
    id: string;
    name: string;
    is_active: boolean;
    sender_email: string;
    sender_name: string;
  };
  subscriber: {
    id: string;
    email: string;
    unsubscribed_at: string | null;
    unsubscribe_token: string;
  };
}

function daysBetween(a: Date, b: Date): number {
  return Math.floor((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

function personalizeBody(html: string, unsubscribeUrl: string): string {
  return html
    .replace(/\{\{\s*unsubscribe_url\s*\}\}/gi, unsubscribeUrl)
    .replace(/\[Unsubscribe\]/gi, `<a href="${unsubscribeUrl}">unsubscribe</a>`);
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Pull active enrollments with joined campaign + subscriber
  const { data: enrollmentsRaw, error: enrErr } = await supabaseAdmin
    .from("campaign_enrollments")
    .select(`
      id, status, enrolled_at,
      campaign:campaign_id (id, name, is_active, sender_email, sender_name),
      subscriber:subscriber_id (id, email, unsubscribed_at, unsubscribe_token)
    `)
    .eq("status", "active");
  if (enrErr) return NextResponse.json({ error: enrErr.message }, { status: 500 });

  // Supabase returns joined relations as arrays — normalize
  const enrollments: EnrollmentRow[] = (enrollmentsRaw || []).map(r => {
    const row = r as unknown as Record<string, unknown>;
    return {
      id: row.id as string,
      status: row.status as string,
      enrolled_at: row.enrolled_at as string,
      campaign: Array.isArray(row.campaign) ? row.campaign[0] : row.campaign,
      subscriber: Array.isArray(row.subscriber) ? row.subscriber[0] : row.subscriber,
    } as EnrollmentRow;
  });

  let sent = 0;
  let errors = 0;
  let completed = 0;

  for (const enr of enrollments) {
    try {
      if (!enr.campaign || !enr.subscriber) continue;
      if (!enr.campaign.is_active) continue;
      if (enr.subscriber.unsubscribed_at) {
        await supabaseAdmin.from("campaign_enrollments").update({ status: "stopped" }).eq("id", enr.id);
        continue;
      }

      // Defensive read: if a matching SR user has email_marketing=false or
      // email_unsubscribed_all=true, skip. Two-way sync at write time should
      // make unsubscribed_at reflect this already, but the double-check keeps
      // a single source of truth for sending decisions.
      const subscriberEmail = enr.subscriber.email.toLowerCase();
      const client = await clerkClient();
      type ProfileFlags = { email_marketing: boolean | null; email_unsubscribed_all: boolean };
      let matchingProfile: ProfileFlags | null = null;
      try {
        const userList = await client.users.getUserList({ emailAddress: [subscriberEmail], limit: 1 });
        const userData = userList.data ?? userList;
        const matchedUserId = (Array.isArray(userData) ? userData[0]?.id : undefined) as string | undefined;
        if (matchedUserId) {
          const { data: profile } = await supabaseAdmin
            .from("user_profiles")
            .select("email_marketing, email_unsubscribed_all")
            .eq("user_id", matchedUserId)
            .maybeSingle();
          matchingProfile = profile as ProfileFlags | null;
        }
      } catch (e) {
        // Clerk lookup failure is non-fatal; fall back to subscriber-table-only gating.
        console.warn("[cron/campaign-queue] Clerk lookup failed for", subscriberEmail, e);
      }
      if (matchingProfile?.email_unsubscribed_all === true) continue;
      if (matchingProfile?.email_marketing === false) continue;

      // Templates for this campaign
      const { data: templates } = await supabaseAdmin
        .from("campaign_templates")
        .select("*")
        .eq("campaign_id", enr.campaign.id)
        .order("sequence_order", { ascending: true });
      if (!templates || templates.length === 0) continue;

      // Already-sent template ids
      const { data: sends } = await supabaseAdmin
        .from("campaign_sends")
        .select("template_id")
        .eq("enrollment_id", enr.id);
      const sentIds = new Set((sends || []).map((s: { template_id: string }) => s.template_id));

      // Find the next template whose delay_days have elapsed since enrolled_at
      const enrolledAt = new Date(enr.enrolled_at);
      const now = new Date();
      const elapsedDays = daysBetween(enrolledAt, now);

      const nextTemplate = templates.find(
        t => !sentIds.has(t.id) && (t.delay_days as number) <= elapsedDays,
      );

      if (!nextTemplate) {
        // If all templates already sent, mark completed
        if (templates.every(t => sentIds.has(t.id))) {
          await supabaseAdmin.from("campaign_enrollments").update({ status: "completed" }).eq("id", enr.id);
          completed++;
        }
        continue;
      }

      const unsubscribeUrl = `${APP_URL}/unsubscribe?token=${enr.subscriber.unsubscribe_token}`;
      const html = personalizeBody(nextTemplate.body_html as string, unsubscribeUrl);
      const from = `${enr.campaign.sender_name} <${enr.campaign.sender_email}>`;

      try {
        await resend.emails.send({
          from,
          to: enr.subscriber.email,
          subject: nextTemplate.subject as string,
          html,
        });
        await supabaseAdmin.from("campaign_sends").insert({
          enrollment_id: enr.id,
          template_id: nextTemplate.id,
          status: "sent",
        });
        await supabaseAdmin
          .from("newsletter_subscribers")
          .update({ last_sent_at: new Date().toISOString() })
          .eq("id", enr.subscriber.id);
        sent++;
      } catch (e) {
        console.error("campaign send failed", e);
        await supabaseAdmin.from("campaign_sends").insert({
          enrollment_id: enr.id,
          template_id: nextTemplate.id,
          status: "failed",
        });
        errors++;
      }
    } catch (e) {
      console.error("enrollment loop error", e);
      errors++;
    }
  }

  return NextResponse.json({ message: "done", sent, errors, completed });
}
