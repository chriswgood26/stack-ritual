"use client";

import { useEffect, useState } from "react";

interface RoadmapItem {
  id: string;
  title: string;
  description: string | null;
  status: "idea" | "vetted" | "in_progress" | "done";
  created_at: string;
}

const STATUS_LABELS: Record<RoadmapItem["status"], string> = {
  idea: "💡 Idea",
  vetted: "✓ Vetted",
  in_progress: "🚧 In Progress",
  done: "✅ Done",
};

const STATUS_ORDER: RoadmapItem["status"][] = ["in_progress", "vetted", "idea", "done"];

const STATUS_BADGE: Record<RoadmapItem["status"], string> = {
  idea: "bg-stone-700 text-stone-300",
  vetted: "bg-emerald-900 text-emerald-300",
  in_progress: "bg-amber-900 text-amber-300",
  done: "bg-emerald-700 text-emerald-100",
};

export default function RoadmapManager() {
  const [items, setItems] = useState<RoadmapItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");

  async function load() {
    try {
      const res = await fetch("/api/admin/roadmap", { credentials: "include" });
      const data = await res.json();
      setItems(data.items || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  useEffect(() => {
    function handleRoadmapUpdate() { load(); }
    window.addEventListener("sr:roadmap-updated", handleRoadmapUpdate);
    return () => window.removeEventListener("sr:roadmap-updated", handleRoadmapUpdate);
  }, []);

  async function add() {
    if (!title.trim()) return;
    setAdding(true);
    setError("");
    const res = await fetch("/api/admin/roadmap", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description }),
    });
    if (res.ok) {
      setTitle("");
      setDescription("");
      await load();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Failed to add");
    }
    setAdding(false);
  }

  async function updateStatus(id: string, status: RoadmapItem["status"]) {
    setItems(prev => prev.map(i => i.id === id ? { ...i, status } : i));
    await fetch(`/api/admin/roadmap/${id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
  }

  function startEdit(item: RoadmapItem) {
    setEditingId(item.id);
    setEditTitle(item.title);
    setEditDescription(item.description || "");
  }

  function cancelEdit() {
    setEditingId(null);
    setEditTitle("");
    setEditDescription("");
  }

  async function saveEdit(id: string) {
    if (!editTitle.trim()) return;
    const newTitle = editTitle.trim();
    const newDescription = editDescription.trim() || null;
    setItems(prev => prev.map(i => i.id === id ? { ...i, title: newTitle, description: newDescription } : i));
    setEditingId(null);
    await fetch(`/api/admin/roadmap/${id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTitle, description: newDescription }),
    });
  }

  async function remove(id: string) {
    if (!confirm("Remove this roadmap item?")) return;
    setItems(prev => prev.filter(i => i.id !== id));
    await fetch(`/api/admin/roadmap/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
  }

  const grouped = STATUS_ORDER.map(status => ({
    status,
    items: items.filter(i => i.status === status),
  })).filter(g => g.items.length > 0);

  return (
    <div className="bg-stone-800 rounded-2xl border border-amber-700/50 overflow-hidden">
      <div className="px-6 py-4 border-b border-stone-700 flex items-center justify-between">
        <div>
          <span className="font-bold text-white text-xl">Roadmap</span>
          <span className="ml-3 text-xs bg-amber-900 text-amber-300 px-2.5 py-1 rounded-full font-semibold">
            {items.length} item{items.length === 1 ? "" : "s"}
          </span>
        </div>
      </div>

      {/* Add form */}
      <div className="px-6 py-4 border-b border-stone-700 bg-stone-900/50 space-y-2">
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Jot an idea (e.g. Streak freeze, family sharing, etc.)"
          className="w-full bg-stone-800 border border-stone-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-emerald-600"
        />
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Optional notes / context / why it matters..."
          rows={2}
          className="w-full bg-stone-800 border border-stone-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-emerald-600 resize-none"
        />
        <div className="flex items-center justify-between">
          <p className="text-[11px] text-stone-500">New items start as 💡 Idea — vet them before promoting.</p>
          <button
            onClick={add}
            disabled={adding || !title.trim()}
            className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold px-4 py-2 rounded-lg disabled:opacity-50 transition-colors"
          >
            {adding ? "Adding..." : "Add to roadmap"}
          </button>
        </div>
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>

      {/* Items grouped by status */}
      <div className="divide-y divide-stone-700">
        {loading && <div className="px-6 py-6 text-center text-stone-500 text-sm">Loading...</div>}
        {!loading && items.length === 0 && (
          <div className="px-6 py-6 text-center text-stone-500 text-sm">No roadmap items yet. Jot one above.</div>
        )}
        {grouped.map(group => (
          <div key={group.status} className="px-6 py-4">
            <div className="flex items-center gap-2 mb-3">
              <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded ${STATUS_BADGE[group.status]}`}>
                {STATUS_LABELS[group.status]}
              </span>
              <span className="text-stone-500 text-xs">{group.items.length}</span>
            </div>
            <ul className="space-y-2">
              {group.items.map(item => (
                <li key={item.id} className="bg-stone-900/40 border border-stone-700 rounded-xl px-4 py-3">
                  {editingId === item.id ? (
                    <div className="space-y-2">
                      <input
                        value={editTitle}
                        onChange={e => setEditTitle(e.target.value)}
                        className="w-full bg-stone-800 border border-stone-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
                        autoFocus
                      />
                      <textarea
                        value={editDescription}
                        onChange={e => setEditDescription(e.target.value)}
                        placeholder="Description (optional)"
                        rows={2}
                        className="w-full bg-stone-800 border border-stone-700 rounded-lg px-3 py-2 text-xs text-white placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-emerald-600 resize-none"
                      />
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={cancelEdit}
                          className="text-xs border border-stone-700 text-stone-400 px-3 py-1 rounded-lg hover:bg-stone-800"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => saveEdit(item.id)}
                          disabled={!editTitle.trim()}
                          className="text-xs bg-emerald-700 hover:bg-emerald-600 text-white px-3 py-1 rounded-lg disabled:opacity-50"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-stone-200 font-medium">{item.title}</p>
                        {item.description && <p className="text-xs text-stone-400 mt-1 whitespace-pre-wrap">{item.description}</p>}
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => startEdit(item)}
                          className="text-stone-500 hover:text-emerald-400 text-sm px-1.5"
                          title="Edit"
                        >
                          ✏️
                        </button>
                        <select
                          value={item.status}
                          onChange={e => updateStatus(item.id, e.target.value as RoadmapItem["status"])}
                          className="bg-stone-800 border border-stone-700 text-stone-300 text-xs rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                        >
                          <option value="idea">💡 Idea</option>
                          <option value="vetted">✓ Vetted</option>
                          <option value="in_progress">🚧 In Progress</option>
                          <option value="done">✅ Done</option>
                        </select>
                        <button
                          onClick={() => remove(item.id)}
                          className="text-stone-500 hover:text-red-400 text-sm px-1.5"
                          title="Remove"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
