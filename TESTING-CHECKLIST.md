# Stack Ritual — Post-Deploy Testing Checklist

Cuts through everything shipped in this batch: affiliate program, admin sidebar revamp, pause/inactive items, and the email share-link bug fix.

---

## 1. Affiliate Program — Public

- [ ] Visit `https://stackritual.com/affiliate-program` — page loads, copy looks right
- [ ] Submit the interest form with name + email + (optional) message → success message appears
- [ ] In Supabase, confirm a row was created in `affiliate_interest` with `status = 'pending'`
- [ ] Visit `https://stackritual.com/?ref=TESTCODE` — landing loads normally
- [ ] In browser DevTools → Application → Cookies, confirm `affiliate_ref=TESTCODE` cookie was set with ~90-day expiry
- [ ] Footer link from landing page to `/affiliate-program` works

## 2. Affiliate Program — Admin

- [ ] Sign in as admin → `/admin/affiliates` loads sidebar and list
- [ ] Create a new affiliate manually with custom code, email, 50% / 10% defaults
- [ ] Open the new affiliate's detail page → all fields render
- [ ] Edit a field (e.g., recurring_percentage), click Save → redirects back to list and change persists
- [ ] Click "Send Welcome Email" → email lands in the affiliate's inbox from `hello@stackritual.com`
- [ ] Welcome email renders correctly: code, percentages, referral link all present
- [ ] Add a payout entry on the detail page → list updates, total paid reflects new amount
- [ ] Delete a payout → total updates correctly
- [ ] Approve a pending interest signup (if applicable workflow) → row moves correctly

## 3. Admin Sidebar Revamp

- [ ] `/admin` loads with sidebar layout, not the old all-on-one view
- [ ] Sidebar shows: Dashboard, Users, Supplements, Experiences, Feedback, Affiliates (and any others)
- [ ] Each sidebar link routes to its page and highlights when active
- [ ] On mobile (<768px), hamburger menu appears and toggles sidebar overlay
- [ ] Tap outside the open mobile sidebar → it closes

## 4. Admin Dashboard

- [ ] 6 stat cards show real counts: Users, Stack Items, Experiences, Feedback, Pending Subs, Affiliates
- [ ] Website Traffic section shows: Today / This Week / This Month / All Time
- [ ] Period-over-period comparisons render (↑/↓ % vs prior period)
- [ ] Last Year row appears under All Time card
- [ ] Traffic Sources bar chart shows referrers from this month (Google, Direct, etc.) — populates as real traffic comes in

## 4b. My Stack Page — Add New Flow

- [ ] Top of My Stack page: only one "Search my stack" search bar (placeholder shows "Search my stack")
- [ ] Just below the search bar there's a small green text link: "+ Add new supplement or ritual to my stack →" (NOT a wide white button)
- [ ] No "+ Add to my stack" wide button at the bottom of the page
- [ ] In the top stack-stats card, the action button is labeled "🔬 Research New" (was "+ Add to My Stack")
- [ ] Type something in the search my stack bar (e.g. "magnesium"), then click the green "+ Add new..." link → the panel opens, the database search box already shows "magnesium" and search results render
- [ ] Inside the panel, the inner search box placeholder is "Add to my stack" (not "Search our database first…")
- [ ] Click the panel's "Add new supplement or ritual →" button to advance to the details form
- [ ] Details form shows ALL fields: name, category, dose, timing (when to take), brand, where purchased, **inventory (Total / Remaining / Unit)**, brief description
- [ ] Toggle the "Ritual" tab → inventory section disappears (not relevant for rituals); brand and purchased fields hide too
- [ ] Fill in name + timing + dose + inventory totals, click "Add to stack ✓"
- [ ] Panel closes immediately and the new item appears in the stack list above WITHOUT a manual page refresh
- [ ] A small "✓ Added [name] to your stack" banner appears briefly above the link
- [ ] If the user enters a name that exists in the database, they see a message and the form moves back to search step

## 4c. Add Flow Uniformity (all entry points have the same fields)

- [ ] **My Stack → Add new** (above): all fields present including inventory ✓ (covered in 4b)
- [ ] **Research page → no results → Add custom**: form shows name, category, dose, timing, brand, purchased, **inventory**, description
- [ ] **Research detail page → "+ Add to my stack"**: form shows dose, timing, brand, purchased, **inventory**
- [ ] **Scan Label** (any entry point): scan modal shows productName, brand, dose, **timing dropdown**, **inventory (Total / Remaining / Unit)** — pre-filled from the OCR scan when available
- [ ] After saving from any of these entry points, the new item appears in My Stack and on Today (assuming timing is set)
- [ ] Inventory total set on add → shows up immediately on item card with the colored badge
- [ ] Inventory remaining defaults to total when only total is entered

## 5. Pause / Inactive Stack Items

- [ ] On My Stack page, each active supplement and ritual shows a ⏸ pause icon next to edit/delete
- [ ] Click ⏸ on a supplement → page refreshes, item moves to new "Inactive" section at the bottom
- [ ] Inactive section shows "Hidden from Today and reminders. Resume any time."
- [ ] Inactive items render grayed/dimmed
- [ ] Visit Today page (`/dashboard`) → paused item is NOT in the list, not in counts, not in any time slot
- [ ] Mark All Done / time-slot Mark Done buttons work without paused items
- [ ] Return to My Stack → click "▶ Resume" on the inactive item → it returns to active section
- [ ] Today page now shows it again
- [ ] Pause a ritual → same behavior
- [ ] Pause every item in your stack → My Stack still renders the Inactive section (does NOT show "Your stack is empty")
- [ ] Today page with all items paused → shows empty state correctly
- [ ] Resume an item from the all-paused state → returns to Today

