import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { Resend } from "resend";

const ADMIN_USER_IDS = process.env.ADMIN_USER_IDS?.split(",") || [];

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId || !ADMIN_USER_IDS.includes(userId)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "RESEND_API_KEY not configured" }, { status: 503 });

  const { id } = await params;
  const { data: affiliate, error } = await supabaseAdmin.from("affiliates").select("*").eq("id", id).single();
  if (error || !affiliate) return NextResponse.json({ error: "Affiliate not found" }, { status: 404 });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const a = affiliate as any;
  if (!a.email) return NextResponse.json({ error: "No email on file" }, { status: 400 });

  const firstName = (a.name as string).split(" ")[0];
  const referralLink = `https://stackritual.com/?ref=${a.code}`;

  const html = `
    <div style="max-width: 600px; margin: 0 auto; font-family: system-ui, sans-serif; color: #333; line-height: 1.6;">
      <div style="text-align: center; padding: 30px 0 20px;">
        <h1 style="margin: 0; color: #065f46; font-size: 28px;">Welcome to the Stack Ritual Affiliate Program! 🌿</h1>
      </div>
      <p>Hi ${firstName},</p>
      <p>Congratulations! You&rsquo;re officially part of the <strong>Stack Ritual Affiliate Program</strong>. Thanks for helping us spread the word about a smarter way to track supplements and wellness rituals.</p>
      <div style="background: #f0fdf4; border-left: 4px solid #10b981; padding: 20px; margin: 24px 0; border-radius: 4px;">
        <h2 style="margin: 0 0 12px; color: #065f46; font-size: 18px;">Your Affiliate Details</h2>
        <p style="margin: 4px 0;"><strong>Affiliate Code:</strong> <code style="background: #fff; padding: 2px 8px; border-radius: 4px; color: #065f46; font-weight: 600;">${a.code}</code></p>
        <p style="margin: 4px 0;"><strong>First Month Commission:</strong> ${a.first_month_percentage}%</p>
        <p style="margin: 4px 0;"><strong>Recurring Commission:</strong> ${a.recurring_percentage}% for as long as they stay subscribed</p>
        <p style="margin: 8px 0;"><strong>Your Referral Link:</strong></p>
        <p style="margin: 8px 0;"><a href="${referralLink}" style="background: #10b981; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">${referralLink}</a></p>
      </div>
      <h2 style="color: #065f46; font-size: 20px; margin-top: 32px;">How It Works</h2>
      <p>Share your unique referral link with anyone who might benefit from Stack Ritual &mdash; friends interested in wellness, biohackers, supplement enthusiasts, or anyone trying to build consistent routines.</p>
      <p>When someone clicks your link and signs up for a paid subscription, you earn:</p>
      <ul style="padding-left: 20px;">
        <li><strong>${a.first_month_percentage}%</strong> of their first month&rsquo;s subscription</li>
        <li><strong>${a.recurring_percentage}%</strong> of every subsequent month they stay subscribed</li>
      </ul>
      <h3 style="color: #065f46; font-size: 16px; margin-top: 24px;">Ways to share:</h3>
      <ul style="padding-left: 20px;">
        <li>Instagram stories about your supplement routine</li>
        <li>TikTok videos showing how you track your stack</li>
        <li>Reddit posts in wellness/biohacking communities</li>
        <li>Direct messages to friends asking for supplement advice</li>
        <li>Your email signature or link-in-bio</li>
      </ul>
      <h2 style="color: #065f46; font-size: 20px; margin-top: 32px;">When Payouts Are Due</h2>
      <p>We&rsquo;ll reach out to you when a payout is ready to:</p>
      <ul style="padding-left: 20px;">
        <li>Confirm your preferred payment method (Zelle, PayPal, check, etc.)</li>
        <li>Collect any tax information needed for a 1099 (if your annual total reaches $600)</li>
        <li>Send your payment</li>
      </ul>
      <div style="background: #fffbeb; border-left: 4px solid #f59e0b; padding: 16px; margin: 24px 0; border-radius: 4px;">
        <p style="margin: 0; font-size: 14px;"><strong>Important:</strong> As an independent affiliate, you&rsquo;re responsible for reporting and paying any applicable taxes on payouts received. Stack Ritual LLC does not withhold taxes from affiliate payments.</p>
      </div>
      <p>If you have questions about the program or need help, just reply to this email.</p>
      <p>Thanks for being part of the Stack Ritual community! 🌿</p>
      <p style="margin-top: 24px;">
        Best,<br>
        <strong>Chris Goodbaudy</strong><br>
        Founder, Stack Ritual<br>
        <a href="https://stackritual.com" style="color: #10b981;">stackritual.com</a>
      </p>
    </div>
  `;

  const resend = new Resend(apiKey);
  const { error: sendError } = await resend.emails.send({
    from: "Stack Ritual <hello@stackritual.com>",
    to: a.email as string,
    replyTo: "hello@stackritual.com",
    subject: `Welcome to the Stack Ritual Affiliate Program, ${firstName}! 🌿`,
    html,
  });

  if (sendError) {
    console.error("Resend error:", sendError);
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  }

  const sentAt = new Date().toISOString();
  await supabaseAdmin
    .from("affiliates")
    .update({ last_welcome_email_sent_at: sentAt, updated_at: sentAt })
    .eq("id", id);

  return NextResponse.json({ ok: true, last_welcome_email_sent_at: sentAt });
}
