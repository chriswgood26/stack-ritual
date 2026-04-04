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
              ✓ Mark all done
            </a>
            <p style="color: #a8a29e; font-size: 12px; text-align: center; margin-top: 16px;">
              <a href="https://stackritual.com/dashboard" style="color: #a8a29e;">Open app</a> · 
              <a href="https://stackritual.com/dashboard/profile" style="color: #a8a29e;">Manage settings</a>
            </p>
          </div>
          <div style="background: #fafaf9; padding: 16px; text-align: center; border-top: 1px solid #e7e5e4;">
            <p style="color: #a8a29e; font-size: 11px; margin: 0;">
              <a href="sms:?body=Check%20out%20Stack%20Ritual%20%E2%80%94%20it%20helps%20you%20track%20and%20time%20your%20supplements.%20https%3A%2F%2Fstackritual.com" style="color: #065f46; font-weight: 600; text-decoration: none;">Love Stack Ritual? Share the app with a friend.</a><br><br>
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
              <a href="sms:?body=Check%20out%20Stack%20Ritual%20%E2%80%94%20it%20helps%20you%20track%20and%20time%20your%20supplements.%20https%3A%2F%2Fstackritual.com" style="color: #065f46; font-weight: 600; text-decoration: none;">Love Stack Ritual? Share the app with a friend.</a><br><br>
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
