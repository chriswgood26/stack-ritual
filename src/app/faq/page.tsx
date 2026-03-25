import Link from "next/link";

const faqs = [
  {
    category: "Getting Started",
    questions: [
      {
        q: "Is Stack Ritual free?",
        a: "Yes — Stack Ritual has a free plan that lets you add up to 5 supplements and access the core features including the research library, stack builder, and print summary. Upgrade to Plus ($4.99/mo) or Pro ($9.99/mo) for unlimited supplements and additional features."
      },
      {
        q: "How do I add Stack Ritual to my phone's home screen?",
        a: null, // handled specially below
        isSpecial: true,
      },
      {
        q: "Do I need to create an account?",
        a: "Yes — a free account is required to save your stack and access your data across devices. Sign up takes about 60 seconds and only requires your name and email."
      },
      {
        q: "Is there a mobile app?",
        a: "Stack Ritual is a web app that works great on mobile browsers. You can add it to your home screen for an app-like experience (see instructions above). A native iOS and Android app is on our roadmap."
      },
    ]
  },
  {
    category: "Plans & Pricing",
    questions: [
      {
        q: "What's the difference between Free, Plus, and Pro?",
        a: "Free includes up to 5 supplements, basic research, and the print summary. Plus ($4.99/mo) adds unlimited supplements, the full research library, email reminders, and weekly summaries. Pro ($9.99/mo) adds everything in Plus plus SMS text reminders with click-to-mark-done links (coming soon)."
      },
      {
        q: "What happens if I cancel my subscription?",
        a: "Your account stays active until the end of your current billing period. After that it downgrades to the Free plan — your data is preserved, but you'll be limited to 5 active supplements. You can resubscribe at any time."
      },
      {
        q: "Can I get a refund?",
        a: "We don't offer refunds for partial subscription periods. If you have a billing issue or concern, contact us at support@stackritual.com and we'll do our best to help."
      },
      {
        q: "Is there a yearly plan?",
        a: "Monthly billing is available now. Annual billing with a discount is coming soon — sign up for our email updates to be notified when it launches."
      },
    ]
  },
  {
    category: "Privacy & Security",
    questions: [
      {
        q: "Is my health data private and secure?",
        a: "Yes. Your data is stored securely using industry-standard encryption. We never sell your personal information to third parties. Your supplement stack and health data are only visible to you. See our Privacy Policy for full details."
      },
      {
        q: "Can Stack Ritual use my data for research?",
        a: "Community experiences you choose to share are visible to other users. Your personal stack, daily logs, and mood data are private to your account only. We do not share individual health data with third parties."
      },
      {
        q: "Can I delete my account and data?",
        a: "Yes. Contact us at privacy@stackritual.com to request account deletion. We'll delete all your personal data within 30 days."
      },
    ]
  },
  {
    category: "Using the App",
    questions: [
      {
        q: "How does the timing engine work?",
        a: "When you add a supplement, you choose when to take it (morning fasted, with food, afternoon, evening, bedtime, etc.). Stack Ritual organizes your daily view by these time slots. For supplements you take multiple times per day, each dose gets its own slot and checkoff."
      },
      {
        q: "Can I share my stack with my doctor?",
        a: "Yes! The Print Summary feature (accessible from the Today page or My Stack) generates a clean, one-page PDF showing everything you take, your doses, timing, and the purpose of each supplement. It's designed specifically to share with healthcare providers."
      },
      {
        q: "Can I track medications in addition to supplements?",
        a: "Stack Ritual is designed for supplements and wellness rituals. You can add medications as custom items using the 'Add supplement or ritual' feature. However, Stack Ritual does not provide medication information, interaction warnings, or medical advice for prescription drugs. Always consult your doctor or pharmacist for medication guidance."
      },
      {
        q: "What are rituals?",
        a: "Rituals are non-supplement wellness practices you want to track consistently — things like cold showers, sauna sessions, red light therapy, intermittent fasting, or any other daily health practice. They appear on your Today dashboard alongside your supplements."
      },
      {
        q: "Can I see how my mood correlates with my supplement routine?",
        a: "Yes! The Mood & Wellness Report (accessible from the History page or your Profile) shows your average daily mood, trends over time, and — most valuably — how your mood compares on days you complete your stack vs. days you don't."
      },
    ]
  },
  {
    category: "Supplements & Research",
    questions: [
      {
        q: "Where does the supplement information come from?",
        a: "Our supplement database is researched and written based on peer-reviewed scientific literature, including data from the NIH Office of Dietary Supplements and clinical studies. Each supplement includes an evidence level rating (Strong, Moderate, or Limited) to help you understand how well-studied it is."
      },
      {
        q: "What if my supplement isn't in your database?",
        a: "You can add any supplement or ritual not in our database using the 'Add supplement or ritual' button on the My Stack or Research pages. Submissions are reviewed and may be added to the main database for all users."
      },
      {
        q: "Is the supplement information medical advice?",
        a: "No. All information on Stack Ritual is for educational purposes only and does not constitute medical advice. Always consult a qualified healthcare provider before starting, changing, or stopping any supplement regimen."
      },
    ]
  },
];

