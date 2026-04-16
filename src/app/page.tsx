import Link from "next/link";
import Disclaimer from "@/components/Disclaimer";
import PricingButton from "@/components/PricingButton";
import { supabaseAdmin } from "@/lib/supabase";
import { visitorHasAnnualPerk } from "@/lib/affiliatePerks";
import NewsletterSignup from "@/components/NewsletterSignup";

export const dynamic = "force-dynamic";

const FALLBACK_TESTIMONIALS = [
  {
    quote: "I finally stopped forgetting my afternoon vitamins. The reminders with tap-to-done links are a game changer.",
    author: "Sarah M.",
    role: "Biohacker, Portland OR",
  },
  {
    quote: "Being able to see my mood correlate with which supplements I actually took was a lightbulb moment. Haven't missed a day in 3 weeks.",
    author: "Marcus K.",
    role: "Personal Trainer",
  },
  {
    quote: "The inventory tracking alone is worth it. No more running out of magnesium at midnight.",
    author: "Priya R.",
    role: "Nurse Practitioner",
  },
];

const AVATAR_PALETTE = [
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700",
  "bg-stone-100 text-stone-700",
  "bg-sky-100 text-sky-700",
  "bg-rose-100 text-rose-700",
  "bg-violet-100 text-violet-700",
];

async function loadTestimonials() {
  const { data } = await supabaseAdmin
    .from("app_feedback")
    .select("id, message, display_message, display_author, display_role, created_at")
    .eq("show_on_landing", true)
    .order("created_at", { ascending: false });

  if (!data || data.length === 0) return FALLBACK_TESTIMONIALS;
  return data.map(fb => ({
    quote: fb.display_message || fb.message,
    author: fb.display_author || "Anonymous",
    role: fb.display_role || "",
  }));
}

