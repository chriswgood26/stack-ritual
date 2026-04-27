import { resend, getFromEmail } from './resend';

// Daily reminder email
export async function sendDailyReminderEmail(to: string, firstName: string, items: { name: string; timing: string; dose?: string }[], doneUrl: string) {
  const itemList = items.map(i => `<li><strong>${i.name}</strong>${i.dose ? ` — ${i.dose}` : ''}</li>`).join('');

  return resend.emails.send({
    from: getFromEmail(),
    to,
    subject: `🌿 Time for your ${items[0]?.timing || 'daily'} stack, ${firstName}`,
    html: `
      <!DOCTYPE html>
      <html>
      <body style="font-family: -apple-system, sans-serif; background: #fafaf9; padding: 20px;">
        <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; border: 1px solid #e7e5e4;">
          <div style="background: #065f46; padding: 24px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 20px;">🌿 Stack Ritual</h1>
          </div>
          <div style="padding: 24px;">
            <h2 style="color: #1c1917; margin-top: 0;">Hi ${firstName}! Time for your supplements.</h2>
            <ul style="color: #44403c; line-height: 2;">
              ${itemList}
            </ul>
            <a href="${doneUrl}" style="display: block; background: #065f46; color: white; text-align: center; padding: 14px; border-radius: 12px; text-decoration: none; font-weight: 600; margin-top: 16px;">
              ✓ Mark these all done
            </a>
            <p style="color: #a8a29e; font-size: 11px; text-align: center; margin-top: 8px; margin-bottom: 0;">
              This link expires at end of day.
            </p>
            <p style="color: #a8a29e; font-size: 12px; text-align: center; margin-top: 16px;">
              <a href="https://stackritual.com/dashboard" style="color: #a8a29e;">Open app</a> ·
              <a href="https://stackritual.com/dashboard/profile" style="color: #a8a29e;">Manage settings</a>
            </p>
          </div>
          <div style="background: #fafaf9; padding: 16px; text-align: center; border-top: 1px solid #e7e5e4;">
            <p style="color: #a8a29e; font-size: 11px; margin: 0;">
              <a href="https://stackritual.com/share" style="color: #065f46; font-weight: 600; text-decoration: none;">Love Stack Ritual? Share the app with a friend</a><br><br>
              <a href="https://stackritual.com/affiliate-program" style="color: #065f46; font-weight: 600; text-decoration: none;">💰 Earn by sharing — become an affiliate</a><br><br>
              ⚕️ Nothing in this email constitutes medical advice.<br>
              <a href="https://stackritual.com/dashboard/profile" style="color: #a8a29e;">Unsubscribe from emails</a>
            </p>
          </div>
        </div>
      </body>
      </html>
    `,
  });
}

// Consolidated daily summary email — all of today's pending items in one email
export async function sendDailySummaryEmail(
  to: string,
  firstName: string,
  itemsByGroup: { label: string; items: { name: string; dose?: string }[] }[],
  doneUrl: string,
) {
  const totalCount = itemsByGroup.reduce((s, g) => s + g.items.length, 0);
  const groupHtml = itemsByGroup
    .filter(g => g.items.length > 0)
    .map(
      g => `
      <div style="margin-bottom: 16px;">
        <div style="font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #065f46; margin-bottom: 6px;">${g.label}</div>
        <ul style="color: #44403c; line-height: 1.8; margin: 0; padding-left: 20px;">
          ${g.items.map(i => `<li><strong>${i.name}</strong>${i.dose ? ` — ${i.dose}` : ''}</li>`).join('')}
        </ul>
      </div>`,
    )
    .join('');

  return resend.emails.send({
    from: getFromEmail(),
    to,
    subject: `🌿 Your daily stack, ${firstName} (${totalCount} item${totalCount === 1 ? '' : 's'})`,
    html: `
      <!DOCTYPE html>
      <html>
      <body style="font-family: -apple-system, sans-serif; background: #fafaf9; padding: 20px;">
        <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; border: 1px solid #e7e5e4;">
          <div style="background: #065f46; padding: 24px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 20px;">🌿 Stack Ritual</h1>
          </div>
          <div style="padding: 24px;">
            <h2 style="color: #1c1917; margin-top: 0;">Hi ${firstName}! Here's your stack for today.</h2>
            ${groupHtml}
            <a href="${doneUrl}" style="display: block; background: #065f46; color: white; text-align: center; padding: 14px; border-radius: 12px; text-decoration: none; font-weight: 600; margin-top: 16px;">
              ✓ Mark All As Done For Today
            </a>
            <p style="color: #a8a29e; font-size: 11px; text-align: center; margin-top: 8px; margin-bottom: 0;">
              This link expires at end of day.
            </p>
            <p style="color: #a8a29e; font-size: 12px; text-align: center; margin-top: 16px;">
              <a href="https://stackritual.com/dashboard" style="color: #a8a29e;">Open app</a> ·
              <a href="https://stackritual.com/dashboard/profile" style="color: #a8a29e;">Manage settings</a>
            </p>
          </div>
          <div style="background: #fafaf9; padding: 16px; text-align: center; border-top: 1px solid #e7e5e4;">
            <p style="color: #a8a29e; font-size: 11px; margin: 0;">
              <a href="https://stackritual.com/share" style="color: #065f46; font-weight: 600; text-decoration: none;">Love Stack Ritual? Share the app with a friend</a><br><br>
              <a href="https://stackritual.com/affiliate-program" style="color: #065f46; font-weight: 600; text-decoration: none;">💰 Earn by sharing — become an affiliate</a><br><br>
              ⚕️ Nothing in this email constitutes medical advice.<br>
              <a href="https://stackritual.com/dashboard/profile" style="color: #a8a29e;">Unsubscribe from emails</a>
            </p>
          </div>
        </div>
      </body>
      </html>
    `,
  });
}

