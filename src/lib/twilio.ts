import twilio from 'twilio';
import { supabaseAdmin } from './supabase';

// Lazy-init so missing env vars don't crash the build
let _client: ReturnType<typeof twilio> | null = null;
function getClient() {
  if (_client) return _client;
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) return null;
  _client = twilio(sid, token);
  return _client;
}

export const TWILIO_PHONE = process.env.TWILIO_PHONE_NUMBER || "";
export const TWILIO_MESSAGING_SERVICE_SID = process.env.TWILIO_MESSAGING_SERVICE_SID || "";

type SendKind = "reminder" | "confirmation" | "welcome" | "test" | "help" | "stop_ack";

interface SendOpts {
  kind: SendKind;
  userId?: string;
}

interface SendResult {
  ok: boolean;
  sid?: string;
  error?: string;
  errorCode?: string;
}

/**
 * Send an SMS and log the attempt to sms_logs.
 * Prefers Messaging Service SID (required for reliable A2P 10DLC routing);
 * falls back to raw From phone number if the service SID isn't configured.
 */
export async function sendSMS(to: string, body: string, opts: SendOpts): Promise<SendResult> {
  const client = getClient();
  if (!client) {
    await logSms({ to, body, ...opts, status: "failed", errorMessage: "Twilio not configured" });
    return { ok: false, error: "Twilio not configured" };
  }

  const sendParams: Record<string, string> = { body, to };
  if (TWILIO_MESSAGING_SERVICE_SID) {
    sendParams.messagingServiceSid = TWILIO_MESSAGING_SERVICE_SID;
  } else if (TWILIO_PHONE) {
    sendParams.from = TWILIO_PHONE;
  } else {
    await logSms({ to, body, ...opts, status: "failed", errorMessage: "No Twilio sender configured" });
    return { ok: false, error: "No Twilio sender configured" };
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const message = await client.messages.create(sendParams as any);
    await logSms({ to, body, ...opts, twilioSid: message.sid, status: message.status });
    return { ok: true, sid: message.sid };
  } catch (e) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const err = e as any;
    await logSms({
      to,
      body,
      ...opts,
      status: "failed",
      errorCode: err?.code ? String(err.code) : undefined,
      errorMessage: err?.message || "Unknown error",
    });
    return { ok: false, error: err?.message || "Unknown", errorCode: err?.code ? String(err.code) : undefined };
  }
}

interface LogParams {
  to: string;
  body: string;
  kind: SendKind;
  userId?: string;
  twilioSid?: string;
  status?: string;
  errorCode?: string;
  errorMessage?: string;
}

async function logSms(p: LogParams) {
  try {
    await supabaseAdmin.from("sms_logs").insert({
      user_id: p.userId || null,
      to_phone: p.to,
      body: p.body,
      kind: p.kind,
      twilio_sid: p.twilioSid || null,
      status: p.status || null,
      error_code: p.errorCode || null,
      error_message: p.errorMessage || null,
    });
  } catch (e) {
    console.error("Failed to log SMS:", e);
  }
}
