"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Campaign {
  id: string;
  name: string;
  type: string;
  is_active: boolean;
  sender_email: string;
  sender_name: string;
  templates: { id: string; sequence_order: number; name: string; subject: string; delay_days: number }[];
  enrollmentCounts: { active: number; total: number };
}

export default function CampaignsPage() {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<"drip" | "newsletter">("drip");
  const [creating, setCreating] = useState(false);
  const [subscriberCount, setSubscriberCount] = useState<number | null>(null);

  async function load() {
    setLoading(true);
    const r = await fetch("/api/admin/campaigns", { credentials: "include" });
    const d = await r.json();
    setCampaigns(d.campaigns || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    fetch("/api/admin/newsletter-count", { credentials: "include" })
      .then(r => (r.ok ? r.json() : { count: null }))
      .then(d => setSubscriberCount(d.count))
      .catch(() => {});
  }, []);

  async function create() {
    if (!newName.trim()) return;
    setCreating(true);
    await fetch("/api/admin/campaigns", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim(), type: newType }),
    });
    setNewName("");
    setCreating(false);
    await load();
  }

  async function toggleActive(c: Campaign) {
    await fetch(`/api/admin/campaigns/${c.id}`, {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !c.is_active }),
    });
    router.refresh();
    load();
  }

  async function remove(id: string) {
    if (!confirm("Delete this campaign and all its enrollments?")) return;
    await fetch(`/api/admin/campaigns/${id}`, { method: "DELETE", credentials: "include" });
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Newsletter &amp; Campaigns</h1>
        {subscriberCount !== null && (
          <span className="text-stone-400 text-sm">
            {subscriberCount} active subscriber{subscriberCount === 1 ? "" : "s"}
          </span>
        )}
      </div>

      <div className="bg-stone-800 border border-stone-700 rounded-2xl p-5 mb-6">
        <h2 className="text-stone-300 font-semibold mb-3">New campaign</h2>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="Campaign name"
            className="flex-1 bg-stone-900 border border-stone-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-emerald-600"
          />
          <select
            value={newType}
            onChange={e => setNewType(e.target.value as "drip" | "newsletter")}
            className="bg-stone-900 border border-stone-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-emerald-600"
          >
            <option value="drip">Drip</option>
            <option value="newsletter">Newsletter</option>
          </select>
          <button
            onClick={create}
            disabled={creating || !newName.trim()}
            className="bg-emerald-700 hover:bg-emerald-600 text-white text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-50"
          >
            {creating ? "Creating…" : "Create"}
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-stone-400 text-sm">Loading…</p>
      ) : campaigns.length === 0 ? (
        <p className="text-stone-500 text-sm">No campaigns yet.</p>
      ) : (
        <div className="space-y-3">
          {campaigns.map(c => (
            <div key={c.id} className="bg-stone-800 border border-stone-700 rounded-xl p-4">
              <div className="flex items-center justify-between gap-3 mb-2">
                <Link href={`/admin/campaigns/${c.id}`} className="text-white font-semibold hover:text-emerald-400">
                  {c.name}
                </Link>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full ${
                    c.type === "drip" ? "bg-sky-900 text-sky-300" : "bg-amber-900 text-amber-300"
                  }`}>{c.type}</span>
                  <button
                    onClick={() => toggleActive(c)}
                    className={`text-xs px-2 py-1 rounded-lg border ${
                      c.is_active
                        ? "bg-emerald-900 border-emerald-700 text-emerald-200"
                        : "bg-stone-900 border-stone-700 text-stone-400"
                    }`}
                  >
                    {c.is_active ? "Active" : "Paused"}
                  </button>
                  <button onClick={() => remove(c.id)} className="text-stone-500 hover:text-red-400 text-sm">✕</button>
                </div>
              </div>
              <div className="text-xs text-stone-400">
                {c.templates.length} template{c.templates.length === 1 ? "" : "s"} ·{" "}
                {c.enrollmentCounts.active}/{c.enrollmentCounts.total} active enrollments
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
