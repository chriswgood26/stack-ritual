"use client";

import { useState, useCallback } from "react";

interface Props {
  date: string;
  initialScore?: number | null;
  initialNotes?: string | null;
}

const moodEmoji = (score: number) => {
  if (score <= 2) return "😞";
  if (score <= 4) return "😕";
  if (score <= 6) return "😐";
  if (score <= 8) return "🙂";
  return "😁";
};

const moodLabel = (score: number) => {
  if (score <= 2) return "Rough day";
  if (score <= 4) return "Not great";
  if (score <= 6) return "Okay";
  if (score <= 8) return "Pretty good";
  return "Amazing!";
};

const moodColor = (score: number) => {
  if (score <= 2) return "text-red-500";
  if (score <= 4) return "text-orange-400";
  if (score <= 6) return "text-yellow-500";
  if (score <= 8) return "text-emerald-500";
  return "text-emerald-600";
};

export default function MoodSlider({ date, initialScore, initialNotes }: Props) {
  const [score, setScore] = useState(initialScore || 5);
  const [notes, setNotes] = useState(initialNotes || "");
  const [saved, setSaved] = useState(!!initialScore);
  const [saving, setSaving] = useState(false);

  const handleChange = useCallback((val: number) => {
    setScore(val);
    setSaved(false);
  }, []);

  async function handleSave() {
    setSaving(true);
    const res = await fetch("/api/mood", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mood_score: score, date, notes: notes.trim() || null }),
    });
    if (res.ok) setSaved(true);
    setSaving(false);
  }

  return (
    <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5">
      {/* Header row — question + emoji + score + saved */}
      <div className="flex items-center gap-3 mb-4">
        <h3 className="font-semibold text-stone-900 text-sm flex-1">How have you felt today?</h3>
        <span className="text-2xl">{moodEmoji(score)}</span>
        <div className="text-right">
          <div className="text-lg font-bold text-stone-900 leading-none">{score}<span className="text-xs text-stone-400 font-normal">/10</span></div>
          <div className={`text-xs font-medium ${moodColor(score)} leading-none mt-0.5`}>{moodLabel(score)}</div>
        </div>
        {saved && <span className="text-xs text-emerald-600 font-medium whitespace-nowrap">✓ Saved</span>}
      </div>

      {/* Slider */}
      <div className="flex items-center gap-3 mb-4">
        <span className="text-2xl">😞</span>
        <input
          type="range"
          min={1}
          max={10}
          value={score}
          onChange={e => handleChange(Number(e.target.value))}
          className="flex-1 h-2 rounded-full appearance-none cursor-pointer accent-emerald-600"
          style={{
            background: `linear-gradient(to right, #059669 0%, #059669 ${(score - 1) / 9 * 100}%, #e7e5e4 ${(score - 1) / 9 * 100}%, #e7e5e4 100%)`
          }}
        />
        <span className="text-2xl">😁</span>
      </div>

      {/* Scale markers */}
      <div className="flex justify-between px-8 mb-4">
        {[1,2,3,4,5,6,7,8,9,10].map(n => (
          <span key={n} className={`text-xs ${n === score ? "text-emerald-600 font-bold" : "text-stone-300"}`}>{n}</span>
        ))}
      </div>

      {/* Notes */}
      <div className="mb-4">
        <textarea
          value={notes}
          onChange={e => { setNotes(e.target.value); setSaved(false); }}
          placeholder="Any notes about how you're feeling today? (optional)"
          rows={2}
          className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm text-stone-700 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
        />
      </div>

      {/* Save button */}
      {!saved && (
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-emerald-700 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-emerald-800 transition-colors disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save mood"}
        </button>
      )}
    </div>
  );
}
