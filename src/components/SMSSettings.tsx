"use client";

import { useState, useEffect } from "react";

interface Settings {
  phone_number: string | null;
  sms_enabled: boolean;
  sms_morning_time: string;
  sms_afternoon_time: string;
  sms_evening_time: string;
  sms_bedtime_time: string;
  sms_opted_out: boolean;
}

export default function SMSSettings({ isPro }: { isPro: boolean }) {
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState<Settings>({
    phone_number: "",
    sms_enabled: false,
    sms_morning_time: "08:00",
    sms_afternoon_time: "13:00",
    sms_evening_time: "19:00",
    sms_bedtime_time: "21:00",
    sms_opted_out: false,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (open) {
      fetch("/api/sms/settings")
        .then(r => r.json())
        .then(d => { if (d.settings) setSettings(prev => ({ ...prev, ...d.settings })); });
    }
  }, [open]);

  async function handleSave() {
    setSaving(true);
    const res = await fetch("/api/sms/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 2000); }
    setSaving(false);
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
                  <p className="text-xs text-stone-400 mt-1">US numbers only. Reply STOP to unsubscribe anytime.</p>
                </div>

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

                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-xs text-emerald-800">
                  💡 Each reminder includes a tap-to-complete link — mark your whole stack done without opening the app.
                </div>

                <div className="flex gap-3">
                  <button onClick={() => setOpen(false)}
                    className="flex-1 border border-stone-200 text-stone-600 py-3 rounded-xl font-medium text-sm hover:bg-stone-50 transition-colors">
                    Cancel
                  </button>
                  <button onClick={handleSave} disabled={saving}
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
