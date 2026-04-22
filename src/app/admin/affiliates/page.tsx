"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Affiliate {
  id: string;
  name: string;
  code: string;
  email: string | null;
  phone: string | null;
  first_month_percentage: number;
  recurring_percentage: number;
  status: string;
  total_paid?: number;
  referral_count?: number;
}

interface InterestItem {
  id: string;
  name: string;
  email: string;
  message: string | null;
  store_name: string | null;
  street_address: string | null;
  street_address_2: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  created_at: string;
}

function formatAddress(p: InterestItem): string | null {
  if (!p.street_address) return null;
  const line2 = p.street_address_2 ? `, ${p.street_address_2}` : "";
  const cityStateZip = [p.city, p.state, p.zip].filter(Boolean).join(", ");
  return `${p.street_address}${line2} · ${cityStateZip}`;
}

const INPUT_CLASS =
  "w-full bg-stone-900 border border-stone-700 rounded-lg px-3 py-2 text-sm text-white placeholder-stone-500 focus:outline-none focus:ring-1 focus:ring-emerald-500";

const PAYOUT_METHODS = [
  { value: "check", label: "Check" },
  { value: "zelle", label: "Zelle" },
  { value: "paypal", label: "PayPal" },
  { value: "venmo", label: "Venmo" },
  { value: "ach", label: "ACH" },
  { value: "other", label: "Other" },
];

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(amount);
}

