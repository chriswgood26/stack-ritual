"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const LABEL_PRESETS = [
  { value: "", label: "(no label)", color: "" },
  { value: "Latest", label: "Latest", color: "bg-emerald-100 text-emerald-700" },
  { value: "Launch", label: "Launch", color: "bg-blue-100 text-blue-700" },
  { value: "Hotfix", label: "Hotfix", color: "bg-amber-100 text-amber-700" },
];

export default function CutReleaseButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [version, setVersion] = useState("");
  const [date, setDate] = useState("");
  const [label, setLabel] = useState("");
  const [featuresText, setFeaturesText] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function openModal() {
    setOpen(true);
    setError("");
    setVersion("");
    setDate(new Date().toISOString().slice(0, 10));
    setLabel("");
    setFeaturesText("");
  }

  async function cut() {
    setError("");
    if (!version.trim()) return setError("Version required");
    if (!date) return setError("Date required");

    const features = featuresText
      .split("\n")
      .map((line) => line.replace(/^[-*•·]\s*/, "").trim())
      .filter(Boolean);

    if (features.length === 0) return setError("Add at least one feature");

    setSaving(true);
    const preset = LABEL_PRESETS.find((p) => p.value === label);
    const r = await fetch("/api/admin/releases", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        version: version.trim(),
        released_at: date,
        label: preset?.value || null,
        label_color: preset?.color || null,
        features,
      }),
    });
    const d = await r.json();
    setSaving(false);

    if (!r.ok) {
      setError(d.error || "Failed to cut release");
      return;
    }
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <button
        onClick={openModal}
        className="bg-emerald-700 hover:bg-emerald-600 text-white text-sm font-semibold px-4 py-2 rounded-lg"
      >
        🚀 Cut Release
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-stone-700 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-stone-700 flex items-center justify-between">
              <h2 className="text-white font-bold">Cut Release</h2>
              <button onClick={() => setOpen(false)} className="text-stone-400 hover:text-white text-xl">✕</button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-stone-400 mb-1">Version</label>
                  <input
                    value={version}
                    onChange={(e) => setVersion(e.target.value)}
                    placeholder="v1.5"
                    className="w-full bg-stone-800 border border-stone-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                  />
                </div>
                <div>
                  <label className="block text-xs text-stone-400 mb-1">Release date</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-stone-800 border border-stone-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-stone-400 mb-1">Label</label>
                <select
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  className="w-full bg-stone-800 border border-stone-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                >
                  {LABEL_PRESETS.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-stone-400 mb-1">
                  Features (one per line)
                </label>
                <textarea
                  value={featuresText}
                  onChange={(e) => setFeaturesText(e.target.value)}
                  rows={10}
                  placeholder={"Pause toggle in edit modal\nProgress bar now excludes less-than-daily items\n..."}
                  className="w-full bg-stone-800 border border-stone-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-emerald-600 font-mono resize-y"
                />
                <p className="text-[11px] text-stone-500 mt-1">
                  Paste your release notes. Leading bullets or dashes are stripped automatically.
                </p>
              </div>

              {error && <p className="text-red-400 text-sm">{error}</p>}
            </div>

            <div className="px-6 py-4 border-t border-stone-700 flex justify-end gap-2">
              <button
                onClick={() => setOpen(false)}
                className="bg-stone-700 hover:bg-stone-600 text-stone-200 text-sm px-4 py-2 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={cut}
                disabled={saving}
                className="bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-lg"
              >
                {saving ? "Cutting…" : "Cut Release"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
