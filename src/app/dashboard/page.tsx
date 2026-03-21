import Link from "next/link";

const timeSlots = [
  {
    id: "morning-fasted",
    label: "Morning — Fasted",
    time: "6:00 – 8:00 AM",
    icon: "🌅",
    items: [
      { name: "NMN", dose: "500mg", note: "Best absorbed on empty stomach", category: "supplement" },
      { name: "Berberine", dose: "500mg", note: "Take 30 min before eating", category: "supplement" },
      { name: "Cold Shower", dose: "3 min", note: "Contrast protocol", category: "ritual" },
    ],
  },
  {
    id: "morning-with-food",
    label: "Morning — With Food",
    time: "8:00 – 9:00 AM",
    icon: "☀️",
    items: [
      { name: "Vitamin D3", dose: "5,000 IU", note: "Take with fat for absorption", category: "supplement" },
      { name: "Vitamin K2", dose: "200mcg", note: "Pairs with D3", category: "supplement" },
      { name: "Omega-3", dose: "2g EPA/DHA", note: "Take with largest meal", category: "supplement" },
      { name: "Magnesium Glycinate", dose: "400mg", note: "Split dose — half AM, half PM", category: "supplement" },
    ],
  },
  {
    id: "afternoon",
    label: "Afternoon",
    time: "12:00 – 2:00 PM",
    icon: "🌤️",
    items: [
      { name: "CoQ10", dose: "200mg", note: "Take with food", category: "supplement" },
      { name: "Lions Mane", dose: "1,000mg", note: "Cognitive support", category: "supplement" },
      { name: "Red Light Therapy", dose: "10 min", note: "Full body panel", category: "ritual" },
    ],
  },
  {
    id: "evening",
    label: "Evening",
    time: "6:00 – 8:00 PM",
    icon: "🌆",
    items: [
      { name: "Zinc", dose: "25mg", note: "Avoid taking with calcium", category: "supplement" },
      { name: "Ashwagandha", dose: "600mg", note: "Reduces cortisol, supports sleep", category: "supplement" },
    ],
  },
  {
    id: "bedtime",
    label: "Bedtime",
    time: "9:00 – 10:00 PM",
    icon: "🌙",
    items: [
      { name: "Magnesium Glycinate", dose: "400mg", note: "Second half of daily dose", category: "supplement" },
      { name: "Apigenin", dose: "50mg", note: "Sleep quality", category: "supplement" },
      { name: "Glycine", dose: "3g", note: "Deep sleep support", category: "supplement" },
    ],
  },
];

const stats = [
  { label: "Supplements", value: "11", icon: "💊" },
  { label: "Rituals", value: "2", icon: "🧘" },
  { label: "Time slots", value: "5", icon: "⏱️" },
  { label: "Stack score", value: "87%", icon: "⚡" },
];

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-stone-50 font-sans">

      {/* Top Nav */}
      <nav className="bg-white border-b border-stone-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <span className="text-xl">🌿</span>
          <span className="font-bold text-stone-900 tracking-tight">Stack Ritual</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/dashboard/search" className="text-stone-500 hover:text-stone-900 transition-colors text-sm font-medium">
            + Add supplement
          </Link>
          <div className="w-8 h-8 bg-emerald-700 rounded-full flex items-center justify-center text-white text-sm font-bold">
            C
          </div>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-stone-900">Good morning, Chris 👋</h1>
          <p className="text-stone-500 mt-1">Here&apos;s your stack for today — Thursday, March 20</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3 mb-8">
          {stats.map(s => (
            <div key={s.label} className="bg-white rounded-xl p-4 border border-stone-100 shadow-sm text-center">
              <div className="text-2xl mb-1">{s.icon}</div>
              <div className="text-xl font-bold text-stone-900">{s.value}</div>
              <div className="text-xs text-stone-500 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 mb-8">
          <Link href="/dashboard/print" className="flex items-center gap-2 bg-white border border-stone-200 text-stone-700 px-4 py-2.5 rounded-full text-sm font-medium hover:bg-stone-50 transition-colors shadow-sm">
            🖨️ Print summary
          </Link>
          <Link href="/dashboard/search" className="flex items-center gap-2 bg-emerald-700 text-white px-4 py-2.5 rounded-full text-sm font-medium hover:bg-emerald-800 transition-colors shadow-sm">
            🔬 Research supplements
          </Link>
        </div>

        {/* Time slots */}
        <div className="space-y-6">
          {timeSlots.map(slot => (
            <div key={slot.id} className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
              {/* Slot header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100 bg-stone-50">
                <div className="flex items-center gap-3">
                  <span className="text-xl">{slot.icon}</span>
                  <div>
                    <div className="font-semibold text-stone-900">{slot.label}</div>
                    <div className="text-xs text-stone-500">{slot.time}</div>
                  </div>
                </div>
                <span className="text-xs font-medium text-stone-400 bg-stone-100 px-2.5 py-1 rounded-full">
                  {slot.items.length} items
                </span>
              </div>

              {/* Items */}
              <div className="divide-y divide-stone-50">
                {slot.items.map(item => (
                  <div key={item.name} className="flex items-center justify-between px-6 py-4 hover:bg-stone-50 transition-colors group">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                        item.category === "ritual"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-emerald-100 text-emerald-700"
                      }`}>
                        {item.category === "ritual" ? "🧘" : "💊"}
                      </div>
                      <div>
                        <div className="font-medium text-stone-900">{item.name}</div>
                        <div className="text-xs text-stone-400 mt-0.5">{item.note}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-stone-600 bg-stone-100 px-2.5 py-1 rounded-full">
                        {item.dose}
                      </span>
                      <button className="opacity-0 group-hover:opacity-100 transition-opacity w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 text-xs flex items-center justify-center hover:bg-emerald-200">
                        ✓
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom padding */}
        <div className="h-12" />
      </div>
    </div>
  );
}
