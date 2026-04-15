"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface PendingItem {
  id: string;
  title: string;
  description: string | null;
}

const LABEL_PRESETS = [
  { value: "", label: "(no label)", color: "" },
  { value: "Latest", label: "Latest", color: "bg-emerald-100 text-emerald-700" },
  { value: "Launch", label: "Launch", color: "bg-blue-100 text-blue-700" },
  { value: "Hotfix", label: "Hotfix", color: "bg-amber-100 text-amber-700" },
];

export default function CutReleaseButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<PendingItem[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [version, setVersion] = useState("");
  const [date, setDate] = useState("");
  const [label, setLabel] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function openModal() {
    setOpen(true);
    setError("");
    setLoading(true);
    const r = await fetch("/api/admin/releases/pending", { credentials: "include" });
    const d = await r.json();
    const list: PendingItem[] = d.items || [];
    setItems(list);
    setSelected(new Set(list.map(i => i.id)));
    setVersion(d.suggestedVersion || "");
    setDate(new Date().toISOString().slice(0, 10));
    setLoading(false);
  }

  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }

  async function cut() {
    setError("");
    if (!version.trim()) return setError("Version required");
    if (!date) return setError("Date required");
    if (selected.size === 0) return setError("Select at least one item");

    setSaving(true);
    const preset = LABEL_PRESETS.find(p => p.value === label);
    const r = await fetch("/api/admin/releases", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        version: version.trim(),
        released_at: date,
        label: preset?.value || null,
        label_color: preset?.color || null,
        item_ids: Array.from(selected),
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
              {loading ? (
                <p className="text-stone-400 text-sm text-center py-6">Loading…</p>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-stone-400 mb-1">Version</label>
                      <input
                        value={version}
                        onChange={e => setVersion(e.target.value)}
                        placeholder="v1.4"
                        className="w-full bg-stone-800 border border-stone-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-stone-400 mb-1">Release date</label>
                      <input
                        type="date"
                        value={date}
                        onChange={e => setDate(e.target.value)}
                        className="w-full bg-stone-800 border border-stone-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-stone-400 mb-1">Label</label>
                    <select
                      value={label}
                      onChange={e => setLabel(e.target.value)}
                      className="w-full bg-stone-800 border border-stone-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                    >
                      {LABEL_PRESETS.map(p => (
                        <option key={p.value} value={p.value}>{p.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs text-stone-400">
                        Items in this release ({selected.size}/{items.length})
                      </label>
                      <button
                        type="button"
                        onClick={() => setSelected(selected.size === items.length ? new Set() : new Set(items.map(i => i.id)))}
                        className="text-xs text-emerald-400 hover:text-emerald-300"
                      >
                        {selected.size === items.length ? "Deselect all" : "Select all"}
                      </button>
                    </div>
                    {items.length === 0 ? (
                      <p className="text-stone-500 text-sm text-center py-4 bg-stone-800 rounded-lg">
                        No done items waiting to be released. Mark items as ✅ Done first.
                      </p>
                    ) : (
                      <div className="bg-stone-800 border border-stone-700 rounded-lg divide-y divide-stone-700 max-h-72 overflow-y-auto">
                        {items.map(item => (
                          <label key={item.id} className="flex items-start gap-3 px-3 py-2 cursor-pointer hover:bg-stone-700/40">
                            <input
                              type="checkbox"
                              checked={selected.has(item.id)}
                              onChange={() => toggle(item.id)}
                              className="mt-1 accent-emerald-600"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm text-stone-200">{item.title}</div>
                              {item.description && (
                                <div className="text-xs text-stone-500 mt-0.5">{item.description}</div>
                              )}
                            </div>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>

                  {error && <p className="text-red-400 text-sm">{error}</p>}
                </>
              )}
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
                disabled={saving || loading || items.length === 0}
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