function HomeScreenInstructions() {
  return (
    <div className="space-y-4">
      <div className="bg-stone-50 rounded-xl p-4">
        <h4 className="font-semibold text-stone-900 mb-2 flex items-center gap-2">
          <span>🍎</span> iPhone / iPad (Safari)
        </h4>
        <ol className="list-decimal pl-5 space-y-1.5 text-stone-600 text-sm">
          <li>Open <strong>stackritual.com</strong> in Safari</li>
          <li>Tap the <strong>Share button</strong> (box with arrow pointing up) at the bottom of the screen</li>
          <li>Scroll down and tap <strong>&quot;Add to Home Screen&quot;</strong></li>
          <li>Tap <strong>&quot;Add&quot;</strong> in the top right corner</li>
          <li>The Stack Ritual 🌿 icon will appear on your home screen</li>
        </ol>
      </div>
      <div className="bg-stone-50 rounded-xl p-4">
        <h4 className="font-semibold text-stone-900 mb-2 flex items-center gap-2">
          <span>🤖</span> Android (Chrome)
        </h4>
        <ol className="list-decimal pl-5 space-y-1.5 text-stone-600 text-sm">
          <li>Open <strong>stackritual.com</strong> in Chrome</li>
          <li>Tap the <strong>three-dot menu</strong> (⋮) in the top right corner</li>
          <li>Tap <strong>&quot;Add to Home screen&quot;</strong> or <strong>&quot;Install app&quot;</strong></li>
          <li>Tap <strong>&quot;Add&quot;</strong> to confirm</li>
          <li>The Stack Ritual 🌿 icon will appear on your home screen</li>
        </ol>
      </div>
      <p className="text-xs text-stone-500">Once added, Stack Ritual opens full-screen like a native app — no browser bar visible.</p>
    </div>
  );
}

function FAQItem({ q, a, isSpecial }: { q: string; a: string | null; isSpecial?: boolean }) {
  return (
    <details className="group border-b border-stone-100 last:border-0">
      <summary className="flex items-center justify-between py-4 cursor-pointer list-none">
        <span className="font-medium text-stone-900 pr-4">{q}</span>
        <span className="text-stone-400 flex-shrink-0 group-open:rotate-180 transition-transform text-lg">▼</span>
      </summary>
      <div className="pb-4 text-stone-600 text-sm leading-relaxed">
        {isSpecial ? <HomeScreenInstructions /> : <p>{a}</p>}
      </div>
    </details>
  );
}

export default function FAQPage() {
  return (
    <div className="min-h-screen bg-stone-50 font-sans">
      <nav className="bg-white border-b border-stone-200 px-4 py-3.5 flex items-center gap-3">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-lg">🌿</span>
          <span className="font-bold text-stone-900">Stack Ritual</span>
        </Link>
      </nav>

      <div className="max-w-3xl mx-auto px-4 py-10 pb-20">
        <h1 className="text-3xl font-bold text-stone-900 mb-2">Frequently Asked Questions</h1>
        <p className="text-stone-500 mb-10">Everything you need to know about Stack Ritual.</p>

        <div className="space-y-8">
          {faqs.map(section => (
            <div key={section.category}>
              <h2 className="text-lg font-bold text-stone-900 mb-1">{section.category}</h2>
              <div className="bg-white rounded-2xl border border-stone-100 shadow-sm px-6 divide-y divide-stone-100">
                {section.questions.map(faq => (
                  <FAQItem key={faq.q} q={faq.q} a={faq.a} isSpecial={faq.isSpecial} />
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 bg-emerald-50 border border-emerald-100 rounded-2xl p-6 text-center">
          <p className="text-stone-700 font-medium mb-2">Still have questions?</p>
          <p className="text-stone-500 text-sm mb-4">We&apos;re happy to help.</p>
          <a href="mailto:support@stackritual.com"
            className="bg-emerald-700 text-white px-6 py-3 rounded-full text-sm font-semibold hover:bg-emerald-800 transition-colors inline-block">
            Contact support
          </a>
        </div>

        <div className="mt-8 flex gap-6 text-sm justify-center">
          <Link href="/terms" className="text-emerald-600 hover:underline">Terms & Conditions</Link>
          <Link href="/privacy" className="text-emerald-600 hover:underline">Privacy Policy</Link>
          <Link href="/" className="text-stone-500 hover:text-stone-700">← Home</Link>
        </div>
      </div>
    </div>
  );
}
