"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Submission {
  id: string;
  name: string;
  category: string | null;
  icon: string | null;
  tagline: string | null;
  dose: string | null;
  timing: string | null;
  brand: string | null;
}

export default function EditSubmissionButton({ submission }: { submission: Submission }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: submission.name,
    category: submission.category || "other",
    icon: submission.icon || "💊",
    tagline: submission.tagline || "",
    dose: submission.dose || "",
    timing: submission.timing || "",
    brand: submission.brand || "",
  });
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  async function handleSave() {
    setSaving(true);
    await fetch("/api/admin/action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId: submission.id, table: "user_submitted_supplements", action: "edit", updates: form }),
    });
    setOpen(false);
    router.refresh();
    setSaving(false);
  }

  return (
    <>
      <button onClick={() => setOpen(true)}
        className="text-xs bg-stone-600 hover:bg-stone-500 text-stone-200 px-3 py-1.5 rounded-lg font-medium transition-colors">
        ✏️ Edit
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-stone-800 rounded-2xl w-full max-w-lg p-6 space-y-4 border border-stone-700">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-white">Edit Submission</h2>
              <button onClick={() => setOpen(false)} className="text-stone-400 hover:text-white text-xl">✕</button>
            </div>

            {[
              { key: "name", label: "Name", placeholder: "Supplement name" },
              { key: "icon", label: "Icon (emoji)", placeholder: "💊" },
              { key: "category", label: "Category", placeholder: "vitamins, minerals, etc." },
              { key: "tagline", label: "Tagline", placeholder: "Short benefit description" },
              { key: "dose", label: "Dose", placeholder: "e.g. 500mg" },
              { key: "timing", label: "Timing", placeholder: "e.g. Morning with food" },
              { key: "brand", label: "Brand", placeholder: "Optional" },
            ].map(({ key, label, placeholder }) => (
              <div key={key}>
                <label className="text-xs font-semibold text-stone-400 uppercase tracking-wide block mb-1">{label}</label>
                <input
                  type="text"
                  value={form[key as keyof typeof form]}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  placeholder={placeholder}
                  className="w-full bg-stone-700 border border-stone-600 rounded-xl px-4 py-2.5 text-white placeholder-stone-400 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            ))}

            <div className="flex gap-3 pt-2">
              <button onClick={() => setOpen(false)}
                className="flex-1 border border-stone-600 text-stone-300 py-2.5 rounded-xl text-sm font-medium hover:bg-stone-700 transition-colors">
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 bg-emerald-700 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-emerald-600 transition-colors disabled:opacity-50">
                {saving ? "Saving..." : "Save changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
