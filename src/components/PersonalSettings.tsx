"use client";

import { useState } from "react";

type Props = {
  initial: {
    sex: "male" | "female" | null;
    birth_month: number | null;
    birth_day: number | null;
    birth_year: number | null;
  };
};

export default function PersonalSettings({ initial }: Props) {
  const [sex, setSex] = useState<"" | "male" | "female">(initial.sex ?? "");
  const [birthMonth, setBirthMonth] = useState(initial.birth_month != null ? String(initial.birth_month) : "");
  const [birthDay, setBirthDay] = useState(initial.birth_day != null ? String(initial.birth_day) : "");
  const [birthYear, setBirthYear] = useState(initial.birth_year != null ? String(initial.birth_year) : "");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  function parseIntOrNull(s: string): number | null {
    if (!s.trim()) return null;
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  }

  async function handleSave() {
    if (saving) return;
    setSaving(true);
    setStatus("idle");
    setErrorMsg(null);
    try {
      const res = await fetch("/api/profile/demographics", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sex: sex === "" ? null : sex,
          birth_month: parseIntOrNull(birthMonth),
          birth_day: parseIntOrNull(birthDay),
          birth_year: parseIntOrNull(birthYear),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      setStatus("saved");
    } catch (e) {
      setStatus("error");
      setErrorMsg(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-white border border-stone-200 rounded-2xl p-5">
      <h3 className="font-semibold text-stone-900">Personal</h3>
      <p className="mt-1 text-xs text-stone-500">
        Optional — used to personalize your stack analysis and to send you a happy birthday note.
      </p>

      <label className="mt-4 block text-sm">
        <span className="text-stone-700">Biological sex</span>
        <select
          value={sex}
          onChange={e => setSex(e.target.value as "" | "male" | "female")}
          className="mt-1 block w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
        >
          <option value="">Prefer not to say</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
        </select>
      </label>

      <div className="mt-3">
        <span className="text-sm text-stone-700">Birthday</span>
        <div className="mt-1 grid grid-cols-3 gap-2">
          <input
            type="number"
            min={1}
            max={12}
            placeholder="MM"
            value={birthMonth}
            onChange={e => setBirthMonth(e.target.value)}
            className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
          />
          <input
            type="number"
            min={1}
            max={31}
            placeholder="DD"
            value={birthDay}
            onChange={e => setBirthDay(e.target.value)}
            className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
          />
          <input
            type="number"
            min={1900}
            max={2026}
            placeholder="YYYY"
            value={birthYear}
            onChange={e => setBirthYear(e.target.value)}
            className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
          />
        </div>
        <p className="mt-1 text-xs text-stone-500">
          Year unlocks age-personalized stack analysis. Leave blank for celebration only.
        </p>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white disabled:bg-stone-300"
        >
          {saving ? "Saving..." : "Save"}
        </button>
        {status === "saved" ? <span className="text-xs text-emerald-700">Saved.</span> : null}
        {status === "error" ? <span className="text-xs text-red-600">{errorMsg}</span> : null}
      </div>
    </div>
  );
}
