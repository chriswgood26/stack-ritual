import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "User Guide — Stack Ritual",
  description: "Everything you need to know about tracking supplements, building habits, and using Stack Ritual.",
};

// Table of contents — edit section content directly below.
const SECTIONS = [
  { id: "getting-started", title: "Getting Started" },
  { id: "your-stack", title: "Your Stack" },
  { id: "today-page", title: "The Today Page" },
  { id: "reminders", title: "Reminders (Email & SMS)" },
  { id: "inventory", title: "Inventory Tracking" },
  { id: "mood", title: "Mood & Analytics" },
  { id: "history", title: "History & Check-In Calendar" },
  { id: "research", title: "Research Library" },
  { id: "experiences", title: "Community Experiences" },
  { id: "scan-label", title: "Scan a Supplement Label" },
  { id: "sharing", title: "Sharing & Affiliates" },
  { id: "billing", title: "Plans & Billing" },
  { id: "account", title: "Account & Privacy" },
  { id: "troubleshooting", title: "Troubleshooting" },
];

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 pt-10">
      <h2 className="text-2xl font-bold text-stone-900 mb-4 flex items-center gap-2">
        {title}
        <a href={`#${id}`} className="text-stone-300 hover:text-emerald-600 text-sm no-underline">#</a>
      </h2>
      <div className="prose prose-stone max-w-none text-stone-700 text-sm leading-relaxed space-y-3">
        {children}
      </div>
    </section>
  );
}