// Weekly summary email
export async function sendWeeklySummaryEmail(to: string, firstName: string, stats: { completionPct: number; perfectDays: number; totalCheckins: number; streak: number }) {
  const emoji = stats.completionPct >= 90 ? '🔥' : stats.completionPct >= 70 ? '🌿' : '💪';

  return resend.emails.send({
    from: getFromEmail(),
    to,
    subject: `${emoji} Your Stack Ritual weekly summary`,
    html: `
      <!DOCTYPE html>
      <html>
      <body style="font-family: -apple-system, sans-serif; background: #fafaf9; padding: 20px;">
        <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; border: 1px solid #e7e5e4;">
          <div style="background: #065f46; padding: 24px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 20px;">🌿 Weekly Summary</h1>
          </div>
          <div style="padding: 24px;">
            <h2 style="color: #1c1917; margin-top: 0;">Great week, ${firstName}! ${emoji}</h2>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 20px 0;">
              <div style="background: #f0fdf4; border-radius: 12px; padding: 16px; text-align: center;">
                <div style="font-size: 28px; font-weight: bold; color: #065f46;">${stats.completionPct}%</div>
                <div style="color: #6b7280; font-size: 12px;">Completion rate</div>
              </div>
              <div style="background: #f0fdf4; border-radius: 12px; padding: 16px; text-align: center;">
                <div style="font-size: 28px; font-weight: bold; color: #065f46;">${stats.perfectDays}</div>
                <div style="color: #6b7280; font-size: 12px;">Perfect days</div>
              </div>
              <div style="background: #f0fdf4; border-radius: 12px; padding: 16px; text-align: center;">
                <div style="font-size: 28px; font-weight: bold; color: #065f46;">${stats.totalCheckins}</div>
                <div style="color: #6b7280; font-size: 12px;">Total check-ins</div>
              </div>
              <div style="background: #f0fdf4; border-radius: 12px; padding: 16px; text-align: center;">
                <div style="font-size: 28px; font-weight: bold; color: #065f46;">${stats.streak}🔥</div>
                <div style="color: #6b7280; font-size: 12px;">Day streak</div>
              </div>
            </div>
            <a href="https://stackritual.com/dashboard/history" style="display: block; background: #065f46; color: white; text-align: center; padding: 14px; border-radius: 12px; text-decoration: none; font-weight: 600;">
              View full history →
            </a>
          </div>
          <div style="background: #fafaf9; padding: 16px; text-align: center; border-top: 1px solid #e7e5e4;">
            <p style="color: #a8a29e; font-size: 11px; margin: 0;">
              <a href="https://stackritual.com/share" style="color: #065f46; font-weight: 600; text-decoration: none;">Love Stack Ritual? Share the app with a friend</a><br><br>
              <a href="https://stackritual.com/affiliate-program" style="color: #065f46; font-weight: 600; text-decoration: none;">💰 Earn by sharing — become an affiliate</a><br><br>
              ⚕️ Nothing in this email constitutes medical advice.<br>
              <a href="https://stackritual.com/dashboard/profile" style="color: #a8a29e;">Manage email preferences</a>
            </p>
          </div>
        </div>
      </body>
      </html>
    `,
  });
}

