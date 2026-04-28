import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { clerkClient } from "@clerk/nextjs/server";
import { sendBirthdayEmail } from "@/lib/emails";
import { userLocalHour } from "@/lib/birthday";

const CRON_SECRET = process.env.CRON_SECRET;

// Hourly cron. Sends a single birthday email per user per year.
// Sends when:
//   1. user has birth_month and birth_day set
//   2. timezone configured
//   3. their local hour is 8
//   4. their local month/day matches birth_month/birth_day
//   5. last_birthday_email_year is null or < current calendar year
// Year stamp updates only on successful send so a Resend outage retries next hour.

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ skipped: "no_resend_key" });
  }

  const now = new Date();
  const currentYear = now.getFullYear();

  // Pull candidates: birthday + timezone set, year stamp not yet this year.
  // Local-hour and local-date filtering happens per-row in JS (timezone math).
  const { data: rows, error } = await supabaseAdmin
    .from("user_profiles")
    .select("user_id, birth_month, birth_day, timezone, last_birthday_email_year, email_unsubscribed_all")
    .not("birth_month", "is", null)
    .not("birth_day", "is", null)
    .not("timezone", "is", null)
    .eq("email_unsubscribed_all", false)
    .or(`last_birthday_email_year.is.null,last_birthday_email_year.lt.${currentYear}`);

  if (error) {
    console.error("[cron/birthday-emails] supabase query failed", error);
    return NextResponse.json({ error: "query_failed" }, { status: 500 });
  }

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  const client = await clerkClient();

  for (const row of rows ?? []) {
    const tz = row.timezone as string;
    const localHour = userLocalHour(tz, now);
    if (localHour !== 8) {
      skipped++;
      continue;
    }
    const fmt = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      month: "numeric",
      day: "numeric",
    });
    const parts = Object.fromEntries(
      fmt.formatToParts(now).map(p => [p.type, p.value]),
    ) as Record<string, string>;
    const localMonth = Number(parts.month);
    const localDay = Number(parts.day);
    if (localMonth !== row.birth_month || localDay !== row.birth_day) {
      skipped++;
      continue;
    }

    let email: string | undefined;
    let firstName = "";
    try {
      const user = await client.users.getUser(row.user_id as string);
      email = user.emailAddresses?.[0]?.emailAddress;
      firstName = user.firstName || "";
    } catch (e) {
      console.error("[cron/birthday-emails] clerk lookup failed", row.user_id, e);
      failed++;
      continue;
    }

    if (!email) {
      skipped++;
      continue;
    }

    try {
      await sendBirthdayEmail(email, firstName);
      const { error: updateErr } = await supabaseAdmin
        .from("user_profiles")
        .update({ last_birthday_email_year: currentYear })
        .eq("user_id", row.user_id);
      if (updateErr) {
        console.error("[cron/birthday-emails] year stamp update failed", row.user_id, updateErr);
      }
      sent++;
    } catch (e) {
      console.error("[cron/birthday-emails] send failed", row.user_id, e);
      failed++;
    }
  }

  console.log(`[cron/birthday-emails] hour=${now.toISOString()} sent=${sent} skipped=${skipped} failed=${failed}`);
  return NextResponse.json({ sent, skipped, failed });
}
