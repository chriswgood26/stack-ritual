"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";

interface Template {
  id: string;
  sequence_order: number;
  name: string;
  subject: string;
  body_html: string;
  delay_days: number;
}
interface Enrollment {
  id: string;
  status: string;
  enrolled_at: string;
  subscriber: { id: string; email: string; unsubscribed_at: string | null } | null;
}
interface Campaign {
  id: string;
  name: string;
  type: string;
  is_active: boolean;
  sender_email: string;
  sender_name: string;
}

export default function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);

  // template form
  const [tName, setTName] = useState("");
  const [tSubject, setTSubject] = useState("");
  const [tBody, setTBody] = useState("");
  const [tDelay, setTDelay] = useState(0);
  const [tSaving, setTSaving] = useState(false);

  // enroll form
  const [enrollEmail, setEnrollEmail] = useState("");
  const [bulkSaving, setBulkSaving] = useState(false);
  const [bulkResult, setBulkResult] = useState("");

  async function load() {
    setLoading(true);
    const r = await fetch(`/api/admin/campaigns/${id}`, { credentials: "include" });
    const d = await r.json();
    setCampaign(d.campaign);
    setTemplates(d.templates || []);
    setEnrollments(d.enrollments || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function createTemplate() {
    if (!tName.trim() || !tSubject.trim() || !tBody.trim()) return;
    setTSaving(true);
    await fetch(`/api/admin/campaigns/${id}/templates`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: tName, subject: tSubject, body_html: tBody, delay_days: tDelay }),
    });
    setTName(""); setTSubject(""); setTBody(""); setTDelay(0);
    setTSaving(false);
    await load();
  }

  async function deleteTemplate(templateId: string) {
    if (!confirm("Delete this template?")) return;
    await fetch(`/api/admin/campaigns/${id}/templates/${templateId}`, { method: "DELETE", credentials: "include" });
    load();
  }

  async function enrollOne() {
    if (!enrollEmail.trim()) return;
    await fetch(`/api/admin/campaigns/${id}/enroll`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: enrollEmail.trim() }),
    });
    setEnrollEmail("");
    load();
  }

  async function enrollBulk() {
    setBulkSaving(true);
    setBulkResult("");
    const r = await fetch(`/api/admin/campaigns/${id}/enroll`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bulk: true }),
    });
    const d = await r.json();
    setBulkResult(d.added ? `Enrolled ${d.added} new subscribers` : "No new subscribers to enroll");
    setBulkSaving(false);
    load();
  }

  async function setEnrollmentStatus(enr: Enrollment, status: string) {
    await fetch(`/api/admin/campaigns/${id}/enroll`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enrollment_id: enr.id, status }),
    });
    load();
  }

  if (loading) return <p className="text-stone-400 text-sm">Loading…</p>;
  if (!campaign) return <p className="text-stone-400 text-sm">Campaign not found.</p>;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/campaigns" className="text-stone-400 text-sm hover:text-emerald-400">← All campaigns</Link>
        <h1 className="text-2xl font-bold text-white mt-2">{campaign.name}</h1>
        <p className="text-stone-400 text-sm">{campaign.type} · from {campaign.sender_name} &lt;{campaign.sender_email}&gt;</p>
      </div>

      {/* Templates */}
      <section className="bg-stone-800 border border-stone-700 rounded-2xl p-5">
        <h2 className="text-stone-200 font-semibold mb-3">Templates ({templates.length})</h2>
        {templates.length === 0 ? (
          <p className="text-stone-500 text-sm mb-4">No templates yet.</p>
        ) : (
          <div className="space-y-2 mb-5">
            {templates.map(t => (
              <div key={t.id} className="bg-stone-900 border border-stone-700 rounded-lg px-4 py-3 flex items-center justify-between">
                <div>
                  <div className="text-white text-sm font-medium">#{t.sequence_order} · {t.name}</div>
                  <div className="text-xs text-stone-500">{t.subject} · sent {t.delay_days} day{t.delay_days === 1 ? "" : "s"} after enrollment</div>
                </div>
                <button onClick={() => deleteTemplate(t.id)} className="text-stone-500 hover:text-red-400 text-sm">✕</button>
              </div>
            ))}
          </div>
        )}

        <div className="border-t border-stone-700 pt-4 space-y-2">
          <h3 className="text-stone-300 text-sm font-semibold">Add template</h3>
          <input
            value={tName}
            onChange={e => setTName(e.target.value)}
            placeholder="Internal name"
            className="w-full bg-stone-900 border border-stone-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-emerald-600"
          />
          <input
            value={tSubject}
            onChange={e => setTSubject(e.target.value)}
            placeholder="Email subject"
            className="w-full bg-stone-900 border border-stone-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-emerald-600"
          />
          <textarea
            value={tBody}
            onChange={e => setTBody(e.target.value)}
            placeholder="HTML body — use {{unsubscribe_url}} where you want the unsubscribe link"
            rows={8}
            className="w-full bg-stone-900 border border-stone-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-emerald-600 font-mono"
          />
          <div className="flex items-center gap-3">
            <label className="text-xs text-stone-400">Delay (days after enrollment):</label>
            <input
              type="number"
              min={0}
              value={tDelay}
              onChange={e => setTDelay(parseInt(e.target.value, 10) || 0)}
              className="w-20 bg-stone-900 border border-stone-700 text-white text-sm rounded-lg px-2 py-1"
            />
            <button
              onClick={createTemplate}
              disabled={tSaving}
              className="ml-auto bg-emerald-700 hover:bg-emerald-600 text-white text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-50"
            >
              {tSaving ? "Adding…" : "Add template"}
            </button>
          </div>
        </div>
      </section>

      {/* Enrollments */}
      <section className="bg-stone-800 border border-stone-700 rounded-2xl p-5">
        <h2 className="text-stone-200 font-semibold mb-3">Enrollments ({enrollments.length})</h2>

        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <input
            value={enrollEmail}
            onChange={e => setEnrollEmail(e.target.value)}
            placeholder="subscriber@example.com"
            className="flex-1 bg-stone-900 border border-stone-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-emerald-600"
          />
          <button
            onClick={enrollOne}
            disabled={!enrollEmail.trim()}
            className="bg-emerald-700 hover:bg-emerald-600 text-white text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-50"
          >
            Enroll one
          </button>
          <button
            onClick={enrollBulk}
            disabled={bulkSaving}
            className="bg-sky-700 hover:bg-sky-600 text-white text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-50"
          >
            {bulkSaving ? "Enrolling…" : "Enroll all subscribers"}
          </button>
        </div>
        {bulkResult && <p className="text-xs text-stone-400 mb-3">{bulkResult}</p>}

        {enrollments.length === 0 ? (
          <p className="text-stone-500 text-sm">No enrollments yet.</p>
        ) : (
          <div className="divide-y divide-stone-700 max-h-96 overflow-y-auto">
            {enrollments.map(e => (
              <div key={e.id} className="flex items-center justify-between py-2">
                <div className="text-sm text-stone-300">
                  {e.subscriber?.email || "(unknown)"}
                  {e.subscriber?.unsubscribed_at && (
                    <span className="ml-2 text-[10px] text-red-400">unsubscribed</span>
                  )}
                </div>
                <select
                  value={e.status}
                  onChange={ev => setEnrollmentStatus(e, ev.target.value)}
                  className="bg-stone-900 border border-stone-700 text-stone-300 text-xs rounded-lg px-2 py-1"
                >
                  <option value="active">active</option>
                  <option value="paused">paused</option>
                  <option value="completed">completed</option>
                  <option value="stopped">stopped</option>
                </select>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
