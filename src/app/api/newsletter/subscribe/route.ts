import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { resend, FROM_EMAIL } from "@/lib/resend";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://stackritual.com";

function welcomeHtml(unsubscribeUrl: string) {
  return `
    <!DOCTYPE html>
    <html>
    <body style="font-family: -apple-system, sans-serif; background: #fafaf9; padding: 20px;">
      <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; border: 1px solid #e7e5e4;">
        <div style="background: #065f46; padding: 32px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">🌿 Welcome to Stack Ritual</h1>
          <p style="color: #a7f3d0; margin: 8px 0 0;">Know your stack. Own your health.</p>
        </div>
        <div style="padding: 24px;">
          <p style="color: #1c1917; margin-top: 0;">Thanks for subscribing! You&rsquo;ll hear from us with supplement tips, feature updates, and evidence-based health insights — no spam, ever.</p>
          <p style="color: #44403c;">Not using Stack Ritual yet? <a href="${APP_URL}/sign-up" style="color: #065f46; font-weight: 600;">Start tracking your stack free</a>.</p>
        </div>
        <div style="background: #fafaf9; padding: 16px; text-align: center; border-top: 1px solid #e7e5e4;">
          <p style="color: #a8a29e; font-size: 11px; margin: 0;">
            <a href="${unsubscribeUrl}" style="color: #a8a29e;">Unsubscribe</a>
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

export async function POST(req: NextRequest) {
  const { email, source } = await req.json();
  if (!email || typeof email !== "string" || !email.includes("@")) {
    return NextResponse.json({ error: "Valid email required" }, { status: 400 });
  }

  const normalized = email.trim().toLowerCase();

  // Upsert — if already subscribed and active, no-op; if previously unsubscribed, reactivate
  const { data: existing } = await supabaseAdmin
    .from("newsletter_subscribers")
    .select("id, unsubscribed_at, unsubscribe_token")
    .eq("email", normalized)
    .maybeSingle();

  let subscriber: { id: string; unsubscribe_token: string } | null = null;
  let isNew = false;

  if (existing) {
    if (existing.unsubscribed_at) {
      await supabaseAdmin
        .from("newsletter_subscribers")
        .update({ unsubscribed_at: null, subscribed_at: new Date().toISOString(), source: source || null })
        .eq("id", existing.id);
    }
    subscriber = { id: existing.id, unsubscribe_token: existing.unsubscribe_token };
  } else {
    const { data, error } = await supabaseAdmin
      .from("newsletter_subscribers")
      .insert({ email: normalized, source: source || null })
      .select("id, unsubscribe_token")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    subscriber = data;
    isNew = true;
  }

  if (subscriber && isNew) {
    const unsubscribeUrl = `${APP_URL}/unsubscribe?token=${subscriber.unsubscribe_token}`;
    try {
      await resend.emails.send({
        from: FROM_EMAIL,
        to: normalized,
        subject: "🌿 Welcome to Stack Ritual",
        html: welcomeHtml(unsubscribeUrl),
      });
    } catch (e) {
      console.error("Newsletter welcome email failed:", e);
    }
  }

  return NextResponse.json({ message: "subscribed" });
}