// Welcome email (sent after signup)
export async function sendWelcomeEmail(to: string, firstName: string) {
  return resend.emails.send({
    from: getFromEmail(),
    to,
    subject: '🌿 Welcome to Stack Ritual!',
    html: `
      <!DOCTYPE html>
      <html>
      <body style="font-family: -apple-system, sans-serif; background: #fafaf9; padding: 20px;">
        <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; border: 1px solid #e7e5e4;">
          <div style="background: #065f46; padding: 32px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">🌿 Welcome to Stack Ritual</h1>
            <p style="color: #a7f3d0; margin: 8px 0 0;">Know your stack. Own your health.</p>
          </div>
          <div style="padding: 24px;">
            <h2 style="color: #1c1917; margin-top: 0;">Hi ${firstName || 'there'}! 👋</h2>
            <p style="color: #44403c; line-height: 1.6;">You're now part of Stack Ritual — the smart way to track, time, and optimize your supplement routine.</p>
            <p style="color: #44403c; line-height: 1.6;"><strong>Here's how to get started:</strong></p>
            <ol style="color: #44403c; line-height: 2;">
              <li>Search our supplement library and add what you take</li>
              <li>Get your personalized daily schedule</li>
              <li>Check off your stack each day and track your progress</li>
              <li>Share a clean summary with your doctor</li>
            </ol>
            <a href="https://stackritual.com/dashboard" style="display: block; background: #065f46; color: white; text-align: center; padding: 14px; border-radius: 12px; text-decoration: none; font-weight: 600; margin-top: 16px;">
              Build your stack →
            </a>
          </div>
          <div style="background: #fafaf9; padding: 16px; text-align: center; border-top: 1px solid #e7e5e4;">
            <p style="color: #a8a29e; font-size: 11px; margin: 0;">
              ⚕️ Nothing on Stack Ritual constitutes medical advice. Always consult your doctor.<br>
              stackritual.com
            </p>
          </div>
        </div>
      </body>
      </html>
    `,
  });
}

// Admin notification — sent when someone submits the affiliate interest form.
// Includes mailing address when the applicant is a store (for shipping the
// counter-display packet).
export async function sendAffiliateInterestAdminEmail(
  to: string,
  record: {
    name: string;
    email: string;
    message?: string | null;
    store_name?: string | null;
    street_address?: string | null;
    street_address_2?: string | null;
    city?: string | null;
    state?: string | null;
    zip?: string | null;
  },
) {
  const escape = (s: string) =>
    s.replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c]!));

  const subject = record.store_name
    ? `New affiliate application: ${record.store_name}`
    : `New affiliate application: ${record.name}`;

  const addressBlock = record.street_address
    ? `
        <div style="margin: 18px 0; padding: 12px 14px; background: #f0fdf4; border-radius: 10px;">
          <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #065f46; margin-bottom: 6px;">Mailing address</div>
          <div style="color: #1c1917; line-height: 1.5; font-size: 14px;">
            ${escape(record.street_address)}<br>
            ${record.street_address_2 ? escape(record.street_address_2) + "<br>" : ""}
            ${[record.city, record.state, record.zip].filter(Boolean).map((v) => escape(v!)).join(", ")}
          </div>
        </div>`
    : "";

  const messageBlock = record.message
    ? `
        <div style="margin: 18px 0;">
          <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #065f46; margin-bottom: 6px;">Message</div>
          <div style="color: #44403c; line-height: 1.5; font-size: 14px; white-space: pre-wrap;">${escape(record.message)}</div>
        </div>`
    : "";

  return resend.emails.send({
    from: getFromEmail(),
    to,
    subject,
    html: `
      <!DOCTYPE html>
      <html>
      <body style="font-family: -apple-system, sans-serif; background: #fafaf9; padding: 20px;">
        <div style="max-width: 560px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; border: 1px solid #e7e5e4;">
          <div style="background: #065f46; padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 18px;">🌿 New Affiliate Application</h1>
          </div>
          <div style="padding: 24px;">
            ${record.store_name ? `<h2 style="color: #1c1917; margin: 0 0 4px; font-size: 20px;">${escape(record.store_name)}</h2>` : ""}
            <div style="color: #44403c; line-height: 1.6; font-size: 14px;">
              <strong>${escape(record.name)}</strong><br>
              <a href="mailto:${escape(record.email)}" style="color: #065f46;">${escape(record.email)}</a>
            </div>
            ${addressBlock}
            ${messageBlock}
            <a href="https://stackritual.com/admin/affiliates" style="display: inline-block; background: #065f46; color: white; padding: 10px 16px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; margin-top: 8px;">
              Review in admin →
            </a>
          </div>
        </div>
      </body>
      </html>
    `,
  });
}

