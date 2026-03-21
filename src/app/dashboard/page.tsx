import Link from "next/link";
import Disclaimer from "@/components/Disclaimer";

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
  { label: "Slots", value: "5", icon: "⏱️" },
  { label: "Score", value: "87%", icon: "⚡" },
];

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-stone-50 font-sans">

      {/* Top Nav */}
      <nav className="bg-white border-b border-stone-200 px-4 py-3.5 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <span className="text-lg">🌿</span>
          <span className="font-bold text-stone-900 tracking-tight">Stack Ritual</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/dashboard/search" className="text-emerald-700 text-sm font-semibold">
            + Add
          </Link>
          <div className="w-8 h-8 bg-emerald-700 rounded-full flex items-center justify-center text-white text-sm font-bold">
            C
          </div>
        </div>
      </nav>

      <div className="max-w-lg mx-auto px-4 py-6">

        {/* Header */}
        <div className="mb-5">
          <h1 className="text-xl font-bold text-stone-900">Good morning, Chris 👋</h1>
          <p className="text-stone-500 text-sm mt-0.5">Thursday, March 20 · Your daily stack</p>
        </div>

        {/* Stats - 2x2 on mobile */}
        <div className="grid grid-cols-4 gap-2 mb-5">
          {stats.map(s => (
            <div key={s.label} className="bg-white rounded-xl p-3 border border-stone-100 shadow-sm text-center">
              <div className="text-lg mb-0.5">{s.icon}</div>
              <div className="text-base font-bold text-stone-900">{s.value}</div>
              <div className="text-xs text-stone-500 leading-tight">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Quick actions */}
        <div className="flex gap-2 mb-6">
          <Link href="/dashboard/print" className="flex-1 flex items-center justify-center gap-1.5 bg-white border border-stone-200 text-stone-700 px-3 py-2.5 rounded-full text-sm font-medium hover:bg-stone-50 transition-colors shadow-sm">
            🖨️ Print summary
          </Link>
          <Link href="/dashboard/search" className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-700 text-white px-3 py-2.5 rounded-full text-sm font-medium hover:bg-emerald-800 transition-colors shadow-sm">
            🔬 Research
          </Link>
        </div>

        {/* Time slots */}
        <div className="space-y-4">
          {timeSlots.map(slot => (
            <div key={slot.id} className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
              {/* Slot header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100 bg-stone-50">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{slot.icon}</span>
                  <div>
                    <div className="font-semibold text-stone-900 text-sm">{slot.label}</div>
                    <div className="text-xs text-stone-500">{slot.time}</div>
                  </div>
                </div>
                <span className="text-xs font-medium text-stone-400 bg-stone-100 px-2 py-0.5 rounded-full">
                  {slot.items.length}
                </span>
              </div>

              {/* Items */}
              <div className="divide-y divide-stone-50">
                {slot.items.map(item => (
                  <div key={item.name} className="flex items-center justify-between px-4 py-3.5">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0 ${
                        item.category === "ritual"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-emerald-100 text-emerald-700"
                      }`}>
                        {item.category === "ritual" ? "🧘" : "💊"}
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium text-stone-900 text-sm">{item.name}</div>
                        <div className="text-xs text-stone-400 truncate">{item.note}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                      <span className="text-xs font-medium text-stone-600 bg-stone-100 px-2 py-1 rounded-full whitespace-nowrap">
                        {item.dose}
                      </span>
                      <button className="w-7 h-7 rounded-full border-2 border-stone-200 hover:border-emerald-500 hover:bg-emerald-50 transition-colors flex items-center justify-center">
                        <span className="text-xs text-stone-300 hover:text-emerald-600">✓</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Disclaimer */}
        <div className="mt-6 mb-2">
          <Disclaimer compact />
        </div>

        <div className="h-8" />
      </div>

      {/* Bottom Tab Bar — mobile nav */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-stone-200 flex items-center justify-around px-4 py-2 z-10">
        <Link href="/dashboard" className="flex flex-col items-center gap-0.5 text-emerald-700">
          <span className="text-xl">🏠</span>
          <span className="text-xs font-medium">Today</span>
        </Link>
        <Link href="/dashboard/search" className="flex flex-col items-center gap-0.5 text-stone-400">
          <span className="text-xl">🔍</span>
          <span className="text-xs">Research</span>
        </Link>
        <Link href="/dashboard/stack" className="flex flex-col items-center gap-0.5 text-stone-400">
          <span className="text-xl">🧱</span>
          <span className="text-xs">My Stack</span>
        </Link>
        <Link href="/dashboard/community" className="flex flex-col items-center gap-0.5 text-stone-400">
          <span className="text-xl">💬</span>
          <span className="text-xs">Community</span>
        </Link>
        <Link href="/dashboard/profile" className="flex flex-col items-center gap-0.5 text-stone-400">
          <span className="text-xl">👤</span>
          <span className="text-xs">Profile</span>
        </Link>
      </div>

    </div>
  );
}
