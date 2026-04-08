import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import RoadmapManager from "@/components/RoadmapManager";

const ADMIN_USER_IDS = ["user_3BGCbiChIFduGWHj5gzAmUxoK51"];

const releases = [
  {
    version: "v1.3",
    date: "2026-03-26",
    label: "Latest",
    labelColor: "bg-emerald-100 text-emerald-700",
    features: [
      "Smart supplement add flow — no results shows green quick-add, results shows white button with pre-filled query",
      "Brand Ratings — rate supplement brands by quality, effectiveness, and value with community rankings",
      "Inventory Tracking — track doses remaining with colored badge, auto-decrement on checkoff",
      "Reorder links in quantity adjuster — iHerb and Amazon with affiliate codes",
      "Show History link below mood slider on Today page",
      "Profile My Stack shows '5 most recently added' subtitle",
      "Billing portal fix for live Stripe mode",
      "Profile page DB queries parallelized for faster load",
      "Bottom nav and TopNav restored on Research page",
    ],
  },
  {
    version: "v1.2",
    date: "2026-03-25",
    label: null,
    labelColor: "",
    features: [
      "Mood Analytics — bar chart, supplement correlation, best/worst days, trend indicator",
      "Printable Mood Report with daily log, stats, and email button",
      "Auto-decrement toggle per stack item",
      "Supplies unit option in inventory dropdown",
      "Mark slot done button on each time slot",
      "iHerb affiliate code (rcode=7113351) on all buy links",
      "Tapping supplement name on Today page opens edit modal",
      "Done stat card links to Mood Report",
    ],
  },
  {
    version: "v1.1",
    date: "2026-03-24",
    label: null,
    labelColor: "",
    features: [
      "Check-in History calendar with color-coded completion and mood emoji",
      "Tappable days show day detail modal",
      "Daily mood tracking (1-10) with notes",
      "FAQ page at /faq with iPhone/Android home screen instructions",
      "Privacy Policy at /privacy",
      "In-app feedback button on Profile",
      "TopNav shared component across all dashboard pages",
      "Bottom nav redesigned with dark emerald active state",
      "Community experiences shown on supplement detail pages",
      "Recommended supplements strip on Research page",
    ],
  },
  {
    version: "v1.0",
    date: "2026-03-23",
    label: "Launch",
    labelColor: "bg-blue-100 text-blue-700",
    features: [
      "User authentication with Clerk and terms acceptance gate",
      "Today dashboard — time-grouped stack, checkoffs, progress bar",
      "My Stack — add/edit/delete supplements and rituals",
      "Research — 84 supplements with evidence levels, benefits, timing",
      "Experiences — community reviews with search and helpful thumbs up",
      "Profile — stats, plan card, edit name, share, feedback",
      "Print summary — doctor-friendly PDF",
      "Admin dashboard — user management, supplement library, moderation",
      "Stripe payments — Free / Plus $4.99 / Pro $9.99 (live mode)",
      "Resend email — hello@stackritual.com verified",
      "Twilio SMS — built, pending A2P approval",
    ],
  },
];

export default async function ReleasesPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");
  if (!ADMIN_USER_IDS.includes(user.id)) redirect("/dashboard");

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Releases & Roadmap</h1>

      <div className="max-w-3xl space-y-6">
        {releases.map(release => (
          <div key={release.version} className="bg-stone-800 rounded-2xl border border-stone-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-stone-700 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="font-bold text-white text-xl">{release.version}</span>
                {release.label && (
                  <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${release.labelColor}`}>
                    {release.label}
                  </span>
                )}
              </div>
              <span className="text-stone-500 text-sm">{release.date}</span>
            </div>
            <ul className="px-6 py-4 space-y-2">
              {release.features.map((f, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-stone-300">
                  <span className="text-emerald-500 mt-0.5 flex-shrink-0">✓</span>
                  {f}
                </li>
              ))}
            </ul>
          </div>
        ))}

        <RoadmapManager />
      </div>
    </div>
  );
}
