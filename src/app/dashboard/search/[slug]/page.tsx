import Link from "next/link";
import Disclaimer from "@/components/Disclaimer";

// Sample data — will come from database later
const supplementData: Record<string, {
  name: string;
  icon: string;
  category: string;
  tagline: string;
  evidence: string;
  description: string;
  benefits: string[];
  sideEffects: string[];
  timing: string;
  dose: string;
  interactions: { name: string; type: "positive" | "negative" | "neutral"; note: string }[];
  inStack: boolean;
}> = {
  "vitamin-d3": {
    name: "Vitamin D3",
    icon: "☀️",
    category: "Vitamins",
    tagline: "The sunshine vitamin",
    evidence: "strong",
    description: "Vitamin D3 (cholecalciferol) is a fat-soluble vitamin that your body produces when skin is exposed to sunlight. Most people in modern society are deficient due to indoor lifestyles and sunscreen use. It plays a critical role in immune function, bone health, mood regulation, and hundreds of other biological processes.",
    benefits: [
      "Supports immune system function",
      "Promotes calcium absorption & bone density",
      "Linked to improved mood & reduced depression risk",
      "May reduce risk of certain cancers",
      "Supports cardiovascular health",
      "Improves insulin sensitivity",
    ],
    sideEffects: [
      "Toxicity possible at very high doses (>10,000 IU/day long-term)",
      "May cause nausea or weakness if overconsumed",
      "Can raise calcium levels if taken without K2",
    ],
    timing: "Morning with food — fat-soluble, requires dietary fat for absorption. Take with your largest meal.",
    dose: "2,000–5,000 IU daily for most adults. Get blood levels tested (aim for 50–80 ng/mL).",
    interactions: [
      { name: "Vitamin K2", type: "positive", note: "K2 directs calcium to bones, preventing arterial calcification from D3" },
      { name: "Magnesium", type: "positive", note: "Required to activate Vitamin D — deficiency limits effectiveness" },
      { name: "Omega-3", type: "positive", note: "Both fat-soluble, synergistic anti-inflammatory effects" },
      { name: "Calcium supplements", type: "negative", note: "High-dose D3 + calcium supplements may raise calcium too high" },
    ],
    inStack: true,
  },
  "magnesium-glycinate": {
    name: "Magnesium Glycinate",
    icon: "🪨",
    category: "Minerals",
    tagline: "The relaxation mineral",
    evidence: "strong",
    description: "Magnesium is involved in over 300 enzymatic reactions in the body. The glycinate form is one of the most bioavailable and gentle on the stomach. Up to 75% of Americans are deficient in magnesium due to soil depletion and processed food diets. It's foundational for sleep, stress response, and muscle function.",
    benefits: [
      "Significantly improves sleep quality and depth",
      "Reduces anxiety and stress response",
      "Relieves muscle cramps and tension",
      "Supports energy production (ATP synthesis)",
      "Regulates blood pressure",
      "Required to activate Vitamin D",
    ],
    sideEffects: [
      "Very safe — excess is excreted via urine",
      "Very high doses may cause loose stools (less common with glycinate form)",
      "May cause drowsiness — ideal for evening use",
    ],
    timing: "Split dose: half in the morning with food, half 1 hour before bed for sleep benefits.",
    dose: "300–400mg elemental magnesium daily. Glycinate form preferred for sleep and anxiety.",
    interactions: [
      { name: "Vitamin D3", type: "positive", note: "Magnesium activates Vitamin D — take together" },
      { name: "Zinc", type: "negative", note: "Compete for absorption — space 2+ hours apart" },
      { name: "Calcium", type: "negative", note: "High calcium intake reduces magnesium absorption" },
      { name: "Apigenin", type: "positive", note: "Both support sleep — powerful combination at bedtime" },
    ],
    inStack: true,
  },
};

const evidenceColor: Record<string, string> = {
  strong: "bg-emerald-100 text-emerald-700",
  moderate: "bg-amber-100 text-amber-700",
  limited: "bg-stone-100 text-stone-500",
};

const interactionColor: Record<string, string> = {
  positive: "bg-emerald-50 border-emerald-200 text-emerald-800",
  negative: "bg-red-50 border-red-200 text-red-800",
  neutral: "bg-stone-50 border-stone-200 text-stone-700",
};

const interactionIcon: Record<string, string> = {
  positive: "✅",
  negative: "⚠️",
  neutral: "ℹ️",
};