## 6. Pause — Reminders & Cron (if you have email/SMS configured)

- [ ] Daily email reminders do not include paused items (next reminder cycle)
- [ ] SMS reminders do not include paused items
- [ ] Weekly summary email stack count excludes paused items
- [ ] Low-supply alerts are not sent for paused items even if `quantity_remaining` is low

## 7. Email Share-Link Bug Fix

- [ ] Trigger or wait for a low-supply alert email
- [ ] On desktop Outlook: "Love Stack Ritual? Share..." link goes to `https://stackritual.com` (no SMS warning)
- [ ] On mobile (Gmail/Apple Mail): same link clicks through to the website normally
- [ ] No `sms:` URLs anywhere in the email source

## 7b. Releases & Roadmap Module

- [ ] Sidebar shows "📋 Releases & Roadmap" link
- [ ] `/admin/releases` loads inside the admin sidebar (no duplicate top nav)
- [ ] Release notes still render with all 4 versions and their feature lists
- [ ] Roadmap section appears below release notes with 3 status groups (🚧 In Progress, ✓ Vetted, 💡 Idea)
- [ ] Existing seed items show up grouped by status
- [ ] Add a new idea via the input → appears in 💡 Idea group immediately
- [ ] Add a new idea with description → description text shows below the title
- [ ] Change an item's status using the dropdown → it moves to the appropriate group
- [ ] Delete an item via ✕ → confirmation prompt → item gone

## 8. Regression — Existing Features Still Work

- [ ] Add a new supplement to stack → appears as active, shows on Today
- [ ] Edit an existing item (dose, timing, brand) → saves correctly
- [ ] Delete an item → confirmation flow works, item gone
- [ ] Check off an item → daily log records it, progress bar updates
- [ ] Mark All Done works on Today page
- [ ] Mood slider saves
- [ ] History calendar still loads
- [ ] Print summary still loads
- [ ] Stripe billing portal still works (Manage Billing button)

## 8b. SMS Reminders (once A2P campaign is approved)

**Prerequisites:**
- Run `database-sms-timezone.sql` in Supabase
- Set `NEXT_PUBLIC_SMS_ENABLED=true` in Vercel env
- Set `TWILIO_MESSAGING_SERVICE_SID` in Vercel env
- Confirm A2P campaign status = "Approved" in Twilio console

**Opt-in flow:**
- [ ] Profile → SMS Reminders → opens modal with working form (not "Coming Soon")
- [ ] Toggle Enable → phone number input + consent checkbox appear
- [ ] Try to Save with consent unchecked → save button disabled, error if bypassed
- [ ] Enter phone, check consent, Save → confirmation text arrives within seconds
- [ ] Confirmation text says "Reply YES to confirm..." with Msg&data disclosure
- [ ] Text YES back → receive thank-you text within seconds
- [ ] Profile → SMS settings now shows "✓ Your number is confirmed"
- [ ] "Send test message" button appears and works
- [ ] Test SMS arrives with 🌿 emoji and correct copy
- [ ] Row appears in `user_profiles` with `sms_consent_at`, `sms_consent_ip`, `sms_consent_text` populated

**STOP/HELP keywords:**
- [ ] Text STOP → receive unsubscribe confirmation, `sms_opted_out=true`
- [ ] Profile SMS modal now shows "You've unsubscribed" banner
- [ ] Text START → receive welcome-back, `sms_opted_out=false`
- [ ] Text HELP → receive help text with support email

**Timezone handling:**
- [ ] User in Pacific time sets morning reminder to 08:00
- [ ] Wait for the 08:00 PT cron tick → SMS arrives ~8:00 PT, not 08:00 UTC
- [ ] User in Eastern time sets evening to 19:00 → arrives at 19:00 ET, not UTC
- [ ] `timezone` column populated in `user_profiles` for logged-in users

**Reminder content:**
- [ ] Reminder includes "Reply STOP to unsubscribe, HELP for help"
- [ ] "Mark all done" link works and marks items done via the /done page
- [ ] Paused items do NOT appear in reminders
- [ ] Already-checked items do NOT appear in reminders
- [ ] User with all items done for the day gets NO reminder

**Admin SMS monitor:**
- [ ] Sidebar shows "📱 SMS" link
- [ ] `/admin/sms` shows stats: Enabled, Confirmed, Opted Out, Sent Today, Failed Today
- [ ] Recent Activity section lists last 50 messages with kind/status/body
- [ ] Recent Errors section only appears when there are failures
- [ ] Every outbound SMS creates a row in `sms_logs` with correct kind

**Terms & Privacy:**
- [ ] `/terms` includes Section 8 "SMS / Text Messaging" with all disclosures
- [ ] `/privacy` includes Section 7 "SMS / Text Messaging"
- [ ] Subsequent sections are renumbered correctly (no gaps or duplicates)

## 9. Smoke Tests

- [ ] Sign out / sign in flow works
- [ ] Public pages load: `/`, `/faq`, `/privacy`, `/terms`, `/disclaimer`, `/affiliate-program`
- [ ] No console errors on any page
- [ ] No 500s in Vercel logs after first 30 min of traffic
