import Link from "next/link";
import Disclaimer from "@/components/Disclaimer";
import AddCustomSupplement from "@/components/AddCustomSupplement";

const stackItems = [
  { name: "Vitamin D3", dose: "5,000 IU", frequency: "Daily", timing: "Morning with food", category: "supplement", icon: "☀️", brand: "Thorne" },
  { name: "Vitamin K2", dose: "200mcg", frequency: "Daily", timing: "Morning with food", category: "supplement", icon: "🟡", brand: "Life Extension" },
  { name: "Omega-3", dose: "2g EPA/DHA", frequency: "Daily", timing: "Morning with food", category: "supplement", icon: "🐟", brand: "Nordic Naturals" },
  { name: "Magnesium Glycinate", dose: "400mg", frequency: "Daily", timing: "Split AM/PM", category: "supplement", icon: "🪨", brand: "Pure Encapsulations" },
  { name: "NMN", dose: "500mg", frequency: "Daily", timing: "Morning fasted", category: "supplement", icon: "⏳", brand: "Tru Niagen" },
  { name: "Berberine", dose: "500mg", frequency: "Daily", timing: "Morning fasted", category: "supplement", icon: "🌱", brand: "Thorne" },
  { name: "CoQ10", dose: "200mg", frequency: "Daily", timing: "Afternoon with food", category: "supplement", icon: "⚡", brand: "Jarrow" },
  { name: "Lions Mane", dose: "1,000mg", frequency: "Daily", timing: "Afternoon", category: "supplement", icon: "🧠", brand: "Host Defense" },
  { name: "Zinc", dose: "25mg", frequency: "Daily", timing: "Evening", category: "supplement", icon: "🔵", brand: "Thorne" },
  { name: "Ashwagandha", dose: "600mg", frequency: "Daily", timing: "Evening", category: "supplement", icon: "🌿", brand: "KSM-66" },
  { name: "Apigenin", dose: "50mg", frequency: "Daily", timing: "Bedtime", category: "supplement", icon: "🌼", brand: "Swanson" },
  { name: "Glycine", dose: "3g", frequency: "Daily", timing: "Bedtime", category: "supplement", icon: "💤", brand: "Bulk Supplements" },
  { name: "Cold Shower", dose: "3 min", frequency: "Daily", timing: "Morning fasted", category: "ritual", icon: "🚿", brand: "" },
  { name: "Red Light Therapy", dose: "10 min", frequency: "Daily", timing: "Afternoon", category: "ritual", icon: "🔴", brand: "Mito Red" },
];

const timingGroups: Record<string, string[]> = {
  "Morning fasted": [],
  "Morning with food": [],
  "Afternoon": [],
  "Evening": [],
  "Bedtime": [],
  "Split AM/PM": [],
};

stackItems.forEach(item => {
  if (timingGroups[item.timing] !== undefined) {
    timingGroups[item.timing].push(item.name);
  }
});

export default function MyStackPage() {
  const supplements = stackItems.filter(i => i.category === "supplement");
  const rituals = stackItems.filter(i => i.category === "ritual");

  return (
    <div className="min-h-screen bg-stone-50 font-sans pb-24">

      {/* Top Nav */}
      <nav className="bg-white border-b border-stone-200 px-4 py-3.5 flex items-center justify-between sticky top-0 z-10">
        <span className="font-bold text-stone-900 tracking-tight">My Stack</span>
        <Link
          href="/dashboard/search"
          className="bg-emerald-700 text-white text-sm font-semibold px-4 py-1.5 rounded-full hover:bg-emerald-800 transition-colors"
        >
          + Add
        </Link>
      </nav>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">

        {/* Stack stats */}
        <div className="bg-emerald-700 rounded-2xl p-5 text-white">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-2xl font-bold">{stackItems.length} items</div>
              <div className="text-emerald-200 text-sm">{supplements.length} supplements · {rituals.length} rituals</div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">87%</div>
              <div className="text-emerald-200 text-sm">Stack score</div>
            </div>
          </div>
          <div className="flex gap-2">
            <Link
              href="/dashboard/print"
              className="flex-1 bg-white/20 hover:bg-white/30 transition-colors text-white text-sm font-medium py-2.5 rounded-xl text-center"
            >
              🖨️ Print summary
            </Link>
            <Link
              href="/dashboard/search"
              className="flex-1 bg-white/20 hover:bg-white/30 transition-colors text-white text-sm font-medium py-2.5 rounded-xl text-center"
            >
              🔬 Research
            </Link>
          </div>
        </div>

        {/* Supplements */}
        <div>
          <h2 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-3">
            💊 Supplements ({supplements.length})
          </h2>
          <div className="space-y-2">
            {supplements.map(item => (
              <div key={item.name} className="bg-white rounded-2xl border border-stone-100 shadow-sm px-4 py-4 flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center text-xl flex-shrink-0">
                  {item.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-stone-900 text-sm">{item.name}</div>
                  <div className="text-xs text-stone-400 mt-0.5">
                    {item.dose} · {item.timing}
                    {item.brand && <span className="ml-1">· {item.brand}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button className="text-stone-300 hover:text-stone-600 transition-colors text-lg">✏️</button>
                  <button className="text-stone-300 hover:text-red-500 transition-colors text-lg">🗑️</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Rituals */}
        <div>
          <h2 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-3">
            🧘 Rituals ({rituals.length})
          </h2>
          <div className="space-y-2">
            {rituals.map(item => (
              <div key={item.name} className="bg-white rounded-2xl border border-stone-100 shadow-sm px-4 py-4 flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center text-xl flex-shrink-0">
                  {item.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-stone-900 text-sm">{item.name}</div>
                  <div className="text-xs text-stone-400 mt-0.5">
                    {item.dose} · {item.timing}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button className="text-stone-300 hover:text-stone-600 transition-colors text-lg">✏️</button>
                  <button className="text-stone-300 hover:text-red-500 transition-colors text-lg">🗑️</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Add from database */}
        <Link
          href="/dashboard/search"
          className="flex items-center justify-center gap-2 bg-emerald-700 text-white rounded-2xl py-4 font-medium text-sm hover:bg-emerald-800 transition-colors"
        >
          🔬 Search supplement database
        </Link>

        {/* Add custom */}
        <AddCustomSupplement />

        <Disclaimer compact />
      </div>

      {/* Bottom Tab Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-stone-200 flex items-center justify-around px-4 py-2 z-10">
        <Link href="/dashboard" className="flex flex-col items-center gap-0.5 text-stone-400">
          <span className="text-xl">🏠</span>
          <span className="text-xs">Today</span>
        </Link>
        <Link href="/dashboard/search" className="flex flex-col items-center gap-0.5 text-stone-400">
          <span className="text-xl">🔍</span>
          <span className="text-xs">Research</span>
        </Link>
        <Link href="/dashboard/stack" className="flex flex-col items-center gap-0.5 text-emerald-700">
          <span className="text-xl">🧱</span>
          <span className="text-xs font-medium">My Stack</span>
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
