"use client";

import { useState } from "react";

interface UserResult {
  user: { id: string; email: string; firstName: string | null; lastName: string | null; createdAt: number };
  subscription: { plan: string; status: string };
}

export default function UserManager() {
  const [email, setEmail] = useState("");
  const [result, setResult] = useState<UserResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [updating, setUpdating] = useState(false);
  const [updated, setUpdated] = useState(false);

  async function handleSearch() {
    setLoading(true);
    setError("");
    setResult(null);
    setUpdated(false);

    const res = await fetch(`/api/admin/users?email=${encodeURIComponent(email)}`);
    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "User not found");
    } else {
      setResult(data);
    }
    setLoading(false);
  }

  async function handleSetPlan(plan: string) {
    if (!result) return;
    setUpdating(true);
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ target_user_id: result.user.id, plan }),
    });
    if (res.ok) {
      setResult(prev => prev ? { ...prev, subscription: { plan, status: "active" } } : null);
      setUpdated(true);
    }
    setUpdating(false);
  }

  const planColor: Record<string, string> = {
    free: "bg-stone-600 text-stone-200",
    plus: "bg-blue-700 text-blue-100",
    pro: "bg-emerald-700 text-emerald-100",
  };

  return (
    <div className="bg-stone-800 rounded-2xl border border-stone-700 overflow-hidden">
      <div className="px-5 py-4 border-b border-stone-700">
        <h2 className="font-bold text-white">User Management</h2>
        <p className="text-stone-400 text-sm mt-0.5">Search by email to manage a user's plan</p>
      </div>

      <div className="p-5 space-y-4">
        <div className="flex gap-3">
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSearch()}
            placeholder="user@example.com"
            className="flex-1 bg-stone-700 border border-stone-600 rounded-xl px-4 py-2.5 text-white placeholder-stone-400 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <button onClick={handleSearch} disabled={!email || loading}
            className="bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-emerald-600 transition-colors disabled:opacity-50">
            {loading ? "..." : "Search"}
          </button>
        </div>

        {error && (
          <div className="bg-red-900/50 border border-red-700 rounded-xl px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {result && (
          <div className="bg-stone-700 rounded-xl p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <div className="font-semibold text-white">
                  {result.user.firstName} {result.user.lastName}
                </div>
                <div className="text-stone-400 text-sm">{result.user.email}</div>
                <div className="text-stone-500 text-xs mt-0.5">
                  ID: {result.user.id.slice(0, 20)}... · Joined: {new Date(result.user.createdAt).toLocaleDateString()}
                </div>
              </div>
              <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${planColor[result.subscription.plan] || planColor.free}`}>
                {result.subscription.plan.toUpperCase()}
              </span>
            </div>

            {updated && (
              <div className="text-emerald-400 text-sm font-medium">✓ Plan updated successfully!</div>
            )}

            <div>
              <p className="text-stone-400 text-xs mb-2">Set plan:</p>
              <div className="flex gap-2">
                {["free", "plus", "pro"].map(plan => (
                  <button key={plan} onClick={() => handleSetPlan(plan)} disabled={updating || result.subscription.plan === plan}
                    className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-40 ${
                      result.subscription.plan === plan
                        ? "bg-stone-600 text-stone-300 cursor-default"
                        : plan === "pro" ? "bg-emerald-700 text-white hover:bg-emerald-600"
                        : plan === "plus" ? "bg-blue-700 text-white hover:bg-blue-600"
                        : "bg-stone-600 text-white hover:bg-stone-500"
                    }`}>
                    {updating ? "..." : plan.charAt(0).toUpperCase() + plan.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
