# Stack Ritual — Release Notes

---

## v1.3 — 2026-03-26
### New Features
- **Smart supplement add flow** — search returns no results → green "Add [name]" button appears immediately, skips redundant search. Search returns results → white "Can't find it?" button opens form with query pre-filled
- **Brand Ratings** — rate supplement brands by quality, effectiveness, and value. Community rankings with iHerb/Amazon buy links
- **Inventory Tracking** — track doses remaining per supplement with colored badge. Auto-decrement on checkoff (smart defaults: supplements ON, rituals OFF). Manual adjustment with quick +/- buttons
- **Reorder links** — tap quantity badge to open adjuster with iHerb and Amazon reorder links
- **"Show History" link** — added below mood slider on Today page

### Improvements
- Supplement name links to edit modal on Today page (tap name to edit)
- Layout redesign on Today page — right side stacks edit/complete/badge cleanly
- "Your stack" in success messages is now a tappable link
- Profile page DB queries parallelized — faster load time
- Bottom nav restored on Research page after refactor

---

## v1.2 — 2026-03-25
### New Features
- **Mood Analytics** — History page now shows mood bar chart, supplement correlation ("your mood is X points higher on days you complete your stack"), best/worst days, trend indicator
- **Printable Mood Report** — `/dashboard/mood-report` with full daily log, stats, correlation analysis, email button
- **Auto-decrement toggle** — per stack item setting for whether checkoff reduces inventory count
- **"Supplies" unit option** — added to inventory unit dropdown
- **Mark slot done button** — each time slot on Today page has its own "Mark done" button
- **iHerb affiliate code** — `rcode=7113351` added to all iHerb links

### Improvements
- Tapping supplement name on Today page opens edit modal
- Mood report accessible from Profile quick links and Today Done stat card
- Date on Today page links to History calendar
- Done stat card links to Mood Report

---

## v1.1 — 2026-03-24
### New Features
- **Check-in History** — calendar view showing supplement completion by day with color coding. Mood emoji on each day. Tappable days show day detail modal (what was taken, times, mood + notes)
- **Mood Slider** — daily mood tracking (1-10) with emoji feedback, notes field, saves to database
- **Inventory tracking foundation** — quantity fields added to stack items
- **FAQ page** — `/faq` with iPhone/Android home screen instructions, plan comparisons, supplement info
- **Privacy Policy** — `/privacy` with full GDPR/CCPA compliance language
- **In-app feedback button** — Profile page, saves to database
- **Share app button** — native share sheet on mobile

### Improvements
- TopNav shared component — Stack Ritual logo left, page title center, Sign out right on all pages
- Bottom nav redesigned — dark emerald square active state
- Profile stat cards all tappable (In stack → My Stack, Taken today → dashboard, Experiences → Experiences tab)
- Supplement detail pages show community experiences
- "Recommended" supplements strip on Research page

---

## v1.0 — 2026-03-23 (Launch)
### Core Features
- User authentication (Clerk) with terms acceptance gate
- Today dashboard — time-grouped stack, checkoffs, progress bar, Mark all done
- My Stack — add/edit/delete supplements and rituals
- Research — 84 supplements with evidence levels, benefits, side effects, timing
- Experiences — community reviews with All/Mine filter, search, helpful thumbs up
- Profile — stats, plan card, edit name, share, feedback
- Print summary — doctor-friendly PDF with all supplements by timing
- Admin dashboard — user management, supplement library editor, moderation
- Stripe payments — Free / Plus $4.99 / Pro $9.99
- Resend email — hello@stackritual.com verified, welcome + reminder templates
- Twilio SMS — built, pending A2P approval (showing "Coming Soon")
- Supabase database — 9 tables, RLS configured
- Vercel Pro hosting with cron jobs

### Pricing
- **Free** — up to 5 supplements
- **Plus** — $4.99/mo — unlimited supplements, email reminders
- **Pro** — $9.99/mo — all features + SMS reminders (coming soon)

---

## Roadmap (Coming Soon)
- SMS reminders via Twilio (pending A2P carrier approval)
- Supplement label scanner via phone camera (Pro feature)
- Annual billing option
- Dark mode
- iOS/Android native app
- Alexa/Google Home voice integration
- Email receipt import for stack building
- Testimonials on landing page
