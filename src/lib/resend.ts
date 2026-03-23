import { Resend } from 'resend';

export const resend = new Resend(process.env.RESEND_API_KEY!);

export const FROM_EMAIL = 'Stack Ritual <hello@stackritual.com>';
export const FROM_EMAIL_FALLBACK = 'Stack Ritual <onboarding@resend.dev>';

export function getFromEmail() {
  // Use verified domain in production, fallback during verification
  return process.env.RESEND_DOMAIN_VERIFIED === 'true' 
    ? FROM_EMAIL 
    : FROM_EMAIL_FALLBACK;
}
