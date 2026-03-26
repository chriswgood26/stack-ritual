"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface SearchResult {
  id: string;
  name: string;
  slug?: string;
  icon: string;
  category: string;
  tagline: string;
  evidence_level?: string;
  source: "official" | "custom";
}

const timingOptions = [
  { group: "Daily", options: [
    { value: "morning-fasted", label: "Morning — Fasted" },
    { value: "morning-food", label: "Morning — With Food" },
    { value: "afternoon", label: "Afternoon" },
    { value: "evening", label: "Evening" },
    { value: "bedtime", label: "Bedtime" },
    { value: "split", label: "Split Dose (AM + PM)" },
  ]},
  { group: "Multiple times daily", options: [
    { value: "2x-daily", label: "2x Daily (AM + PM)" },
    { value: "2x-with-meals", label: "2x Daily with Meals" },
    { value: "3x-daily", label: "3x Daily (AM, Midday, PM)" },
    { value: "3x-with-meals", label: "3x Daily with Meals" },
    { value: "4x-daily", label: "4x Daily" },
  ]},
  { group: "Less than daily", options: [
    { value: "weekly", label: "Weekly" },
    { value: "biweekly", label: "Twice a week" },
    { value: "3x-week", label: "3x per week" },
    { value: "monthly", label: "Monthly" },
    { value: "cycle-5-2", label: "Cycle — 5 days on, 2 off" },
    { value: "cycle-8-2w", label: "Cycle — 8 weeks on, 2 weeks off" },
    { value: "as-needed", label: "As needed" },
  ]},
];

const categories = [
  "vitamins", "minerals", "nootropics", "adaptogens",
  "longevity", "sleep", "gut-health", "hormones", "amino-acids", "herbs", "phytonutrients", "ritual", "other"
];