// Confirmation email — sent to the affiliate applicant after they submit.
// Branches copy based on whether they applied as a store (physical counter
// display will be shipped) or a creator (purely digital program).
export async function sendAffiliateInterestConfirmationEmail(
  to: string,
  firstName: string,
  isStore: boolean,
) {
  const nextStep = isStore
    ? `We'll review your store and reach out within a couple business days. If approved, we'll mail your custom counter card and affiliate details to the address you provided.`
    : `We'll review your application and reach out within a couple business days with your unique referral link and program details.`;

  return resend.emails.send({
    from: getFromEmail(),
    to,
    subject: "🌿 We got your Stack Ritual affiliate application",
    html: `
      <!DOCTYPE html>
      <html>
      <body style="font-family: -apple-system, sans-serif; background: #fafaf9; padding: 20px;">
        <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; border: 1px solid #e7e5e4;">
          <div style="background: #065f46; padding: 24px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 20px;">🌿 Stack Ritual</h1>
          </div>
          <div style="padding: 24px;">
            <h2 style="color: #1c1917; margin-top: 0;">Thanks, ${firstName}!</h2>
            <p style="color: #44403c; line-height: 1.6;">${nextStep}</p>
            <p style="color: #44403c; line-height: 1.6;">Questions? Just reply to this email.</p>
          </div>
          <div style="background: #fafaf9; padding: 16px; text-align: center; border-top: 1px solid #e7e5e4;">
            <p style="color: #a8a29e; font-size: 11px; margin: 0;">stackritual.com</p>
          </div>
        </div>
      </body>
      </html>
    `,
  });
}

// Referral credited — sent when a referred friend upgrades to Pro and the
// referrer earns a free Pro month (Stripe balance credit applied).
export async function sendReferralCreditedEmail(
  to: string,
  referrerFirstName: string | null,
  creditsEarned: number,
  creditsRemaining: number,
) {
  const greeting = referrerFirstName ? `Hi ${referrerFirstName},` : "Hi there,";
  const remainingLine = creditsRemaining > 0
    ? `<p style="color: #44403c; line-height: 1.6; font-size: 14px; margin: 8px 0;">You can earn up to <strong>${creditsRemaining} more free ${creditsRemaining === 1 ? "month" : "months"}</strong> through referrals.</p>`
    : `<p style="color: #44403c; line-height: 1.6; font-size: 14px; margin: 8px 0;">You've hit the lifetime cap of 6 free months — thanks for helping spread the word!</p>`;

  return resend.emails.send({
    from: getFromEmail(),
    to,
    subject: "🎉 You just earned a free month of Stack Ritual Pro",
    html: `
      <!DOCTYPE html>
      <html>
      <body style="font-family: -apple-system, sans-serif; background: #fafaf9; padding: 20px;">
        <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; border: 1px solid #e7e5e4;">
          <div style="background: #065f46; padding: 24px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 20px;">🌿 Stack Ritual</h1>
          </div>
          <div style="padding: 24px;">
            <h2 style="color: #1c1917; margin-top: 0; font-size: 18px;">🎉 You earned a free month!</h2>
            <p style="color: #44403c; line-height: 1.6; font-size: 14px;">${greeting}</p>
            <p style="color: #44403c; line-height: 1.6; font-size: 14px;">
              A friend just subscribed to Stack Ritual Pro using your referral link. Your next Pro invoice will be <strong>$9.99 off</strong> — the credit is already on your account, no action needed.
            </p>
            <div style="background: #f0fdf4; border-left: 3px solid #10b981; padding: 12px 16px; margin: 16px 0; border-radius: 4px;">
              <p style="color: #065f46; font-size: 14px; margin: 0;"><strong>Credits earned:</strong> ${creditsEarned} of 6</p>
            </div>
            ${remainingLine}
            <a href="https://www.stackritual.com/dashboard/profile" style="display: block; background: #065f46; color: white; text-align: center; padding: 14px; border-radius: 12px; text-decoration: none; font-weight: 600; margin-top: 16px;">
              View your referrals →
            </a>
          </div>
          <div style="background: #fafaf9; padding: 16px; text-align: center; border-top: 1px solid #e7e5e4;">
            <p style="color: #a8a29e; font-size: 11px; margin: 0;">
              stackritual.com
            </p>
          </div>
        </div>
      </body>
      </html>
    `,
  });
}