export default function AffiliatesPage() {
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [pending, setPending] = useState<InterestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [actingOn, setActingOn] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "", code: "", email: "", phone: "",
    first_month_percentage: "50",
    recurring_percentage: "10",
    payout_method: "", payout_details: "", status: "active", notes: "",
  });

  useEffect(() => {
    Promise.all([
      fetch("/api/affiliates", { credentials: "include" }).then((r) => r.json()).then((d) => setAffiliates(d.affiliates || [])),
      fetch("/api/affiliates/interest", { credentials: "include" }).then((r) => r.json()).then((d) => setPending(d.items || [])),
    ]).finally(() => setLoading(false));
  }, []);

  async function handleInterest(id: string, action: "approve" | "reject") {
    if (action === "reject" && !confirm("Reject this application?")) return;
    setActingOn(id);
    const res = await fetch(`/api/affiliates/interest/${id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    if (res.ok) {
      setPending((prev) => prev.filter((p) => p.id !== id));
      if (action === "approve") {
        const data = await res.json();
        if (data.affiliate) {
          setAffiliates((prev) => [{ ...data.affiliate, total_paid: 0, referral_count: 0 }, ...prev]);
        }
      }
    } else {
      const data = await res.json().catch(() => ({}));
      alert(data.error || "Failed");
    }
    setActingOn(null);
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const res = await fetch("/api/affiliates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        first_month_percentage: parseFloat(form.first_month_percentage) || 50,
        recurring_percentage: parseFloat(form.recurring_percentage) || 10,
      }),
    });

    if (res.ok) {
      const { affiliate } = await res.json();
      setAffiliates((prev) => [{ ...affiliate, total_paid: 0, referral_count: 0 }, ...prev]);
      setForm({ name: "", code: "", email: "", phone: "", first_month_percentage: "50", recurring_percentage: "10", payout_method: "", payout_details: "", status: "active", notes: "" });
      setShowAdd(false);
    } else {
      const data = await res.json();
      setError(data.error || "Failed to create");
    }
    setSaving(false);
  }

  if (loading) return <div className="text-stone-400">Loading...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-white">Affiliates</h1>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="bg-emerald-600 text-white px-4 py-1.5 rounded-lg text-sm font-semibold hover:bg-emerald-500"
        >
          {showAdd ? "Cancel" : "+ New Affiliate"}
        </button>
      </div>

      {showAdd && (
        <form onSubmit={handleAdd} className="bg-stone-800 border border-stone-700 rounded-lg p-4 mb-4 space-y-3">
          {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-3 py-2">{error}</div>}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-stone-300 uppercase tracking-wider mb-1 block">Name *</label>
              <input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className={INPUT_CLASS} />
            </div>
            <div>
              <label className="text-xs text-stone-300 uppercase tracking-wider mb-1 block">Code *</label>
              <input required value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase().replace(/\s/g, "") }))}
                placeholder="e.g., SARAH25" className={INPUT_CLASS} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-stone-300 uppercase tracking-wider mb-1 block">First Month %</label>
              <input type="number" step="0.01" value={form.first_month_percentage}
                onChange={(e) => setForm((f) => ({ ...f, first_month_percentage: e.target.value }))} className={INPUT_CLASS} />
            </div>
            <div>
              <label className="text-xs text-stone-300 uppercase tracking-wider mb-1 block">Recurring %</label>
              <input type="number" step="0.01" value={form.recurring_percentage}
                onChange={(e) => setForm((f) => ({ ...f, recurring_percentage: e.target.value }))} className={INPUT_CLASS} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-stone-300 uppercase tracking-wider mb-1 block">Email</label>
              <input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} className={INPUT_CLASS} />
            </div>
            <div>
              <label className="text-xs text-stone-300 uppercase tracking-wider mb-1 block">Phone</label>
              <input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} className={INPUT_CLASS} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-stone-300 uppercase tracking-wider mb-1 block">Payout Method</label>
              <select value={form.payout_method} onChange={(e) => setForm((f) => ({ ...f, payout_method: e.target.value }))} className={INPUT_CLASS}>
                <option value="">— Select —</option>
                {PAYOUT_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-stone-300 uppercase tracking-wider mb-1 block">Payout Details</label>
              <input value={form.payout_details} onChange={(e) => setForm((f) => ({ ...f, payout_details: e.target.value }))}
                placeholder="Zelle email, PayPal handle, etc." className={INPUT_CLASS} />
            </div>
          </div>
          <button type="submit" disabled={saving}
            className="bg-emerald-600 text-white px-4 py-1.5 rounded-lg text-sm font-semibold disabled:opacity-50">
            {saving ? "Creating..." : "Create Affiliate"}
          </button>
        </form>
      )}

      {pending.length > 0 && (
        <div className="bg-stone-800 border border-amber-700/50 rounded-lg overflow-hidden mb-4">
          <div className="px-4 py-2 border-b border-stone-700 flex items-center justify-between">
            <span className="text-sm font-semibold text-amber-300">📥 Pending Applications</span>
            <span className="text-xs bg-amber-900 text-amber-300 px-2 py-0.5 rounded-full">{pending.length}</span>
          </div>
          <div className="divide-y divide-stone-700/50">
            {pending.map((p) => {
              const address = formatAddress(p);
              return (
              <div key={p.id} className="px-4 py-3 flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  {p.store_name && (
                    <div className="text-white font-semibold text-sm">{p.store_name}</div>
                  )}
                  <div className={p.store_name ? "text-stone-300 text-xs" : "text-white font-medium text-sm"}>
                    {p.name}
                    <span className="text-stone-500"> · </span>
                    <a href={`mailto:${p.email}`} className="text-stone-400 hover:text-emerald-400">{p.email}</a>
                  </div>
                  {address && (
                    <div className="text-emerald-400/90 text-xs mt-1 flex items-start gap-1">
                      <span>📍</span>
                      <span className="break-all">{address}</span>
                    </div>
                  )}
                  {p.message && <div className="text-stone-500 text-xs mt-1 italic">&ldquo;{p.message}&rdquo;</div>}
                  <div className="text-stone-600 text-[10px] mt-1">Applied {new Date(p.created_at).toLocaleDateString()}</div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleInterest(p.id, "approve")}
                    disabled={actingOn === p.id}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg disabled:opacity-50"
                  >
                    {actingOn === p.id ? "..." : "✓ Approve"}
                  </button>
                  <button
                    onClick={() => handleInterest(p.id, "reject")}
                    disabled={actingOn === p.id}
                    className="bg-stone-700 hover:bg-stone-600 text-stone-300 text-xs font-semibold px-3 py-1.5 rounded-lg disabled:opacity-50"
                  >
                    Reject
                  </button>
                </div>
              </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="bg-stone-800 border border-stone-700 rounded-lg overflow-hidden">
        <div className="grid grid-cols-[1.5fr_1fr_1fr_1fr_1fr_1fr_80px] px-4 py-2 border-b border-stone-700 text-xs text-stone-300 uppercase tracking-wider">
          <div>Name</div>
          <div>Code</div>
          <div>First Mo.</div>
          <div>Recurring</div>
          <div>Referrals</div>
          <div>Total Paid</div>
          <div></div>
        </div>
        {affiliates.length === 0 ? (
          <div className="px-4 py-8 text-center text-stone-500 text-sm">No affiliates yet.</div>
        ) : (
          affiliates.map((a) => (
            <div key={a.id} className="grid grid-cols-[1.5fr_1fr_1fr_1fr_1fr_1fr_80px] px-4 py-3 border-b border-stone-700/50 text-sm items-center">
              <Link href={`/admin/affiliates/${a.id}`} className="text-white font-medium hover:text-emerald-400">{a.name}</Link>
              <div className="text-emerald-400 font-mono text-xs">{a.code}</div>
              <div className="text-stone-300">{a.first_month_percentage}%</div>
              <div className="text-stone-300">{a.recurring_percentage}%</div>
              <div className="text-stone-300">{a.referral_count ?? 0}</div>
              <div className="text-white">{formatCurrency(a.total_paid ?? 0)}</div>
              <Link href={`/admin/affiliates/${a.id}`} className="text-stone-500 text-xs hover:text-white text-right">View →</Link>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