export default function AddCustomSupplement({ initialName = "" }: { initialName?: string }) {
  const [query, setQuery] = useState(initialName);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [step, setStep] = useState<"search" | "details" | "success">("search");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [message, setMessage] = useState("");
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();

  const [form, setForm] = useState({
    name: "",  // will be set from search
    category: "other",
    icon: "💊",
    tagline: "",
    dose: "",
    timing: "",
    brand: "",
    purchasedFrom: "",
    isRitual: false,
  });

  useEffect(() => {
    if (query.length < 2) { setResults([]); return; }
    setSearching(true);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(async () => {
      const res = await fetch(`/api/supplements/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setResults(data.results || []);
      setSearching(false);
    }, 300);
  }, [query]);

  async function handleSubmit() {
    setStatus("loading");
    const res = await fetch("/api/supplements/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, purchased_from: form.purchasedFrom }),
    });
    const data = await res.json();

    if (data.message === "exists_in_db") {
      setMessage(`"${data.match.name}" is already in our database! Search for it to add it to your stack.`);
      setStatus("idle");
      setStep("search");
      setQuery(data.match.name);
    } else if (data.message === "already_submitted") {
      setMessage(`Someone already submitted "${form.name}" — we'll review it soon!`);
      setStep("success");
    } else if (data.message === "submitted") {
      setStep("success");
      router.refresh();
    } else {
      setStatus("error");
    }
  }

  if (!showForm) {
    return (
      <button
        onClick={() => setShowForm(true)}
        className="flex items-center justify-center gap-2 bg-white border-2 border-dashed border-stone-200 rounded-2xl py-4 w-full text-stone-500 hover:border-emerald-400 hover:text-emerald-700 transition-colors font-medium text-sm"
      >
        + Add supplement or ritual not in our database
      </button>
    );
  }

  if (step === "success") {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center">
        <div className="text-3xl mb-2">🎉</div>
        <p className="font-semibold text-emerald-800">Submitted for review!</p>
        <p className="text-emerald-700 text-sm mt-1">We&apos;ll add it to the database soon. It&apos;s been added to your stack in the meantime.</p>
        <button onClick={() => { setStep("search"); setQuery(""); setStatus("idle"); setForm({ name: "", category: "other", icon: "💊", tagline: "", dose: "", timing: "", brand: "", purchasedFrom: "", isRitual: false }); }}
          className="mt-4 text-emerald-700 text-sm font-medium underline">
          Add another
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-stone-900">Add supplement or ritual</h3>
        <button onClick={() => setShowForm(false)} className="text-stone-400 hover:text-stone-600 text-sm">✕</button>
      </div>

      {step === "search" && (
        <>
          {/* Search first */}
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400">🔍</span>
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search our database first..."
              className="w-full border border-stone-200 rounded-xl pl-9 pr-4 py-2.5 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              autoFocus
            />
          </div>

          {/* Search results */}
          {query.length >= 2 && (
            <div className="space-y-1.5">
              {searching && <p className="text-xs text-stone-400 text-center py-2">Searching...</p>}
              {!searching && results.length > 0 && (
                <>
                  <p className="text-xs text-stone-500 font-medium">Found in our database — click to view:</p>
                  {results.map(r => (
                    <Link key={r.id} href={`/dashboard/search/${r.slug}`}
                      className="flex items-center gap-3 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2.5 hover:border-emerald-300 transition-colors">
                      <span className="text-xl">{r.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-stone-900 text-sm">{r.name}</div>
                        <div className="text-xs text-stone-500 truncate">{r.tagline}</div>
                      </div>
                      <span className="text-xs text-emerald-600 font-medium flex-shrink-0">View →</span>
                    </Link>
                  ))}
                  <p className="text-xs text-stone-400 text-center pt-1">Not what you&apos;re looking for?</p>
                </>
              )}
              {!searching && results.length === 0 && (
                <p className="text-xs text-stone-500 text-center py-2 bg-stone-50 rounded-xl">
                  Not found in our database
                </p>
              )}
            </div>
          )}

          {message && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
              {message}
            </div>
          )}

          <button
            onClick={() => { setForm(f => ({ ...f, name: query })); setStep("details"); }}
            className="w-full bg-emerald-700 text-white py-3 rounded-xl font-semibold text-sm hover:bg-emerald-800 transition-colors"
          >
            {results.length > 0 ? "Add something different instead →" : "Add new supplement or ritual →"}
          </button>
        </>
      )}

      {step === "details" && (
        <>
          <div className="flex gap-2">
            <button
              onClick={() => setForm(f => ({ ...f, isRitual: false }))}
              className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors ${!form.isRitual ? "bg-emerald-700 text-white border-emerald-700" : "bg-white text-stone-600 border-stone-200"}`}
            >
              💊 Supplement
            </button>
            <button
              onClick={() => setForm(f => ({ ...f, isRitual: true, category: "ritual" }))}
              className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors ${form.isRitual ? "bg-amber-600 text-white border-amber-600" : "bg-white text-stone-600 border-stone-200"}`}
            >
              🧘 Ritual
            </button>
          </div>

          <div>
            <label className="text-xs font-semibold text-stone-500 uppercase tracking-wide block mb-1.5">Name *</label>
            <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder={form.isRitual ? "e.g. Cold Plunge, Sauna" : "e.g. Turmeric, Probiotics"}
              className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>

          <div>
              <label className="text-xs font-semibold text-stone-500 uppercase tracking-wide block mb-1.5">Category</label>
              <select value={form.category}
                onChange={e => {
                  const val = e.target.value;
                  setForm(f => ({ ...f, category: val, isRitual: val === "ritual" }));
                }}
                className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white capitalize">
                {categories.map(c => <option key={c} value={c}>{c.replace(/-/g, " ")}</option>)}
              </select>
            </div>

          <div>
            <label className="text-xs font-semibold text-stone-500 uppercase tracking-wide block mb-1.5">
              {form.isRitual ? "Duration" : "Dose"}
            </label>
            <input type="text" value={form.dose} onChange={e => setForm(f => ({ ...f, dose: e.target.value }))}
              placeholder={form.isRitual ? "e.g. 10 min, 20 min" : "e.g. 500mg"}
              className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>

          {!form.isRitual && (
            <>
              <div>
                <label className="text-xs font-semibold text-stone-500 uppercase tracking-wide block mb-1.5">Brand (optional)</label>
                <input type="text" value={form.brand} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))}
                  placeholder="e.g. Thorne, Life Extension"
                  className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div>
                <label className="text-xs font-semibold text-stone-500 uppercase tracking-wide block mb-1.5">Where purchased (optional)</label>
                <input type="text" value={form.purchasedFrom} onChange={e => setForm(f => ({ ...f, purchasedFrom: e.target.value }))}
                  placeholder="e.g. Amazon, iHerb, Whole Foods"
                  className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
            </>
          )}

          <div>
            <label className="text-xs font-semibold text-stone-500 uppercase tracking-wide block mb-1.5">
              {form.isRitual ? "When performed" : "When to take"}
            </label>
            <select value={form.timing} onChange={e => setForm(f => ({ ...f, timing: e.target.value }))}
              className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white">
              <option value="">Select timing...</option>
              {timingOptions.map(g => (
                <optgroup key={g.group} label={g.group}>
                  {g.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </optgroup>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-stone-500 uppercase tracking-wide block mb-1.5">Brief description (optional)</label>
            <textarea value={form.tagline} onChange={e => setForm(f => ({ ...f, tagline: e.target.value }))}
              placeholder="Why do you take this? What does it do for you?"
              rows={2}
              className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none" />
          </div>

          <div className="flex gap-3">
            <button onClick={() => setStep("search")}
              className="flex-1 border border-stone-200 text-stone-600 py-3 rounded-xl font-medium text-sm hover:bg-stone-50 transition-colors">
              ← Back
            </button>
            <button onClick={handleSubmit} disabled={!form.name.trim() || status === "loading"}
              className="flex-1 bg-emerald-700 text-white py-3 rounded-xl font-semibold text-sm hover:bg-emerald-800 transition-colors disabled:opacity-60">
              {status === "loading" ? "Adding..." : "Add to stack ✓"}
            </button>
          </div>

          {status === "error" && <p className="text-red-500 text-xs text-center">Something went wrong. Try again.</p>}
        </>
      )}
    </div>
  );
}
