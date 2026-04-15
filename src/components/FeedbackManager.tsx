"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface FeedbackItem {
  id: string;
  user_id: string;
  rating: number | null;
  message: string;
  page: string | null;
  created_at: string;
  display_message: string | null;
  display_author: string | null;
  display_role: string | null;
  show_on_landing: boolean;
}

export default function FeedbackManager({ items }: { items: FeedbackItem[] }) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editMessage, setEditMessage] = useState("");
  const [editAuthor, setEditAuthor] = useState("");
  const [editRole, setEditRole] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  function startEdit(fb: FeedbackItem) {
    setEditingId(fb.id);
    setEditMessage(fb.display_message ?? fb.message);
    setEditAuthor(fb.display_author ?? "");
    setEditRole(fb.display_role ?? "");
  }

  async function saveEdit(id: string) {
    setBusyId(id);
    await fetch(`/api/admin/feedback/${id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        display_message: editMessage,
        display_author: editAuthor,
        display_role: editRole,
      }),
    });
    setEditingId(null);
    setBusyId(null);
    router.refresh();
  }

  async function toggleLanding(fb: FeedbackItem) {
    setBusyId(fb.id);
    await fetch(`/api/admin/feedback/${fb.id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ show_on_landing: !fb.show_on_landing }),
    });
    setBusyId(null);
    router.refresh();
  }

  async function remove(id: string) {
    if (!confirm("Delete this feedback?")) return;
    setBusyId(id);
    await fetch(`/api/admin/feedback/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    setBusyId(null);
    router.refresh();
  }

  if (items.length === 0) {
    return <div className="px-5 py-8 text-center text-stone-500 text-sm">No feedback yet</div>;
  }

  return (
    <div className="divide-y divide-stone-700">
      {items.map(fb => {
        const editing = editingId === fb.id;
        const busy = busyId === fb.id;
        const displayed = fb.display_message ?? fb.message;
        return (
          <div key={fb.id} className="px-5 py-4">
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <span className="text-amber-400">{"★".repeat(fb.rating || 0)}</span>
                <span className="text-xs text-stone-500">{new Date(fb.created_at).toLocaleDateString()}</span>
                {fb.show_on_landing && (
                  <span className="text-[10px] uppercase tracking-wider bg-emerald-700 text-emerald-100 px-2 py-0.5 rounded-full">On landing</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleLanding(fb)}
                  disabled={busy}
                  className={`text-xs px-2 py-1 rounded-lg border transition-colors ${
                    fb.show_on_landing
                      ? "bg-emerald-900 border-emerald-700 text-emerald-200 hover:bg-emerald-800"
                      : "bg-stone-900 border-stone-700 text-stone-400 hover:border-emerald-600 hover:text-emerald-300"
                  }`}
                >
                  {fb.show_on_landing ? "✓ On landing" : "Add to landing"}
                </button>
                {!editing && (
                  <button
                    onClick={() => startEdit(fb)}
                    className="text-stone-500 hover:text-emerald-400 text-sm px-1.5"
                    title="Edit"
                  >
                    ✏️
                  </button>
                )}
                <button
                  onClick={() => remove(fb.id)}
                  disabled={busy}
                  className="text-stone-500 hover:text-red-400 text-sm px-1.5"
                  title="Delete"
                >
                  ✕
                </button>
              </div>
            </div>

            {editing ? (
              <div className="space-y-2">
                <textarea
                  value={editMessage}
                  onChange={e => setEditMessage(e.target.value)}
                  rows={3}
                  className="w-full bg-stone-900 border border-stone-700 text-stone-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                  placeholder="Edited testimonial text"
                />
                <div className="flex gap-2">
                  <input
                    value={editAuthor}
                    onChange={e => setEditAuthor(e.target.value)}
                    className="flex-1 bg-stone-900 border border-stone-700 text-stone-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                    placeholder="Display name (e.g. Sarah M.)"
                  />
                  <input
                    value={editRole}
                    onChange={e => setEditRole(e.target.value)}
                    className="flex-1 bg-stone-900 border border-stone-700 text-stone-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                    placeholder="Role / location (optional)"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => saveEdit(fb.id)}
                    disabled={busy}
                    className="bg-emerald-700 hover:bg-emerald-600 text-white text-xs px-3 py-1.5 rounded-lg font-medium disabled:opacity-50"
                  >
                    {busy ? "Saving..." : "Save"}
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="bg-stone-700 hover:bg-stone-600 text-stone-200 text-xs px-3 py-1.5 rounded-lg"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <p className="text-sm text-stone-300">{displayed}</p>
                {(fb.display_author || fb.display_role) && (
                  <p className="text-xs text-stone-500 mt-1">
                    — {fb.display_author || "Anonymous"}{fb.display_role ? `, ${fb.display_role}` : ""}
                  </p>
                )}
                {fb.display_message && fb.display_message !== fb.message && (
                  <p className="text-[11px] text-stone-600 mt-2 italic">Original: {fb.message}</p>
                )}
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
