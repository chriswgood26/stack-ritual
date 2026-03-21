import Link from "next/link";

const stackItems = [
  { name: "NMN", dose: "500mg", timing: "Morning — Fasted", purpose: "NAD+ precursor, cellular energy & longevity", category: "supplement" },
  { name: "Berberine", dose: "500mg", timing: "Morning — Fasted", purpose: "Blood sugar regulation, metabolic health", category: "supplement" },
  { name: "Vitamin D3", dose: "5,000 IU", timing: "Morning — With Food", purpose: "Immune function, bone health, mood support", category: "supplement" },
  { name: "Vitamin K2", dose: "200mcg", timing: "Morning — With Food", purpose: "Directs calcium to bones, pairs with D3", category: "supplement" },
  { name: "Omega-3", dose: "2g EPA/DHA", timing: "Morning — With Food", purpose: "Heart health, brain function, inflammation", category: "supplement" },
  { name: "Magnesium Glycinate", dose: "200mg (AM)", timing: "Morning — With Food", purpose: "Energy, stress response, activates Vitamin D", category: "supplement" },
  { name: "CoQ10", dose: "200mg", timing: "Afternoon — With Food", purpose: "Mitochondrial energy production, heart health", category: "supplement" },
  { name: "Lions Mane", dose: "1,000mg", timing: "Afternoon", purpose: "Cognitive function, nerve growth factor", category: "supplement" },
  { name: "Zinc", dose: "25mg", timing: "Evening", purpose: "Immune support, testosterone, wound healing", category: "supplement" },
  { name: "Ashwagandha", dose: "600mg", timing: "Evening", purpose: "Cortisol reduction, stress resilience, sleep", category: "supplement" },
  { name: "Magnesium Glycinate", dose: "200mg (PM)", timing: "Bedtime", purpose: "Sleep quality, muscle relaxation", category: "supplement" },
  { name: "Apigenin", dose: "50mg", timing: "Bedtime", purpose: "Sleep quality, anti-anxiety", category: "supplement" },
  { name: "Glycine", dose: "3g", timing: "Bedtime", purpose: "Deep sleep support, collagen synthesis", category: "supplement" },
  { name: "Cold Shower", dose: "3 min", timing: "Morning — Fasted", purpose: "Circulation, mental resilience, inflammation", category: "ritual" },
  { name: "Red Light Therapy", dose: "10 min", timing: "Afternoon", purpose: "Mitochondrial function, skin health, recovery", category: "ritual" },
];

const timingOrder = [
  "Morning — Fasted",
  "Morning — With Food",
  "Afternoon",
  "Evening",
  "Bedtime",
];

const grouped = timingOrder.map(timing => ({
  timing,
  items: stackItems.filter(i => i.timing === timing),
})).filter(g => g.items.length > 0);

export default function PrintPage() {
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric"
  });

  return (
    <div className="min-h-screen bg-stone-50 font-sans">

      {/* Screen-only nav */}
      <nav className="bg-white border-b border-stone-200 px-4 py-3.5 flex items-center justify-between sticky top-0 z-10 print:hidden">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/stack" className="text-stone-400 hover:text-stone-700 transition-colors text-lg">←</Link>
          <span className="font-bold text-stone-900">Print Summary</span>
        </div>
        <button
          onClick={() => window.print()}
          className="bg-emerald-700 text-white text-sm font-semibold px-4 py-2 rounded-full hover:bg-emerald-800 transition-colors"
        >
          🖨️ Print / Save PDF
        </button>
      </nav>

      {/* Print hint */}
      <div className="max-w-2xl mx-auto px-4 py-4 print:hidden">
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-800">
          💡 Click <strong>Print / Save PDF</strong> to print or save as PDF to share with your doctor.
        </div>
      </div>

      {/* Printable content */}
      <div className="max-w-2xl mx-auto px-4 pb-16 print:px-0 print:max-w-full print:pb-0">
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-8 print:shadow-none print:border-none print:rounded-none">

          {/* Header */}
          <div className="flex items-start justify-between mb-6 pb-6 border-b border-stone-200">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-2xl">🌿</span>
                <span className="text-xl font-bold text-stone-900">Stack Ritual</span>
              </div>
              <h1 className="text-2xl font-bold text-stone-900 mt-2">Supplement & Wellness Summary</h1>
              <p className="text-stone-500 text-sm mt-1">Prepared for: <strong>Chris Goodbaudy</strong></p>
              <p className="text-stone-400 text-sm">{today}</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-emerald-700">{stackItems.length}</div>
              <div className="text-xs text-stone-500">total items</div>
            </div>
          </div>

          {/* Note to doctor */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-6 text-sm text-amber-900">
            <strong>Note to healthcare provider:</strong> This document summarizes the patient&apos;s current supplement and wellness regimen as tracked in Stack Ritual. Please review for potential interactions with any prescribed medications.
          </div>

          {/* Grouped by timing */}
          <div className="space-y-6">
            {grouped.map(group => (
              <div key={group.timing}>
                <h2 className="text-sm font-bold text-stone-500 uppercase tracking-wider mb-2 pb-1 border-b border-stone-100">
                  {group.timing}
                </h2>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-stone-400 font-medium">
                      <th className="text-left py-1.5 w-1/4">Name</th>
                      <th className="text-left py-1.5 w-1/6">Dose</th>
                      <th className="text-left py-1.5 w-1/6">Type</th>
                      <th className="text-left py-1.5">Purpose</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.items.map((item, i) => (
                      <tr key={item.name + i} className={i % 2 === 0 ? "bg-stone-50" : ""}>
                        <td className="py-2 px-2 font-semibold text-stone-900 rounded-l">{item.name}</td>
                        <td className="py-2 px-2 text-stone-600">{item.dose}</td>
                        <td className="py-2 px-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            item.category === "ritual"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-emerald-100 text-emerald-700"
                          }`}>
                            {item.category}
                          </span>
                        </td>
                        <td className="py-2 px-2 text-stone-500 text-xs rounded-r">{item.purpose}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>

          {/* Disclaimer */}
          <div className="mt-8 pt-6 border-t border-stone-200">
            <p className="text-xs text-stone-400 leading-relaxed">
              <strong>Medical Disclaimer:</strong> Nothing in this document constitutes medical advice. This summary is for informational purposes only and is intended to facilitate communication with a licensed healthcare provider. Always consult your doctor or a qualified healthcare professional before beginning, changing, or stopping any supplement or wellness regimen. Stack Ritual does not provide medical diagnoses, treatment recommendations, or therapeutic guidance.
            </p>
            <p className="text-xs text-stone-400 mt-2">Generated by Stack Ritual · stackritual.com · {today}</p>
          </div>

        </div>
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          body { background: white; }
          @page { margin: 1in; }
        }
      `}</style>

    </div>
  );
}
