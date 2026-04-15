"use client";

import { useState, useEffect } from "react";

interface EmailPrefs {
  email_reminders_enabled: boolean;
  email_consolidated_summary: boolean;
  email_weekly_summary: boolean;
  email_marketing: boolean;
}

export default function EmailSettings({ isPlusOrPro }: { isPlusOrPro: boolean }) {
  const [open, setOpen] = useState(false);
  const [prefs, setPrefs] = useState<EmailPrefs>({
    email_reminders_enabled: false,
    email_consolidated_summary: false,
    email_weekly_summary: true,
    email_marketing: false,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (open) {
      fetch("/api/email/settings")
        .then(r => r.json())
        .then(d => { if (d.settings) setPrefs(prev => ({ ...prev, ...d.settings })); });
    }
  }, [open]);

  async function handleSave() {
    setSaving(true);
    const res = await fetch("/api/email/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(prefs),
    });
    if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 2000); }
    setSaving(false);
  }

  const Toggle = ({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) => (
    <button onClick={() => onChange(!value)}
      className={`w-12 h-6 rounded-full transition-colors flex-shrink-0 ${value ? "bg-emerald-600" : "bg-stone-300"}`}>
      <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform mx-0.5 ${value ? "translate-x-6" : "translate-x-0"}`} />
    </button>
  );

  return (
    <>
      <button onClick={() => setOpen(true)}
        className="flex items-center justify-between px-4 py-4 w-full hover:bg-stone-50 transition-colors">
        <div className="flex items-center gap-3">
          <span className="text-xl">✉️</span>
          <span className="font-medium text-stone-900 text-sm">Email preferences</span>
        </div>
        <span className="text-stone-300">›</span>
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center p-4 pb-8">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-stone-900">Email Preferences</h2>
              <button onClick={() => setOpen(false)} className="text-stone-400 hover:text-stone-700 text-xl">✕</button>
            </div>

            <div className="space-y-1">
              {/* Daily reminders */}
              <div className={`flex items-start justify-between bg-stone-50 rounded-xl px-4 py-3 ${!isPlusOrPro ? "opacity-50" : ""}`}>
                <div className="flex-1 pr-4">
                  <div className="font-medium text-stone-900 text-sm">Daily reminders</div>
                  <div className="text-xs text-stone-500 mt-0.5">
                    {isPlusOrPro ? "Email when it's time to take your supplements" : "Plus & Pro feature"}
                  </div>
                </div>
                <Toggle
                  value={isPlusOrPro ? prefs.email_reminders_enabled : false}
                  onChange={v => isPlusOrPro && setPrefs(p => ({ ...p, email_reminders_enabled: v }))}
                />
              </div>

              {/* Consolidated daily summary (sub-option) */}
              {isPlusOrPro && prefs.email_reminders_enabled && (
                <div className="flex items-start justify-between bg-stone-50 rounded-xl px-4 py-3 ml-6">
                  <div className="flex-1 pr-4">
                    <div className="font-medium text-stone-900 text-sm">One summary email per day</div>
                    <div className="text-xs text-stone-500 mt-0.5">
                      Get a single morning email listing your whole day instead of one per timeframe
                    </div>
                  </div>
                  <Toggle
                    value={prefs.email_consolidated_summary}
                    onChange={v => setPrefs(p => ({ ...p, email_consolidated_summary: v }))}
                  />
                </div>
              )}

              {/* Weekly summary */}
              <div className={`flex items-start justify-between bg-stone-50 rounded-xl px-4 py-3 ${!isPlusOrPro ? "opacity-50" : ""}`}>
                <div className="flex-1 pr-4">
                  <div className="font-medium text-stone-900 text-sm">Weekly summary</div>
                  <div className="text-xs text-stone-500 mt-0.5">
                    {isPlusOrPro ? "Monday recap of your completion rate and streak" : "Plus & Pro feature"}
                  </div>
                </div>
                <Toggle
                  value={isPlusOrPro ? prefs.email_weekly_summary : false}
                  onChange={v => isPlusOrPro && setPrefs(p => ({ ...p, email_weekly_summary: v }))}
                />
              </div>

              {/* Marketing */}
              <div className="flex items-start justify-between bg-stone-50 rounded-xl px-4 py-3">
                <div className="flex-1 pr-4">
                  <div className="font-medium text-stone-900 text-sm">Tips & updates</div>
                  <div className="text-xs text-stone-500 mt-0.5">Supplement tips, new features, and health insights</div>
                </div>
                <Toggle
                  value={prefs.email_marketing}
                  onChange={v => setPrefs(p => ({ ...p, email_marketing: v }))}
                />
              </div>
            </div>

            <p className="text-xs text-stone-400 text-center">
              Emails come from hello@stackritual.com. You can unsubscribe anytime.
            </p>

            <div className="flex gap-3">
              <button onClick={() => setOpen(false)}
                className="flex-1 border border-stone-200 text-stone-600 py-3 rounded-xl font-medium text-sm hover:bg-stone-50 transition-colors">
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 bg-emerald-700 text-white py-3 rounded-xl font-semibold text-sm hover:bg-emerald-800 transition-colors disabled:opacity-60">
                {saving ? "Saving..." : saved ? "✓ Saved!" : "Save preferences"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
