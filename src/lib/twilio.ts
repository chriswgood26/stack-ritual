import twilio from 'twilio';

export const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
);

export const TWILIO_PHONE = process.env.TWILIO_PHONE_NUMBER!;

export async function sendSMS(to: string, body: string) {
  return twilioClient.messages.create({
    body,
    from: TWILIO_PHONE,
    to,
  });
}
