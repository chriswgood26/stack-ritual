import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { resend, getFromEmail } from "@/lib/resend";
import { clerkClient } from "@clerk/nextjs/server";

const CRON_SECRET = process.env.CRON_SECRET;
const COOLDOWN_DAYS = 14;

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Items eligible for a low-supply alert:
  // - active, not paused, alerts opted-in for the item
  // - quantity_remaining <= 14
  // - never alerted OR last alert was > 14 days ago
  const cooldownCutoff = new Date();
  cooldownCutoff.setDate(cooldownCutoff.getDate() - COOLDOWN_DAYS);

  const { data: lowItems } = await supabaseAdmin
    .from("user_stacks")
    .select("id, user_id, custom_name, dose, quantity_remaining, quantity_total, quantity_unit, doses_per_serving, supplement:supplement_id(name, slug)")
    .eq("is_active", true)
    .or("is_paused.is.null,is_paused.eq.false")
    .eq("low_supply_alert", true)
    .not("quantity_remaining", "is", null)
    .lte("quantity_remaining", 14)
    .or(`last_low_supply_alert_sent_at.is.null,last_low_supply_alert_sent_at.lt.${cooldownCutoff.toISOString()}`);

  if (!lowItems || lowItems.length === 0) {
    return NextResponse.json({ message: "No low supply items", sent: 0 });
  }

  // Group by user
  const byUser: Record<string, typeof lowItems> = {};
  lowItems.forEach(item => {
    if (!byUser[item.user_id]) byUser[item.user_id] = [];
    byUser[item.user_id].push(item);
  });

  let sent = 0;
  const client = await clerkClient();

  for (const [userId, items] of Object.entries(byUser)) {
    try {
      // Check subscription
      const { data: sub } = await supabaseAdmin
        .from("subscriptions")
        .select("plan, status")
        .eq("user_id", userId)
        .single();

      if (!sub || sub.status !== "active") continue;

      // Check email preferences
      const { data: profile } = await supabaseAdmin
        .from("user_profiles")
        .select("email_reminders_enabled, email_unsubscribed_all")
        .eq("user_id", userId)
        .single();

      if (!profile || profile.email_unsubscribed_all) continue;
      if (!profile.email_reminders_enabled) continue;

      // Get user email from Clerk
      const users = await client.users.getUser(userId);
      const email = users.emailAddresses?.[0]?.emailAddress;
      const firstName = users.firstName || "there";
      if (!email) continue;

      // Build item list
      const itemRows = items.map(item => {
        const supp = Array.isArray(item.supplement) ? item.supplement[0] : item.supplement;
        const name = supp?.name || item.custom_name || "Supplement";
        const reorderUrl = `https://www.amazon.com/s?k=${encodeURIComponent(name + ' supplement')}&tag=stackritual-20`;
        return `<tr>
          <td style="padding:8px 0;border-bottom:1px solid #f3f4f6;font-weight:600">${name}</td>
          <td style="padding:8px 0;border-bottom:1px solid #f3f4f6;color:#6b7280">${item.quantity_remaining} ${item.quantity_unit || "doses"} left</td>
          <td style="padding:8px 0;border-bottom:1px solid #f3f4f6"><a href="${reorderUrl}" style="color:#065f46;font-weight:600;text-decoration:none">Reorder →</a></td>
        </tr>`;
      }).join("");

      await resend.emails.send({
        from: getFromEmail(),
        to: email,
        subject: `🌿 Running low on ${items.length === 1 ? items[0].custom_name || "your supplement" : `${items.length} supplements`}`,
        html: `
          <!DOCTYPE html>
          <html>
          <body style="font-family:-apple-system,sans-serif;background:#fafaf9;padding:20px;">
            <div style="max-width:480px;margin:0 auto;background:white;border-radius:16px;overflow:hidden;border:1px solid #e7e5e4;">
              <div style="background:#065f46;padding:24px;text-align:center;">
                <h1 style="color:white;margin:0;font-size:20px;">🌿 Stack Ritual</h1>
              </div>
              <div style="padding:24px;">
                <h2 style="color:#1c1917;margin-top:0;">Hi ${firstName} — time to reorder!</h2>
                <p style="color:#6b7280;">You're running low on the following supplements:</p>
                <table style="width:100%;border-collapse:collapse;">
                  <thead>
                    <tr style="text-align:left;">
                      <th style="padding:8px 0;color:#9ca3af;font-size:12px;font-weight:600">Supplement</th>
                      <th style="padding:8px 0;color:#9ca3af;font-size:12px;font-weight:600">Remaining</th>
                      <th style="padding:8px 0;color:#9ca3af;font-size:12px;font-weight:600">Action</th>
                    </tr>
                  </thead>
                  <tbody>${itemRows}</tbody>
                </table>
                <a href="https://stackritual.com/dashboard/stack" style="display:block;background:#065f46;color:white;text-align:center;padding:14px;border-radius:12px;text-decoration:none;font-weight:600;margin-top:20px;">
                  View My Stack
                </a>
              </div>
              <div style="background:#fafaf9;padding:16px;text-align:center;border-top:1px solid #e7e5e4;">
                <p style="color:#a8a29e;font-size:11px;margin:0;">
                  <a href="https://stackritual.com/share" style="color: #065f46; font-weight: 600; text-decoration: none;">Love Stack Ritual? Share the app with a friend</a><br><br>
                  ⚕️ Nothing on Stack Ritual constitutes medical advice.<br>
                  <a href="https://stackritual.com/dashboard/profile" style="color:#a8a29e;">Manage email preferences</a>
                </p>
              </div>
            </div>
          </body>
          </html>
        `,
      });

      // Stamp the cooldown timestamp on every item included in this user's email
      const itemIds = items.map(i => i.id);
      const { error: updateErr } = await supabaseAdmin
        .from("user_stacks")
        .update({ last_low_supply_alert_sent_at: new Date().toISOString() })
        .in("id", itemIds);
      if (updateErr) {
        console.error(`[cron/low-supply] cooldown stamp failed for user ${userId}:`, updateErr);
      }

      sent++;
    } catch (e) {
      console.error(`Error sending low supply alert to ${userId}:`, e);
    }
  }

  return NextResponse.json({ message: "done", sent });
}
