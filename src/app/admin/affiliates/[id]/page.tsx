"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Affiliate {
  id: string;
  name: string;
  code: string;
  email: string | null;
  phone: string | null;
  street?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  country?: string | null;
  first_month_percentage: number;
  recurring_percentage: number;
  payout_method?: string | null;
  payout_details?: string | null;
  status: string;
  notes?: string | null;
  total_paid?: number;
  referral_count?: number;
}

interface Payout {
  id: string;
  amount: number;
  paid_date: string;
  method: string | null;
  reference_number: string | null;
  notes: string | null;
}

interface Referral {
  id: string;
  user_id: string | null;
  email: string | null;
  subscription_active: boolean;
  created_at: string;
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
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(amount);
}

export default function AffiliateDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [affiliate, setAffiliate] = useState<Affiliate | null>(null);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Partial<Affiliate>>({});
  const [saving, setSaving] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);

  const [showPayoutForm, setShowPayoutForm] = useState(false);
  const [payoutForm, setPayoutForm] = useState({ amount: "", paid_date: new Date().toISOString().split("T")[0], method: "", reference_number: "", notes: "" });

  async function loadData() {
    const res = await fetch(`/api/affiliates/${id}`);
    const data = await res.json();
    setAffiliate(data.affiliate);
    setPayouts(data.payouts || []);
    setReferrals(data.referrals || []);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function startEdit() {
    if (!affiliate) return;
    setForm(affiliate);
    setEditing(true);
  }

  async function saveEdit() {
    setSaving(true);
    const res = await fetch(`/api/affiliates/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      await loadData();
      setEditing(false);
    }
    setSaving(false);
  }

  async function deleteAffiliate() {
    if (!confirm("Delete this affiliate and all their payout history?")) return;
    await fetch(`/api/affiliates/${id}`, { method: "DELETE" });
    router.push("/admin/affiliates");
  }

  async function addPayout(e: React.FormEvent) {
    e.preventDefault();
    if (!payoutForm.amount) return;
    const res = await fetch(`/api/affiliates/${id}/payouts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: parseFloat(payoutForm.amount),
        paid_date: payoutForm.paid_date,
        method: payoutForm.method || null,
        reference_number: payoutForm.reference_number || null,
        notes: payoutForm.notes || null,
      }),
    });
    if (res.ok) {
      await loadData();
      setPayoutForm({ amount: "", paid_date: new Date().toISOString().split("T")[0], method: "", reference_number: "", notes: "" });
      setShowPayoutForm(false);
    }
  }

  async function deletePayout(payoutId: string) {
    if (!confirm("Delete this payout?")) return;
    await fetch(`/api/affiliates/${id}/payouts/${payoutId}`, { method: "DELETE" });
    await loadData();
  }

  async function sendWelcomeEmail() {
    if (!affiliate?.email) return alert("No email on file.");
    if (!confirm(`Send welcome email to ${affiliate.email}?`)) return;
    setSendingEmail(true);
    try {
      const res = await fetch(`/api/affiliates/${id}/welcome-email`, { method: "POST" });
      if (res.ok) alert("Welcome email sent!");
      else {
        const data = await res.json();
        alert(data.error || "Failed to send");
      }
    } finally {
      setSendingEmail(false);
    }
  }

  if (loading) return <div className="text-stone-400">Loading...</div>;
  if (!affiliate) return <div className="text-red-400">Not found</div>;

  return (
    <div>
      <Link href="/admin/affiliates" className="text-stone-500 text-sm hover:text-white">← Affiliates</Link>

      <div className="bg-stone-800 border border-stone-700 rounded-lg p-5 mt-4 mb-6">
        {editing ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-stone-300 uppercase tracking-wider mb-1 block">Name</label>
                <input value={form.name || ""} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className={INPUT_CLASS} />
              </div>
              <div>
                <label className="text-xs text-stone-300 uppercase tracking-wider mb-1 block">Code</label>
                <input value={form.code || ""} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))} className={INPUT_CLASS} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-stone-300 uppercase tracking-wider mb-1 block">First Month %</label>
                <input type="number" step="0.01" value={form.first_month_percentage || 0}
                  onChange={(e) => setForm((f) => ({ ...f, first_month_percentage: parseFloat(e.target.value) }))} className={INPUT_CLASS} />
              </div>
              <div>
                <label className="text-xs text-stone-300 uppercase tracking-wider mb-1 block">Recurring %</label>
                <input type="number" step="0.01" value={form.recurring_percentage || 0}
                  onChange={(e) => setForm((f) => ({ ...f, recurring_percentage: parseFloat(e.target.value) }))} className={INPUT_CLASS} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-stone-300 uppercase tracking-wider mb-1 block">Email</label>
                <input type="email" value={form.email || ""} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} className={INPUT_CLASS} />
              </div>
              <div>
                <label className="text-xs text-stone-300 uppercase tracking-wider mb-1 block">Phone</label>
                <input value={form.phone || ""} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} className={INPUT_CLASS} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-stone-300 uppercase tracking-wider mb-1 block">Payout Method</label>
                <select value={form.payout_method || ""} onChange={(e) => setForm((f) => ({ ...f, payout_method: e.target.value }))} className={INPUT_CLASS}>
                  <option value="">— Select —</option>
                  {PAYOUT_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-stone-300 uppercase tracking-wider mb-1 block">Payout Details</label>
                <input value={form.payout_details || ""} onChange={(e) => setForm((f) => ({ ...f, payout_details: e.target.value }))} className={INPUT_CLASS} />
              </div>
            </div>
            <div>
              <label className="text-xs text-stone-300 uppercase tracking-wider mb-1 block">Status</label>
              <select value={form.status || "active"} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))} className={INPUT_CLASS + " !w-48"}>
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="paused">Paused</option>
                <option value="terminated">Terminated</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button onClick={saveEdit} disabled={saving} className="bg-emerald-600 text-white px-4 py-1.5 rounded-lg text-sm font-semibold disabled:opacity-50">
                {saving ? "Saving..." : "Save"}
              </button>
              <button onClick={() => setEditing(false)} className="text-stone-400 text-sm hover:text-white">Cancel</button>
            </div>
          </div>
        ) : (
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-xl font-bold text-white">{affiliate.name}</h1>
                <span className="text-emerald-400 font-mono text-sm">{affiliate.code}</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                  affiliate.status === "active" ? "bg-green-500/10 text-green-400" :
                  affiliate.status === "pending" ? "bg-amber-500/10 text-amber-400" :
                  "bg-stone-500/10 text-stone-400"
                }`}>{affiliate.status}</span>
              </div>
              <div className="flex gap-4 text-xs text-stone-400 mb-2">
                {affiliate.email && <span>📧 {affiliate.email}</span>}
                {affiliate.phone && <span>📞 {affiliate.phone}</span>}
              </div>
              <div className="text-xs text-stone-400">
                💰 <strong>{affiliate.first_month_percentage}%</strong> first month · <strong>{affiliate.recurring_percentage}%</strong> recurring
              </div>
              {affiliate.payout_method && (
                <div className="text-xs text-stone-500 mt-1">
                  Payout: {affiliate.payout_method}{affiliate.payout_details ? ` — ${affiliate.payout_details}` : ""}
                </div>
              )}
              <div className="mt-3 text-xs text-stone-500">
                Referral link: <span className="text-emerald-400 font-mono">https://stackritual.com/?ref={affiliate.code}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={sendWelcomeEmail} disabled={sendingEmail || !affiliate.email}
                className="text-emerald-400 text-xs hover:text-emerald-300 disabled:opacity-50">
                {sendingEmail ? "Sending..." : "📧 Welcome Email"}
              </button>
              <button onClick={startEdit} className="text-stone-400 text-xs hover:text-white">Edit</button>
              <button onClick={deleteAffiliate} className="text-red-400 text-xs hover:text-red-300">Delete</button>
            </div>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-stone-800 border border-stone-700 rounded-lg p-4 text-center">
          <div className="text-stone-300 text-xs uppercase tracking-wider">Referrals</div>
          <div className="text-white text-2xl font-bold mt-1">{referrals.length}</div>
        </div>
        <div className="bg-stone-800 border border-stone-700 rounded-lg p-4 text-center">
          <div className="text-stone-300 text-xs uppercase tracking-wider">Active Subs</div>
          <div className="text-white text-2xl font-bold mt-1">{referrals.filter(r => r.subscription_active).length}</div>
        </div>
        <div className="bg-stone-800 border border-stone-700 rounded-lg p-4 text-center">
          <div className="text-stone-300 text-xs uppercase tracking-wider">Total Paid</div>
          <div className="text-white text-2xl font-bold mt-1">{formatCurrency(affiliate.total_paid ?? 0)}</div>
        </div>
      </div>

      {/* Tax disclaimer */}
      <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-3 mb-6 text-xs text-stone-400 flex gap-2">
        <span className="text-amber-400 flex-shrink-0">⚠️</span>
        <div>
          <strong className="text-amber-300">Tax Note:</strong>{" "}
          Affiliate is responsible for reporting and paying any applicable taxes on payouts received. Stack Ritual LLC does not withhold taxes. If total annual payouts reach $600, issue a 1099-NEC at year-end.
        </div>
      </div>

      {/* Payouts */}
      <div className="bg-stone-800 border border-stone-700 rounded-lg p-5 mb-6">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-white text-sm font-semibold">Payout History</h2>
          <button onClick={() => setShowPayoutForm(!showPayoutForm)}
            className="bg-emerald-600 text-white px-3 py-1 rounded-lg text-xs font-semibold">
            {showPayoutForm ? "Cancel" : "+ Record Payout"}
          </button>
        </div>

        {showPayoutForm && (
          <form onSubmit={addPayout} className="bg-stone-900 rounded-lg p-3 mb-3 space-y-2">
            <div className="grid grid-cols-3 gap-2">
              <input type="number" step="0.01" required value={payoutForm.amount}
                onChange={(e) => setPayoutForm((f) => ({ ...f, amount: e.target.value }))}
                placeholder="Amount" className={INPUT_CLASS} />
              <input type="date" value={payoutForm.paid_date}
                onChange={(e) => setPayoutForm((f) => ({ ...f, paid_date: e.target.value }))} className={INPUT_CLASS} />
              <select value={payoutForm.method} onChange={(e) => setPayoutForm((f) => ({ ...f, method: e.target.value }))} className={INPUT_CLASS}>
                <option value="">— Method —</option>
                {PAYOUT_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input value={payoutForm.reference_number}
                onChange={(e) => setPayoutForm((f) => ({ ...f, reference_number: e.target.value }))}
                placeholder="Reference #" className={INPUT_CLASS} />
              <input value={payoutForm.notes}
                onChange={(e) => setPayoutForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Notes" className={INPUT_CLASS} />
            </div>
            <button type="submit" className="bg-emerald-600 text-white px-3 py-1 rounded-lg text-xs font-semibold">
              Record Payout
            </button>
          </form>
        )}

        {payouts.length === 0 ? (
          <div className="text-stone-500 text-sm">No payouts yet.</div>
        ) : (
          <div className="space-y-2">
            {payouts.map((p) => (
              <div key={p.id} className="bg-stone-900 rounded-lg px-4 py-2 flex justify-between items-center">
                <div>
                  <span className="text-white font-semibold">{formatCurrency(Number(p.amount))}</span>
                  <span className="text-stone-400 text-xs ml-3">{new Date(p.paid_date).toLocaleDateString()}</span>
                  {p.method && <span className="text-stone-500 text-xs ml-2 capitalize">{p.method}</span>}
                  {p.reference_number && <span className="text-stone-500 text-xs ml-2">#{p.reference_number}</span>}
                  {p.notes && <div className="text-stone-400 text-xs mt-0.5">{p.notes}</div>}
                </div>
                <button onClick={() => deletePayout(p.id)} className="text-red-400 text-xs hover:text-red-300">Delete</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Referrals */}
      <div className="bg-stone-800 border border-stone-700 rounded-lg p-5">
        <h2 className="text-white text-sm font-semibold mb-3">Referrals ({referrals.length})</h2>
        {referrals.length === 0 ? (
          <div className="text-stone-500 text-sm">No referrals yet. Share the link above to get started.</div>
        ) : (
          <div className="space-y-2">
            {referrals.map((r) => (
              <div key={r.id} className="bg-stone-900 rounded-lg px-4 py-2 flex justify-between items-center">
                <div>
                  <span className="text-white text-sm">{r.email || r.user_id || "Anonymous visitor"}</span>
                  {r.subscription_active && (
                    <span className="ml-2 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-green-500/10 text-green-400">Subscribed</span>
                  )}
                </div>
                <span className="text-stone-500 text-xs">{new Date(r.created_at).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
