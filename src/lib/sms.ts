// Single source of truth for SMS consent language so the text shown in the
// opt-in modal matches the text we store as proof-of-consent for TCPA audits.
export const SMS_CONSENT_TEXT =
  "I agree to receive recurring automated text message reminders from Stack Ritual at the phone number above. Consent is not a condition of purchase. Message frequency varies by my reminder settings. Msg & data rates may apply. Reply STOP to unsubscribe, HELP for help.";

// SMS reviewer allowlist — until the A2P 10DLC campaign is approved, the
// global NEXT_PUBLIC_SMS_ENABLED flag is off. This bypass lets specific
// reviewer accounts (e.g. Twilio CTA verification) reach the live opt-in
// form so they can verify it without us flipping SMS on for everyone.
export function isSmsReviewer(email: string | null | undefined): boolean {
  if (!email) return false;
  const list = (process.env.SMS_REVIEWER_EMAILS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(email.toLowerCase());
}
