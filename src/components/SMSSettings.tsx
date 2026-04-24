"use client";

import { useState, useEffect } from "react";
import { SMS_CONSENT_TEXT } from "@/lib/sms";

interface Settings {
  phone_number: string | null;
  sms_enabled: boolean;
  sms_morning_time: string;
  sms_afternoon_time: string;
  sms_evening_time: string;
  sms_bedtime_time: string;
  sms_opted_out: boolean;
  sms_confirmed: boolean;
  sms_consent_at: string | null;
}

export default function SMSSettings({ isPro, smsLive }: { isPro: boolean; smsLive: boolean }) {
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState<Settings>({
    phone_number: "",
    sms_enabled: false,
    sms_morning_time: "08:00",
    sms_afternoon_time: "13:00",
    sms_evening_time: "19:00",
    sms_bedtime_time: "21:00",
    sms_opted_out: false,
    sms_confirmed: false,
    sms_consent_at: null,
  });
  const [consent, setConsent] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [testing, setTesting] = useState(false);
  const [testStatus, setTestStatus] = useState("");

  useEffect(() => {
    if (open) {
      setError("");
      fetch("/api/sms/settings", { credentials: "include" })
        .then(r => r.json())
        .then(d => {
          if (d.settings) {
            setSettings(prev => ({ ...prev, ...d.settings }));
            // If user already consented previously, pre-check the box
            if (d.settings.sms_consent_at) setConsent(true);
          }
        });
    }
  }, [open]);

  async function handleSave() {
    setSaving(true);
    setError("");
    const res = await fetch("/api/sms/settings", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...settings, consent }),
    });
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      // Re-fetch to get new sms_confirmed state
      const refreshed = await fetch("/api/sms/settings", { credentials: "include" }).then(r => r.json());
      if (refreshed.settings) setSettings(prev => ({ ...prev, ...refreshed.settings }));
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Failed to save");
    }
    setSaving(false);
  }

  async function handleTest() {
    setTesting(true);
    setTestStatus("");
    const res = await fetch("/api/sms/test", {
      method: "POST",
      credentials: "include",
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setTestStatus("✓ Test sent! Check your phone.");
    } else {
      setTestStatus(`✗ ${data.error || "Failed to send test"}`);
    }
    setTesting(false);
    setTimeout(() => setTestStatus(""), 5000);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center justify-between px-4 py-4 w-full hover:bg-stone-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-xl">📱</span>
          <div className="text-left">
            <span className="font-medium text-stone-900 text-sm block">SMS Reminders</span>
            <span className="text-xs text-stone-400">
              {!isPro ? "Pro feature" : settings.sms_enabled ? "Enabled" : "Disabled"}
            </span>
          </div>
        </div>
        <span className="text-stone-300">›</span>
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center p-4 pb-8">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-stone-900">SMS Reminders</h2>
              <button onClick={() => setOpen(false)} className="text-stone-400 hover:text-stone-700 text-xl">✕</button>
            </div>

            {!isPro ? (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
                <div className="text-3xl mb-2">🚀</div>
                <p className="font-semibold text-stone-900 text-sm mb-1">Pro Feature</p>
                <p className="text-stone-500 text-sm">Upgrade to Pro to get SMS reminders with click-to-mark-done links.</p>
              </div>
            ) : !smsLive ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 text-center space-y-3">
                <div className="text-4xl">📱</div>
                <div>
                  <p className="font-semibold text-stone-900 text-sm">SMS Reminders — Coming Soon!</p>
                  <p className="text-stone-500 text-sm mt-1">We&apos;re finalizing carrier approval to send SMS reminders. You&apos;ll be notified by email as soon as it&apos;s ready.</p>
                </div>
                <div className="bg-white rounded-xl p-3 text-xs text-stone-600 text-left space-y-1">
                  <div className="flex items-center gap-2"><span className="text-emerald-600">✓</span> Daily reminder texts at your chosen times</div>
                  <div className="flex items-center gap-2"><span className="text-emerald-600">✓</span> Tap to mark your full stack done — no app needed</div>
                  <div className="flex items-center gap-2"><span className="text-emerald-600">✓</span> Custom times for each supplement slot</div>
                </div>
                <p className="text-xs text-stone-400">Expected availability: 2–3 weeks</p>
              </div>
            ) : settings.sms_opted_out ? (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-900">
                <p className="font-semibold mb-1">You&apos;ve unsubscribed from SMS.</p>
                <p className="text-xs">Reply <strong>START</strong> from your phone to {settings.phone_number || "your number"} to re-enable. Or contact support at hello@stackritual.com.</p>
              </div>
            ) : (
              <>
                {/* Enable toggle */}
                <div className="flex items-center justify-between bg-stone-50 rounded-xl px-4 py-3">
                  <div>
                    <div className="font-medium text-stone-900 text-sm">Enable SMS reminders</div>
                    <div className="text-xs text-stone-500">Receive texts when it&apos;s time to take your stack</div>
                  </div>
                  <button
                    onClick={() => setSettings(s => ({ ...s, sms_enabled: !s.sms_enabled }))}
                    className={`w-12 h-6 rounded-full transition-colors ${settings.sms_enabled ? "bg-emerald-600" : "bg-stone-300"}`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform mx-0.5 ${settings.sms_enabled ? "translate-x-6" : "translate-x-0"}`} />
                  </button>
                </div>

                {/* Phone number */}
                <div>
                  <label className="text-xs font-semibold text-stone-500 uppercase tracking-wide block mb-1.5">Phone Number</label>
                  <input
                    type="tel"
                    value={settings.phone_number || ""}
                    onChange={e => setSettings(s => ({ ...s, phone_number: e.target.value }))}
                    placeholder="+1 (555) 000-0000"
                    className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <p className="text-xs text-stone-400 mt-1">US numbers only.</p>
                </div>

                {/* TCPA Consent — required to enable */}
                {settings.sms_enabled && (
                  <label className="flex items-start gap-3 bg-stone-50 border border-stone-200 rounded-xl p-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={consent}
                      onChange={e => setConsent(e.target.checked)}
                      className="mt-0.5 w-4 h-4 accent-emerald-600 flex-shrink-0"
                    />
                    <span className="text-xs text-stone-600 leading-relaxed">
                      {SMS_CONSENT_TEXT} See our{" "}
                      <a href="/terms" target="_blank" className="text-emerald-700 underline">Terms</a> and{" "}
                      <a href="/privacy" target="_blank" className="text-emerald-700 underline">Privacy Policy</a>.
                    </span>
                  </label>
                )}

                {/* Reminder times */}
                {settings.sms_enabled && (
                  <div className="space-y-3">
                    <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide">Reminder Times</p>
                    {[
                      { key: "sms_morning_time", label: "🌅 Morning reminder" },
                      { key: "sms_afternoon_time", label: "🌤️ Afternoon reminder" },
                      { key: "sms_evening_time", label: "🌆 Evening reminder" },
                      { key: "sms_bedtime_time", label: "🌙 Bedtime reminder" },
                    ].map(({ key, label }) => (
                      <div key={key} className="flex items-center justify-between">
                        <span className="text-sm text-stone-700">{label}</span>
                        <input
                          type="time"
                          value={settings[key as keyof Settings] as string}
                          onChange={e => setSettings(s => ({ ...s, [key]: e.target.value }))}
                          className="border border-stone-200 rounded-lg px-3 py-1.5 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                    ))}
                  </div>
                )}

                {/* Confirmation status banner */}
                {settings.sms_enabled && settings.phone_number && !settings.sms_confirmed && settings.sms_consent_at && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900">
                    📲 We sent a confirmation text to {settings.phone_number}. Reply <strong>YES</strong> to start your reminders.
                  </div>
                )}

                {settings.sms_enabled && settings.sms_confirmed && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-800 space-y-2">
                    <div>✓ Your number is confirmed. Reminders will arrive at your chosen times.</div>
                    <button
                      onClick={handleTest}
                      disabled={testing}
                      className="w-full bg-white border border-emerald-300 text-emerald-700 py-2 rounded-lg text-xs font-semibold hover:bg-emerald-100 transition-colors disabled:opacity-50"
                    >
                      {testing ? "Sending..." : "Send test message"}
                    </button>
                    {testStatus && <div className="text-center">{testStatus}</div>}
                  </div>
                )}

                <p className="text-[11px] text-stone-400">
                  💡 Reply STOP to unsubscribe or HELP for help at any time. Msg &amp; data rates may apply.
                </p>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-xs text-red-700">{error}</div>
                )}

                <div className="flex gap-3">
                  <button onClick={() => setOpen(false)}
                    className="flex-1 border border-stone-200 text-stone-600 py-3 rounded-xl font-medium text-sm hover:bg-stone-50 transition-colors">
                    Cancel
                  </button>
                  <button onClick={handleSave} disabled={saving || (settings.sms_enabled && !consent)}
                    className="flex-1 bg-emerald-700 text-white py-3 rounded-xl font-semibold text-sm hover:bg-emerald-800 transition-colors disabled:opacity-60">
                    {saving ? "Saving..." : saved ? "✓ Saved!" : "Save settings"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
