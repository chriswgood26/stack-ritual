"use client";

import Link from "next/link";

// This page uses window.print() so needs client directive
// Data is fetched via the parent server component pattern

export default function PrintPage() {
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric"
  });

  return (
    <div className="min-h-screen bg-stone-50 font-sans">
      <nav className="bg-white border-b border-stone-200 px-4 py-3.5 flex items-center justify-between sticky top-0 z-10 print:hidden">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/stack" className="text-stone-400 hover:text-stone-700 transition-colors text-lg">←</Link>
          <span className="font-bold text-stone-900">Print Summary</span>
        </div>
        <div className="flex gap-2">
          <a
            href={`mailto:?subject=My%20Supplement%20Stack%20Summary&body=Hi%2C%0A%0APlease%20find%20my%20supplement%20stack%20summary%20from%20Stack%20Ritual%20attached%20as%20a%20PDF.%0A%0AYou%20can%20also%20view%20it%20online%20at%3A%20https%3A%2F%2Fstackritual.com%2Fdashboard%2Fprint%0A%0AThanks`}
            className="bg-stone-700 text-white text-sm font-semibold px-4 py-2 rounded-full hover:bg-stone-800 transition-colors"
          >
            ✉️ Email
          </a>
          <button
            onClick={() => window.print()}
            className="bg-emerald-700 text-white text-sm font-semibold px-4 py-2 rounded-full hover:bg-emerald-800 transition-colors"
          >
            🖨️ Print / Save PDF
          </button>
        </div>
      </nav>
      <div className="max-w-2xl mx-auto px-4 py-4 print:hidden">
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-800">
          💡 Click <strong>Print / Save PDF</strong> to print or save as PDF to share with your doctor.
        </div>
      </div>
      <PrintContent today={today} />
      <style>{`
        @media print {
          body { background: white; }
          @page { margin: 0.5in; }
          .print\\:hidden { display: none !important; }
        }
      `}</style>
    </div>
  );
}

// We'll load data client-side via fetch
import { useEffect, useState } from "react";

interface StackItem {
  id: string;
  custom_name: string | null;
  dose: string | null;
  timing: string | null;
  category: string;
  custom_icon: string | null;
  brand: string | null;
  notes: string | null;
  supplement: { name: string; icon: string } | { name: string; icon: string }[] | null;
}

const timingLabels: Record<string, string> = {
  "morning-fasted": "Morning — Fasted",
  "morning-food": "Morning — With Food",
  "afternoon": "Afternoon",
  "evening": "Evening",
  "bedtime": "Bedtime",
  "split": "Split Dose (AM + PM)",
  "2x-daily": "2x Daily",
  "2x-with-meals": "2x Daily with Meals",
  "3x-daily": "3x Daily",
  "3x-with-meals": "3x Daily with Meals",
  "4x-daily": "4x Daily",
  "weekly": "Weekly",
  "biweekly": "Twice a Week",
  "3x-week": "3x per Week",
  "monthly": "Monthly",
  "cycle-5-2": "Cycle 5 on / 2 off",
  "cycle-8-2w": "Cycle 8 weeks on / 2 off",
  "as-needed": "As Needed",
};

const timingOrder = [
  "morning-fasted", "morning-food", "2x-daily", "2x-with-meals",
  "3x-daily", "3x-with-meals", "4x-daily", "split",
  "afternoon", "evening", "bedtime",
  "weekly", "biweekly", "3x-week", "monthly",
  "cycle-5-2", "cycle-8-2w", "as-needed"
];

function PrintContent({ today }: { today: string }) {
  const [items, setItems] = useState<StackItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/stack/list")
      .then(r => r.json())
      .then(d => { setItems(d.items || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const grouped: Record<string, StackItem[]> = {};
  items.forEach(item => {
    const key = item.timing || "unscheduled";
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(item);
  });

  const orderedGroups = [
    ...timingOrder.filter(k => grouped[k]?.length).map(k => ({ key: k, label: timingLabels[k] || k, items: grouped[k] })),
    ...(grouped["unscheduled"]?.length ? [{ key: "unscheduled", label: "Unscheduled", items: grouped["unscheduled"] }] : []),
  ];

  return (
    <div className="max-w-2xl mx-auto px-2 sm:px-4 pb-16 print:px-0 print:max-w-full print:pb-0 print:pt-0 overflow-x-hidden">
      <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-8 print:shadow-none print:border-none print:rounded-none print:p-0">

        {/* Header */}
        <div className="flex items-start justify-between mb-6 pb-6 border-b border-stone-200">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl">🌿</span>
              <span className="text-xl font-bold text-stone-900">Stack Ritual</span>
            </div>
            <h1 className="text-2xl font-bold text-stone-900 mt-2">Supplement & Wellness Summary</h1>
            <p className="text-stone-400 text-sm mt-1">{today}</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-emerald-700">{items.length}</div>
            <div className="text-xs text-stone-500">total items</div>
          </div>
        </div>

        {/* Note to doctor */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-6 text-sm text-amber-900">
          <strong>Note to healthcare provider:</strong> This document summarizes the patient&apos;s current supplement and wellness regimen as tracked in Stack Ritual. Please review for potential interactions with any prescribed medications.
        </div>

        {loading ? (
          <p className="text-stone-400 text-sm text-center py-8">Loading your stack...</p>
        ) : items.length === 0 ? (
          <p className="text-stone-400 text-sm text-center py-8">No supplements in your stack yet.</p>
        ) : (
          <div className="space-y-6">
            {orderedGroups.map(group => (
              <div key={group.key}>
                <h2 className="text-sm font-bold text-stone-500 uppercase tracking-wider mb-2 pb-1 border-b border-stone-100">
                  {group.label}
                </h2>
                <div className="overflow-x-auto -mx-2 sm:mx-0"><table className="w-full text-xs sm:text-sm min-w-[400px] sm:min-w-0">
                  <thead>
                    <tr className="text-xs text-stone-400 font-medium">
                      <th className="text-left py-1.5 w-1/4">Name</th>
                      <th className="text-left py-1.5 w-1/6">Dose</th>
                      <th className="text-left py-1.5 w-1/6">Type</th>
                      <th className="text-left py-1.5">Notes / Purpose</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.items.map((item, i) => {
                      const supp = Array.isArray(item.supplement) ? item.supplement[0] : item.supplement;
                      const name = supp?.name || item.custom_name || "Unknown";
                      return (
                        <tr key={item.id + i} className={i % 2 === 0 ? "bg-stone-50" : ""}>
                          <td className="py-2 px-2 font-semibold text-stone-900 rounded-l">{name}</td>
                          <td className="py-2 px-2 text-stone-600">{item.dose || "—"}</td>
                          <td className="py-2 px-2">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                              item.category === "ritual" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
                            }`}>
                              {item.category}
                            </span>
                          </td>
                          <td className="py-2 px-2 text-stone-500 text-xs rounded-r">
                            {item.notes || item.brand || "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
</table></div>
              </div>
            ))}
          </div>
        )}

        {/* Disclaimer */}
        <div className="mt-8 pt-6 border-t border-stone-200">
          <p className="text-xs text-stone-400 leading-relaxed">
            <strong>Medical Disclaimer:</strong> Nothing in this document constitutes medical advice. This summary is for informational purposes only and is intended to facilitate communication with a licensed healthcare provider. Always consult your doctor before beginning, changing, or stopping any supplement or wellness regimen.
          </p>
          <p className="text-xs text-stone-400 mt-2">Generated by Stack Ritual · stackritual.com · {today}</p>
        </div>

      </div>
    </div>
  );
}