export default function HelpPage() {
  return (
    <div className="min-h-screen bg-stone-50 font-sans">
      <nav className="bg-white border-b border-stone-200 px-4 py-4 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-stone-900 font-bold">
            <span className="text-2xl">🌿</span>
            <span>Stack Ritual</span>
          </Link>
          <div className="flex gap-4 text-sm text-stone-600">
            <Link href="/faq" className="hover:text-emerald-700">FAQ</Link>
            <Link href="/dashboard" className="hover:text-emerald-700">Open app</Link>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-10 grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-10">
        {/* Sticky TOC */}
        <aside className="hidden lg:block">
          <div className="sticky top-24 bg-white rounded-2xl border border-stone-100 p-4">
            <div className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-3">Contents</div>
            <nav className="space-y-1.5 text-sm">
              {SECTIONS.map(s => (
                <a key={s.id} href={`#${s.id}`} className="block text-stone-600 hover:text-emerald-700 transition-colors">
                  {s.title}
                </a>
              ))}
            </nav>
          </div>
        </aside>

        {/* Content */}
        <main>
          <div className="mb-10">
            <h1 className="text-4xl font-bold text-stone-900 mb-3">User Guide</h1>
            <p className="text-stone-500">
              Everything you need to get the most out of Stack Ritual. Use the menu on the left (or scroll) to jump to a section.
            </p>
          </div>

          <Section id="getting-started" title="Getting Started">
            <p>Welcome to Stack Ritual. This guide walks you through everything from building your first stack to using reminders, tracking inventory, and reviewing your history.</p>
            <p><strong>Quick-start checklist:</strong></p>
            <ol className="list-decimal pl-5 space-y-1.5">
              <li>Sign up at <Link href="/sign-up" className="text-emerald-700 underline">stackritual.com/sign-up</Link></li>
              <li>Add your first supplements from the Research page or the custom add form</li>
              <li>Set when you take each one (morning, afternoon, evening, bedtime, etc.)</li>
              <li>Check items off as you take them each day</li>
              <li>Optional: turn on email or SMS reminders in your Profile settings</li>
            </ol>
          </Section>

          <Section id="your-stack" title="Your Stack">
            <p>Your stack is the list of supplements and rituals you take on a regular basis. To view and manage it, tap <strong>My Stack</strong> in the bottom navigation.</p>
            <p><strong>Adding items:</strong></p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Research New</strong> — browse the curated library of supplements with evidence ratings, benefits, and timing recommendations</li>
              <li><strong>Add new supplement or ritual to my stack</strong> — use this link below the search bar to add something not in the database, scan a label, or search the database directly</li>
            </ul>
            <p><strong>Pausing items:</strong> tap the ⏸ button on any item to temporarily hide it from the Today page and stop it from triggering reminders, without losing your settings. Paused items appear in an &ldquo;Inactive&rdquo; section at the bottom of My Stack, and you can resume them any time.</p>
            <p><strong>Editing:</strong> tap the ✏️ icon or the supplement name to edit dose, timing, brand, notes, quantity tracking, and per-serving count.</p>
          </Section>

          <Section id="today-page" title="The Today Page">
            <p>The Today page is your daily command center. It shows exactly what you need to take today, grouped by time slot (morning, afternoon, evening, etc.), along with your progress and mood slider.</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Check off items</strong> as you take them — the progress bar updates in real time</li>
              <li><strong>Mark slot done</strong> — check off an entire time slot in one tap</li>
              <li><strong>Mark all done</strong> — for when you&rsquo;ve taken everything for the day</li>
              <li><strong>As-needed items</strong> appear in their own section — only tap these when you actually take them</li>
              <li><strong>Mood slider</strong> at the bottom lets you log how you feel today on a 1–10 scale with optional notes</li>
            </ul>
          </Section>

          <Section id="reminders" title="Reminders (Email & SMS)">
            <p>Stack Ritual can remind you when it&rsquo;s time to take your supplements.</p>
            <p><strong>Email reminders</strong> (Plus and Pro plans): go to <strong>Profile → Email Reminders</strong>, toggle on, and choose the time slots you want reminders for. Each reminder email includes a &ldquo;Mark these all done&rdquo; button that marks the whole slot as complete — no need to open the app.</p>
            <p><strong>SMS reminders</strong> (Pro plan only, pending carrier approval): same deal, but delivered by text. Reply <strong>STOP</strong> any time to unsubscribe, or <strong>HELP</strong> for help.</p>
            <p>The tap-to-complete link in each reminder is valid only for the day it was sent.</p>
          </Section>

          <Section id="inventory" title="Inventory Tracking">
            <p>Stack Ritual can track how many capsules (or servings) you have left of each supplement, decrement the count automatically when you check off a dose, and warn you when you&rsquo;re running low.</p>
            <p><strong>Setup:</strong> tap the ✏️ icon on any stack item → enter the total quantity (e.g., 90 capsules), remaining quantity, and unit (capsules, softgels, scoops, etc.).</p>
            <p><strong>Per-serving count:</strong> if the label says <em>&ldquo;Serving size: 2 capsules&rdquo;</em>, enter <strong>2</strong> in the Per serving field. Each time you check off that supplement, the inventory decrements by 2 instead of 1, so your counts stay accurate.</p>
            <p><strong>Low supply alerts:</strong> when you&rsquo;re down to about 2 weeks&rsquo; worth, you&rsquo;ll get an email with a one-click reorder link.</p>
            <p><strong>Manual adjustment:</strong> tap the colored &ldquo;remaining&rdquo; badge on any item to add/subtract or set an exact number.</p>
          </Section>

          <Section id="mood" title="Mood & Analytics">
            <p>Log your mood daily on a 1–10 scale with optional notes. Over time, Stack Ritual correlates your mood with which supplements you actually took and surfaces patterns.</p>
            <p>Visit the <strong>Mood Report</strong> (tap the &ldquo;Done&rdquo; stat card on the Today page, or go to <strong>Profile → Mood Report</strong>) to see:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>7, 30, 90-day mood averages</li>
              <li>Best and worst days</li>
              <li>Supplement correlations (&ldquo;your mood is X points higher on days you take Y&rdquo;)</li>
              <li>Trend indicators (improving / stable / declining)</li>
            </ul>
          </Section>

          <Section id="history" title="History & Check-In Calendar">
            <p>The <strong>History</strong> page (tap the date on the Today page or the History icon in the bottom nav) shows a calendar view of your completion percentage and mood for each day.</p>
            <p>Tap any day to see exactly what you took, when, and your mood/notes for that day. Useful for reviewing patterns, sharing with a doctor, or reflecting on how a protocol is working.</p>
          </Section>

          <Section id="research" title="Research Library">
            <p>Browse 80+ evidence-rated supplements on the <strong>Research</strong> page. Each entry includes:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Evidence level (strong / moderate / limited)</li>
              <li>Benefits and common uses</li>
              <li>Timing recommendations (with/without food, AM vs PM, etc.)</li>
              <li>Dose ranges</li>
              <li>Side effects and interactions</li>
              <li>Community experiences</li>
            </ul>
            <p>From any detail page, tap <strong>Add to my stack</strong> to start tracking it immediately.</p>
          </Section>

          <Section id="experiences" title="Community Experiences">
            <p>Read and share real experiences with supplements from other Stack Ritual users. Every experience is linked to a specific supplement and includes a rating, what they&rsquo;re taking it for, how long, side effects, and notes.</p>
            <p>Share your own from <strong>Profile → Share your first experience</strong> or any supplement detail page.</p>
          </Section>

          <Section id="scan-label" title="Scan a Supplement Label">
            <p>Plus and Pro members can scan a supplement label with their phone camera to auto-fill the name, brand, dose, serving size, and container quantity.</p>
            <p>Look for the &ldquo;📷 Scan label&rdquo; link at the top of any add/edit form. Take a clear photo of the <strong>Supplement Facts</strong> panel — Claude Vision does the rest.</p>
          </Section>

          <Section id="sharing" title="Sharing & Affiliates">
            <p>Love Stack Ritual? You have two ways to share:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Casual share</strong> — the &ldquo;Love Stack Ritual? Share with a friend&rdquo; link in emails opens the native share sheet on mobile or a pre-filled email on desktop</li>
              <li><strong>Affiliate program</strong> — earn commission on every referral. <Link href="/affiliate-program" className="text-emerald-700 underline">Apply here</Link>. 50% first month, 10% recurring for the life of the subscription.</li>
            </ul>
          </Section>

          <Section id="billing" title="Plans & Billing">
            <p>Stack Ritual has three tiers:</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li><strong>Free</strong> — up to 5 supplements, basic research library</li>
              <li><strong>Plus ($4.99/mo)</strong> — unlimited supplements, full research library, email reminders, community experiences</li>
              <li><strong>Pro ($9.99/mo)</strong> — everything in Plus + SMS reminders (pending carrier approval), click-to-mark-taken texts, priority support</li>
            </ul>
            <p>Manage your subscription from <strong>Profile → Manage billing</strong>. Upgrades take effect immediately, downgrades at the end of your current billing period.</p>
          </Section>

          <Section id="account" title="Account & Privacy">
            <p><strong>Edit profile:</strong> tap the ✏️ icon next to your name on the Profile page to update your first name.</p>
            <p><strong>Privacy:</strong> your supplement data is private by default and never shared with third parties. See our <Link href="/privacy" className="text-emerald-700 underline">Privacy Policy</Link> for the full details.</p>
            <p><strong>Data export:</strong> email <a href="mailto:hello@stackritual.com" className="text-emerald-700 underline">hello@stackritual.com</a> and we&rsquo;ll send you an export of everything we have for your account.</p>
            <p><strong>Delete account:</strong> same — email us and we&rsquo;ll delete within 7 days.</p>
          </Section>

          <Section id="troubleshooting" title="Troubleshooting">
            <p><strong>I&rsquo;m not getting email reminders.</strong> Check Profile → Email Reminders is toggled on, check your spam folder, make sure hello@stackritual.com is whitelisted, and confirm your plan is Plus or Pro.</p>
            <p><strong>My tap-to-done email link says &ldquo;expired&rdquo;.</strong> Links are only valid for the day they were sent. Open the app directly to mark items done after that.</p>
            <p><strong>My inventory count is wrong.</strong> Tap the colored &ldquo;remaining&rdquo; badge on the supplement and adjust manually. If auto-decrement is off (in the edit dialog), check-offs won&rsquo;t touch inventory.</p>
            <p><strong>I added a supplement but I don&rsquo;t see it on the Today page.</strong> Make sure you set a timing — supplements without a timing show up in the &ldquo;Unscheduled&rdquo; slot, not the time-specific slots.</p>
            <p><strong>Something else?</strong> Email <a href="mailto:hello@stackritual.com" className="text-emerald-700 underline">hello@stackritual.com</a> — we respond within a day.</p>
          </Section>

          <div className="mt-16 py-8 border-t border-stone-200 text-center">
            <p className="text-stone-500 text-sm mb-4">Can&rsquo;t find what you&rsquo;re looking for?</p>
            <a href="mailto:hello@stackritual.com" className="inline-block bg-emerald-700 text-white px-6 py-3 rounded-full text-sm font-semibold hover:bg-emerald-800 transition-colors">
              Email us
            </a>
          </div>
        </main>
      </div>
    </div>
  );
}