export default async function Home() {
  const [testimonials, hasAnnualPerk] = await Promise.all([
    loadTestimonials(),
    visitorHasAnnualPerk(),
  ]);
  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 font-sans">

      {/* Nav */}
      <nav className="flex items-center justify-between px-4 sm:px-8 py-4 sm:py-5 max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🌿</span>
          <span className="text-lg sm:text-xl font-bold tracking-tight">Stack Ritual</span>
        </div>
        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-6 text-sm font-medium text-stone-600">
          <Link href="#features" className="hover:text-stone-900 transition-colors">Features</Link>
          <Link href="#how-it-works" className="hover:text-stone-900 transition-colors">How it works</Link>
          <Link href="#pricing" className="hover:text-stone-900 transition-colors">Pricing</Link>
          <Link href="/sign-in" className="text-stone-600 hover:text-stone-900 transition-colors font-medium">
            Log in
          </Link>
          <Link href="/sign-up" className="bg-emerald-700 text-white px-4 py-2 rounded-full hover:bg-emerald-800 transition-colors">
            Start Now
          </Link>
        </div>
        {/* Mobile nav */}
        <div className="flex md:hidden items-center gap-3">
          <Link href="/sign-in" className="text-stone-600 text-sm font-medium hover:text-stone-900 transition-colors">
            Log in
          </Link>
          <Link href="/sign-up" className="bg-emerald-700 text-white px-3 py-1.5 rounded-full text-sm font-semibold hover:bg-emerald-800 transition-colors">
            Start Now
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-8 pt-20 pb-24 text-center">
        <div className="inline-block bg-emerald-100 text-emerald-800 text-sm font-medium px-4 py-1.5 rounded-full mb-6">
          Build habits that actually stick
        </div>
        <h1 className="text-5xl font-bold tracking-tight leading-tight mb-6 text-stone-900">
          Know your stack.<br />
          <span className="text-emerald-700">Own your health.</span>
        </h1>
        <p className="text-xl text-stone-600 max-w-2xl mx-auto mb-10 leading-relaxed">
          Research supplements, build your personal stack, get smart timing recommendations,
          and share a clean summary with your doctor — all in one place.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link href="/sign-up" className="bg-emerald-700 text-white px-8 py-4 rounded-full text-lg font-semibold hover:bg-emerald-800 transition-colors shadow-sm">
            Start for free →
          </Link>
          <Link href="#how-it-works" className="text-stone-600 px-6 py-4 rounded-full text-lg font-medium hover:text-stone-900 transition-colors">
            See how it works
          </Link>
        </div>
        <p className="text-sm text-stone-500 mt-3">Free to start · No credit card required</p>
      </section>

      {/* Social proof strip */}
      <div className="bg-emerald-700 text-white py-4 text-center text-sm font-medium">
        Trusted by people who are serious about turning good intentions into lasting health habits
      </div>

      {/* Features */}
      <section id="features" className="max-w-6xl mx-auto px-8 py-24">
        <h2 className="text-3xl font-bold text-center mb-4">Everything your stack needs</h2>
        <p className="text-stone-600 text-center mb-16 max-w-xl mx-auto">
          Stop piecing together information from a dozen websites. Stack Ritual brings it all together.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((f) => (
            <div key={f.title} className="bg-white rounded-2xl p-8 shadow-sm border border-stone-100">
              <div className="text-4xl mb-4">{f.icon}</div>
              <h3 className="text-xl font-semibold mb-3">{f.title}</h3>
              <p className="text-stone-600 leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="bg-white py-24">
        <div className="max-w-4xl mx-auto px-8">
          <h2 className="text-3xl font-bold text-center mb-4">How it works</h2>
          <p className="text-stone-600 text-center mb-16">Three steps to a smarter stack</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {steps.map((step, i) => (
              <div key={step.title} className="text-center">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
                  {i + 1}
                </div>
                <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
                <p className="text-stone-600 leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="max-w-6xl mx-auto px-8 py-24">
        <h2 className="text-3xl font-bold text-center mb-4">Loved by wellness enthusiasts</h2>
        <p className="text-stone-600 text-center mb-16">What early users are saying about Stack Ritual.</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((t, i) => {
            const initial = (t.author || "?").trim().charAt(0).toUpperCase() || "?";
            const color = AVATAR_PALETTE[i % AVATAR_PALETTE.length];
            return (
              <div key={i} className="bg-white rounded-2xl p-8 border border-stone-200 shadow-sm">
                <div className="text-emerald-600 text-3xl leading-none mb-2">&ldquo;</div>
                <p className="text-stone-700 text-sm leading-relaxed mb-6">{t.quote}</p>
                <div className="flex items-center gap-3 pt-4 border-t border-stone-100">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${color}`}>
                    {initial}
                  </div>
                  <div>
                    <div className="font-semibold text-stone-900 text-sm">{t.author}</div>
                    {t.role && <div className="text-stone-500 text-xs">{t.role}</div>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <p className="text-center text-stone-400 text-xs mt-12">
          Want to share your story? <Link href="mailto:hello@stackritual.com" className="text-emerald-700 underline">Email us</Link> — we&rsquo;d love to feature you.
        </p>
      </section>

      {/* Pricing */}
      <section id="pricing" className="max-w-6xl mx-auto px-8 py-24">
        <h2 className="text-3xl font-bold text-center mb-4">Simple pricing</h2>
        <p className="text-stone-600 text-center mb-10">Start free. Upgrade when you&apos;re ready.</p>

        {hasAnnualPerk && (
          <div className="mb-12 max-w-3xl mx-auto bg-gradient-to-br from-emerald-50 to-amber-50 border-2 border-emerald-300 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-center gap-2 mb-3">
              <span className="bg-emerald-700 text-white text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full">🎁 Exclusive Affiliate Offer</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-center text-stone-900 mb-2">
              Save 33% with annual billing
            </h3>
            <p className="text-center text-stone-700 text-sm mb-5">
              Because you came in through a partner link, you&rsquo;ve unlocked annual pricing on Plus and Pro:
            </p>
            <div className="grid grid-cols-2 gap-3 max-w-md mx-auto mb-5">
              <div className="bg-white rounded-xl p-4 border border-emerald-200 text-center">
                <div className="text-xs text-stone-500 uppercase tracking-wider font-semibold">Plus Annual</div>
                <div className="text-2xl font-bold text-stone-900 mt-1">$39.99<span className="text-sm font-normal text-stone-500">/yr</span></div>
                <div className="text-[11px] text-emerald-700 font-semibold mt-0.5">Save $20</div>
              </div>
              <div className="bg-white rounded-xl p-4 border border-emerald-200 text-center">
                <div className="text-xs text-stone-500 uppercase tracking-wider font-semibold">Pro Annual</div>
                <div className="text-2xl font-bold text-stone-900 mt-1">$79.99<span className="text-sm font-normal text-stone-500">/yr</span></div>
                <div className="text-[11px] text-emerald-700 font-semibold mt-0.5">Save $40</div>
              </div>
            </div>
            <div className="bg-white/70 border border-emerald-200 rounded-xl p-4 text-sm text-stone-700">
              <p className="font-semibold text-stone-900 mb-1">How to claim:</p>
              <ol className="list-decimal pl-5 space-y-1">
                <li>Sign up for the free plan below.</li>
                <li>Inside the app, go to <strong>Profile → Manage subscription</strong>.</li>
                <li>You&rsquo;ll see the annual options unlocked there. Choose Plus or Pro yearly.</li>
              </ol>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Free */}
          <div className="bg-white rounded-2xl p-8 border border-stone-200 shadow-sm">
            <h3 className="text-xl font-bold mb-1">Free</h3>
            <div className="text-4xl font-bold mb-1">$0</div>
            <p className="text-stone-500 text-sm mb-6">Forever free</p>
            <ul className="space-y-3 text-stone-700 mb-8">
              {freeTier.map(f => <li key={f} className="flex items-center gap-2 text-sm"><span className="text-emerald-600">✓</span>{f}</li>)}
            </ul>
<PricingButton label="Get started free" className="block text-center border border-stone-300 text-stone-700 py-3 rounded-full font-medium hover:bg-stone-50 transition-colors text-sm" />
          </div>
          {/* Plus */}
          <div className="bg-stone-900 text-white rounded-2xl p-8 shadow-md">
            <h3 className="text-xl font-bold mb-1">Plus</h3>
            <div className="text-4xl font-bold mb-1">$4.99<span className="text-lg font-normal opacity-75">/mo</span></div>
            <p className="text-stone-400 text-sm mb-6">Billed monthly</p>
            <ul className="space-y-3 text-stone-300 mb-8">
              {plusTier.map(f => <li key={f} className="flex items-center gap-2 text-sm"><span className="text-emerald-400">✓</span>{f}</li>)}
            </ul>
<PricingButton label="Subscribe" className="block text-center bg-emerald-600 text-white py-3 rounded-full font-semibold hover:bg-emerald-500 transition-colors text-sm" />
          </div>
          {/* Pro */}
          <div className="bg-emerald-700 text-white rounded-2xl p-8 shadow-md relative overflow-hidden">
            <div className="absolute top-4 right-4 bg-amber-400 text-amber-900 text-xs font-bold px-2.5 py-1 rounded-full">BEST VALUE</div>
            <h3 className="text-xl font-bold mb-1">Pro</h3>
            <div className="text-4xl font-bold mb-1">$9.99<span className="text-lg font-normal opacity-75">/mo</span></div>
            <p className="text-emerald-200 text-sm mb-6">Billed monthly</p>
            <ul className="space-y-3 text-emerald-50 mb-8">
              {proTier.map(f => <li key={f} className="flex items-center gap-2 text-sm"><span className="text-emerald-300">✓</span>{f}</li>)}
            </ul>
<PricingButton label="Subscribe" className="block text-center bg-white text-emerald-800 py-3 rounded-full font-semibold hover:bg-emerald-50 transition-colors text-sm" />
          </div>
        </div>

        {/* Referral Offer */}
        <div className="mt-10 text-center">
          <p className="text-red-600 font-bold text-lg">Limited Time Referral Offer</p>
          <p className="text-stone-700 text-sm mt-1">
            Sign up for the Pro Plan &gt; Refer your friends &gt; Get your next month free!
          </p>
          <p className="text-stone-400 text-xs mt-2 max-w-md mx-auto">
            Earn 1 free month of Pro for every friend who signs up for the Pro Plan. Up to 6 free months total.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-stone-900 text-white py-20 text-center px-8">
        <h2 className="text-3xl font-bold mb-4">Ready to optimize your ritual?</h2>
        <p className="text-stone-400 mb-10 text-lg">Stack Ritual has launched! Start tracking your supplements today.</p>
        <div className="flex flex-col items-center gap-3">
          <Link href="/sign-up" className="bg-emerald-500 text-white px-10 py-4 rounded-full text-lg font-semibold hover:bg-emerald-400 transition-colors">
            Start for free →
          </Link>
          <p className="text-stone-400 text-sm">No credit card required</p>
        </div>
      </section>

      {/* Newsletter */}
      <section className="max-w-3xl mx-auto px-8 py-10">
        <NewsletterSignup source="landing-footer" variant="card" />
      </section>

      {/* Disclaimer */}
      <div className="max-w-3xl mx-auto px-8 py-8">
        <Disclaimer />
      </div>

      {/* Footer */}
      <footer className="max-w-6xl mx-auto px-8 py-10 text-stone-500 text-sm">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span>🌿</span>
            <span className="font-semibold text-stone-700">Stack Ritual</span>
          </div>
          <p>© 2026 Stack Ritual. All rights reserved.</p>
          <div className="grid grid-cols-3 gap-x-6 gap-y-2 text-center">
            <Link href="/affiliate-program" className="hover:text-stone-700 transition-colors">Affiliates</Link>
            <Link href="/privacy" className="hover:text-stone-700 transition-colors">Privacy Policy</Link>
            <Link href="/faq" className="hover:text-stone-700 transition-colors">FAQ</Link>
            <Link href="/help" className="hover:text-stone-700 transition-colors">User Guide</Link>
            <Link href="/terms" className="hover:text-stone-700 transition-colors">Terms</Link>
          </div>
        </div>
        <div className="mt-6 pt-4 border-t border-stone-200 text-center text-xs text-stone-400">
          Built by <a href="https://thoughtsparkai.com" target="_blank" rel="noopener noreferrer" className="text-stone-500 hover:text-stone-700 transition-colors">ThoughtSparkAI.com</a> · From the makers of <a href="https://moneyandmacros.com" target="_blank" rel="noopener noreferrer" className="text-stone-500 hover:text-stone-700 transition-colors">MoneyAndMacros.com</a>
        </div>
      </footer>

    </div>
  );
}

const features = [
  {
    icon: "🔬",
    title: "Research Library",
    description: "Clear, evidence-based info on hundreds of supplements. Benefits, side effects, interactions, and dosage — in plain English.",
  },
  {
    icon: "🧱",
    title: "My Stack Builder",
    description: "Build your personal supplement and wellness stack. See everything at a glance — what you're taking and exactly what it's doing for you.",
  },
  {
    icon: "⏱️",
    title: "Smart Timing Engine",
    description: "Know when to take what. We analyze your full stack and build a daily schedule that maximizes absorption and avoids conflicts.",
  },
  {
    icon: "📦",
    title: "Inventory Tracking",
    description: "Track how many doses you have left. Get low-supply alerts before you run out and reorder in one tap from iHerb or Amazon.",
  },
  {
    icon: "⭐",
    title: "Brand Ratings",
    description: "Community-rated supplement brands ranked by quality, effectiveness, and value. Find out which brands are actually worth buying.",
  },
  {
    icon: "🖨️",
    title: "Print & Share",
    description: "Generate a clean, one-page summary of your stack to share with your doctor, coach, or anyone who needs to know what you're taking.",
  },
  {
    icon: "🧘",
    title: "Rituals & Activities",
    description: "Your stack isn't just supplements. Add cold plunges, sauna, fasting, red light therapy, and more to your complete daily ritual.",
  },
  {
    icon: "💬",
    title: "Community Experiences",
    description: "See what real people report from their stacks. Community-sourced effectiveness data alongside clinical evidence.",
  },
  {
    icon: "📷",
    title: "Scan Any Label",
    description: "Point your camera at any supplement bottle and AI instantly reads the label — product name, brand, dose, ingredients, and quantity — to add or update your stack in seconds.",
  },
];

const steps = [
  {
    title: "Build your ritual stack",
    description: "Add the supplements and wellness practices you want to make a habit. Stack Ritual organizes them into a daily schedule that fits your life.",
  },
  {
    title: "Connect to your existing habits",
    description: "Attach your supplements to moments you already do — morning coffee, meals, bedtime. Habit stacking makes new routines stick.",
  },
  {
    title: "Track streaks. See progress.",
    description: "Check off your stack daily, watch your streak grow, and see how your mood and energy change over time. Share a clean summary with your doctor.",
  },
];

const freeTier = [
  "Up to 5 supplements",
  "Basic research library",
  "Stack builder",
  "Print & share summary",
  "Community experiences",
  "Affiliate buy links",
];

const plusTier = [
  "Everything in Free",
  "Unlimited supplements",
  "Smart timing engine",
  "Interactions checker",
  "Daily email reminders",
  "Weekly progress summary",
  "Rituals & activities tracker",
  "Advanced research data",
];

const proTier = [
  "Everything in Plus",
  "📷 Label scanner (AI-powered)",
  "📱 SMS reminders (coming soon)",
  "📱 Tap-to-mark-done via text (coming soon)",
  "Custom reminder times",
  "Priority support",
];