// Birthday email — sent once per year on the user's birthday by
// /api/cron/birthday-emails. Year stamp in user_profiles.last_birthday_email_year
// guarantees one email per user per year.
export async function sendBirthdayEmail(to: string, firstName: string) {
  const greeting = firstName ? firstName : "friend";
  return resend.emails.send({
    from: getFromEmail(),
    to,
    subject: "🎉 Happy birthday from Stack Ritual",
    html: `
      <!DOCTYPE html>
      <html>
      <body style="font-family: -apple-system, sans-serif; background: #fafaf9; padding: 20px;">
        <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; border: 1px solid #e7e5e4;">
          <div style="background: #065f46; padding: 24px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 20px;">🎉 Happy Birthday!</h1>
          </div>
          <div style="padding: 24px;">
            <h2 style="color: #1c1917; margin-top: 0;">Hi ${greeting},</h2>
            <p style="color: #44403c; line-height: 1.6;">Wishing you a happy birthday from everyone at Stack Ritual. Thanks for being part of the journey — here's to another year of feeling your best.</p>
            <a href="https://stackritual.com/dashboard" style="display: inline-block; background: #065f46; color: white; padding: 12px 18px; border-radius: 12px; text-decoration: none; font-weight: 600; margin-top: 12px;">
              Open the app →
            </a>
          </div>
          <div style="background: #fafaf9; padding: 16px; text-align: center; border-top: 1px solid #e7e5e4;">
            <p style="color: #a8a29e; font-size: 11px; margin: 0;">stackritual.com</p>
          </div>
        </div>
      </body>
      </html>
    `,
  });
}

// Referral invite — sent when a paying Pro emails their referral link to a friend
export async function sendReferralInviteEmail(
  to: string,
  fromName: string,
  referralLink: string,
  personalNote?: string,
) {
  const noteHtml = personalNote
    ? `<div style="background:#fafaf9;border-left:3px solid #065f46;padding:12px 16px;margin:16px 0;color:#44403c;font-size:14px;line-height:1.5;white-space:pre-wrap;">${personalNote.replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]!))}</div>`
    : '';

  return resend.emails.send({
    from: getFromEmail(),
    to,
    subject: `${fromName} sent you an invite to Stack Ritual 🌿`,
    html: `
      <!DOCTYPE html>
      <html>
      <body style="font-family: -apple-system, sans-serif; background: #fafaf9; padding: 20px;">
        <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; border: 1px solid #e7e5e4;">
          <div style="background: #065f46; padding: 24px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 20px;">🌿 Stack Ritual</h1>
          </div>
          <div style="padding: 24px;">
            <h2 style="color: #1c1917; margin-top: 0; font-size: 18px;">${fromName} thinks you'd like Stack Ritual</h2>
            <p style="color: #44403c; line-height: 1.6; font-size: 14px;">
              Stack Ritual helps you track and time your supplements, log how you feel, and build a consistent wellness routine.
            </p>
            ${noteHtml}
            <a href="${referralLink}" style="display: block; background: #065f46; color: white; text-align: center; padding: 14px; border-radius: 12px; text-decoration: none; font-weight: 600; margin-top: 16px;">
              Check out Stack Ritual →
            </a>
            <p style="color: #a8a29e; font-size: 11px; text-align: center; margin-top: 12px; margin-bottom: 0;">
              This invite was sent by ${fromName}. The link above credits them if you sign up for Pro.
            </p>
          </div>
          <div style="background: #fafaf9; padding: 16px; text-align: center; border-top: 1px solid #e7e5e4;">
            <p style="color: #a8a29e; font-size: 11px; margin: 0;">
              ⚕️ Nothing on Stack Ritual constitutes medical advice. Always consult your doctor.<br>
              stackritual.com
            </p>
          </div>
        </div>
      </body>
      </html>
    `,
  });
}