export default function SupplementPage({ params }: { params: { slug: string } }) {
  const supp = supplementData[params.slug];

  if (!supp) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center font-sans">
        <div className="text-center px-8">
          <div className="text-5xl mb-4">🔍</div>
          <h1 className="text-xl font-bold text-stone-900 mb-2">Supplement not found</h1>
          <p className="text-stone-500 mb-6">We&apos;re still building our database. Check back soon!</p>
          <Link href="/dashboard/search" className="bg-emerald-700 text-white px-6 py-3 rounded-full font-medium hover:bg-emerald-800 transition-colors">
            Back to Research
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 font-sans pb-24">

      {/* Top Nav */}
      <nav className="bg-white border-b border-stone-200 px-4 py-3.5 flex items-center gap-3 sticky top-0 z-10">
        <Link href="/dashboard/search" className="text-stone-400 hover:text-stone-700 transition-colors text-lg">
          ←
        </Link>
        <span className="font-bold text-stone-900 tracking-tight flex-1 truncate">{supp.name}</span>
        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${evidenceColor[supp.evidence]}`}>
          {supp.evidence} evidence
        </span>
      </nav>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-5">

        {/* Header card */}
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center text-3xl">
              {supp.icon}
            </div>
            <div>
              <h1 className="text-xl font-bold text-stone-900">{supp.name}</h1>
              <p className="text-stone-500 text-sm">{supp.category} · {supp.tagline}</p>
            </div>
          </div>
          <p className="text-stone-700 text-sm leading-relaxed">{supp.description}</p>
        </div>

        {/* Add to stack button */}
        {supp.inStack ? (
          <button className="w-full bg-emerald-50 border border-emerald-200 text-emerald-700 py-3.5 rounded-2xl font-semibold flex items-center justify-center gap-2">
            ✓ In your stack
          </button>
        ) : (
          <button className="w-full bg-emerald-700 text-white py-3.5 rounded-2xl font-semibold hover:bg-emerald-800 transition-colors flex items-center justify-center gap-2 shadow-sm">
            + Add to my stack
          </button>
        )}

        {/* Timing & Dose */}
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5">
          <h2 className="font-semibold text-stone-900 mb-3">⏱️ Timing & Dosage</h2>
          <div className="space-y-3">
            <div className="bg-stone-50 rounded-xl p-3.5">
              <div className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1">Best time to take</div>
              <p className="text-stone-700 text-sm leading-relaxed">{supp.timing}</p>
            </div>
            <div className="bg-stone-50 rounded-xl p-3.5">
              <div className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1">Suggested dose</div>
              <p className="text-stone-700 text-sm leading-relaxed">{supp.dose}</p>
            </div>
          </div>
        </div>

        {/* Benefits */}
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5">
          <h2 className="font-semibold text-stone-900 mb-3">✅ Benefits</h2>
          <ul className="space-y-2">
            {supp.benefits.map(b => (
              <li key={b} className="flex items-start gap-2.5 text-sm text-stone-700">
                <span className="text-emerald-500 mt-0.5 flex-shrink-0">•</span>
                {b}
              </li>
            ))}
          </ul>
        </div>

        {/* Side Effects */}
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5">
          <h2 className="font-semibold text-stone-900 mb-3">⚠️ Side Effects & Risks</h2>
          <ul className="space-y-2">
            {supp.sideEffects.map(s => (
              <li key={s} className="flex items-start gap-2.5 text-sm text-stone-700">
                <span className="text-amber-500 mt-0.5 flex-shrink-0">•</span>
                {s}
              </li>
            ))}
          </ul>
        </div>

        {/* Interactions */}
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5">
          <h2 className="font-semibold text-stone-900 mb-3">🔗 Interactions</h2>
          <div className="space-y-2">
            {supp.interactions.map(i => (
              <div key={i.name} className={`rounded-xl border p-3.5 ${interactionColor[i.type]}`}>
                <div className="flex items-center gap-2 mb-1">
                  <span>{interactionIcon[i.type]}</span>
                  <span className="font-semibold text-sm">{i.name}</span>
                </div>
                <p className="text-xs leading-relaxed opacity-90">{i.note}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Buy links */}
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5">
          <h2 className="font-semibold text-stone-900 mb-3">🛒 Where to buy</h2>
          <div className="space-y-2">
            <a href="#" className="flex items-center justify-between bg-stone-50 rounded-xl px-4 py-3 hover:bg-stone-100 transition-colors">
              <span className="text-sm font-medium text-stone-700">iHerb</span>
              <span className="text-xs text-emerald-600 font-medium">View →</span>
            </a>
            <a href="#" className="flex items-center justify-between bg-stone-50 rounded-xl px-4 py-3 hover:bg-stone-100 transition-colors">
              <span className="text-sm font-medium text-stone-700">Amazon</span>
              <span className="text-xs text-emerald-600 font-medium">View →</span>
            </a>
            <a href="#" className="flex items-center justify-between bg-stone-50 rounded-xl px-4 py-3 hover:bg-stone-100 transition-colors">
              <span className="text-sm font-medium text-stone-700">Thorne</span>
              <span className="text-xs text-emerald-600 font-medium">View →</span>
            </a>
          </div>
          <p className="text-xs text-stone-400 mt-3 text-center">Stack Ritual may earn a commission on purchases</p>
        </div>

        <Disclaimer />

      </div>

      {/* Bottom Tab Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-stone-200 flex items-center justify-around px-4 py-2 z-10">
        <Link href="/dashboard" className="flex flex-col items-center gap-0.5 text-stone-400">
          <span className="text-xl">🏠</span>
          <span className="text-xs">Today</span>
        </Link>
        <Link href="/dashboard/search" className="flex flex-col items-center gap-0.5 text-emerald-700">
          <span className="text-xl">🔍</span>
          <span className="text-xs font-medium">Research</span>
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
