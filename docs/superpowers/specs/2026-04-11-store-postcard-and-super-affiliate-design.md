# Stack Ritual — Store Postcard & Super Affiliate Program

**Date:** 2026-04-11
**Scope:** Two related marketing initiatives for Stack Ritual:
1. A printable 4×6 postcard for in-person outreach to supplement stores and direct prospects
2. A "super affiliate" compensation program for creators/influencers who drive annual-plan signups

Both initiatives share the same motivation: grow SR's subscriber base by recruiting external distribution partners (stores and creators) rather than relying solely on direct-to-consumer marketing.

---

## Part 1: Store Postcard

### Goal

A physical 4×6 postcard that serves two purposes from a single design:

1. **Recruitment pitch to store owners.** When an owner receives the card, they see the affiliate program on the back and are prompted to sign up.
2. **Counter-facing consumer marketing.** Once an owner signs up, the card sits on their counter face-up (consumer side) and drives subscriber signups among their customers.

Primary audience is store owners first. The consumer side exists to make the card useful sitting on a counter after the owner is recruited. A later print run may produce consumer-side-only variants once the program is validated.

### Physical specifications

- **Size:** 4×6" standard postcard (USPS First-Class Mail compatible)
- **Print resolution:** 300 DPI → 1200×1800 px per side
- **Bleed:** 0.125" all edges → working canvas 1275×1875 px
- **Safe area:** 0.125" inside → text must stay within 1125×1725 px
- **Finish:** Matte (writable with pen if we want to hand-sign)
- **Stock:** 14pt or 16pt cover — stiff enough to stand on a counter

### Front — Consumer side (face-up on the counter)

**Layout top-to-bottom:**

**Top third:**
- SR logomark top-left, small
- Headline (~48pt bold sans): "Never miss a dose. Never run out."
- Subhead (~18pt lighter): "Your supplement routine, finally on autopilot."

**Middle third:**
- Phone mockup showing the SR ritual-check or dashboard UI, right-aligned
- Left column, three checkmark bullets:
  - Track every pill, powder & capsule in one place
  - Get reminders before you run out
  - Build streaks and stick with your routine

**Bottom third (contrasting CTA band):**
- QR code ~1" square, aligned right
- Left of QR: "Scan to start free" (bold) + smaller "Tell us which store sent you 👉"
- **QR target:** `https://stackritual.com/?utm_source=postcard&utm_medium=print&utm_campaign=store_tour`

### Back — Store owner side (affiliate pitch)

**Top third:**
- Headline (~40pt): "Your customers are already building their supplement routine."
- Subhead (~24pt bold): "Get paid when they use ours."

**Middle third:**
- Pitch paragraph (~14pt):
  > Stack Ritual is a supplement tracking app your customers already want. Put this card on your counter and earn a commission every time one subscribes. No extra work. No inventory. Just pass out the card.

- Four hook bullets:
  - **💰 Upfront commissions** — get paid for every annual signup, no waiting for drip payments
  - **🎁 Unlock a bigger deal for your customers** — qualified stores unlock discounted annual pricing to offer their customers
  - **⚡ Free to join** — 2-minute signup
  - **🖼 We send a custom counter display** after you're enrolled

**Bottom third (contrasting CTA band):**
- QR code ~1" square, aligned right
- Left of QR: "Become an affiliate" (bold) + smaller "Scan to sign up — takes 2 minutes"
- **QR target:** `https://stackritual.com/affiliate`

### Design notes

- Keep specific commission dollar amounts OFF the card. Use "upfront commissions" and "bigger deals" as hooks only. This lets us tune the actual commission rates and annual pricing without reprinting.
- Primary color pulled from the existing SR site palette
- Heading/body font pair pulled from the existing SR site
- The CTA band on the back should use the same color treatment as the front CTA band for visual consistency

### Required web change to support the postcard

**One small change to the SR signup page:**

Add an optional field: **"Referred by a store? (optional)"**

- Searchable dropdown populated from `/api/affiliates?active=true`, returning `{code, name}` for active affiliates
- Include a free-text "Other — type store name" option so attribution isn't lost for stores that haven't yet enrolled
- On submit:
  - If user selects an existing affiliate: set the `affiliate_ref` cookie to that code (existing attribution flow takes over)
  - If user typed a free-text store name: save as `referred_store_name_pending` on the signup record for manual credit review

This is a small, self-contained change to the signup flow. Implementation can happen in a separate plan once the cards are in hand.

### Open decisions (to revisit)

- None remaining. Ready to move to a Canva/Figma mockup.

---

## Part 2: Super Affiliate Program

### Goal

Create a premium affiliate tier aimed at creators and influencers with established audiences in the supplement, wellness, fitness, or health space. Super affiliates earn a flat upfront bounty for every follower who signs up for an annual SR plan, in exchange for promoting SR to their audience.

This tier sits above the existing regular affiliate program (which earns recurring monthly commissions on monthly plans). The two tiers do not overlap: super affiliates earn on annual signups only, and regular affiliates earn on monthly signups only.

### Why it exists

The annual plans ($39.99/yr Plus, $79.99/yr Pro) already exist and are gated behind the `offers_annual_perk=true` flag on the affiliates table — meaning their discounted pricing is only shown to visitors who arrive via a qualified affiliate's link. The super affiliate program formalizes this: it defines who gets the `offers_annual_perk` flag, how they get paid, and what they promise in return.

### Compensation structure

| Referred signup | Super affiliate earns |
|---|---|
| Plus annual ($39.99) | **$5.00 upfront** |
| Pro annual ($79.99) | **$24.00 upfront** |
| Plus monthly ($4.99) | **$0** (not eligible — regular affiliates own monthly) |
| Pro monthly ($9.99) | **$0** (not eligible — regular affiliates own monthly) |

**Effective rates (of gross revenue):**
- Plus: 12.5%
- Pro: 30%

**SR economics after commission and ~3% Stripe fees:**

| Plan | Gross | Stripe | Commission | **SR net** |
|---|---|---|---|---|
| Plus annual | $39.99 | ~$1.50 | $5.00 | **$33.49** |
| Pro annual | $79.99 | ~$2.60 | $24.00 | **$53.39** |

These margins are healthy when compared against the realistic (post-churn) LTV of a monthly plan, and SR receives all revenue upfront — a material cashflow improvement over a 12-month monthly subscription.

### Payout mechanics

- **Bounty is one-time upfront.** No recurring commission on renewals. If a referred customer renews their annual plan a year later, SR keeps 100% of the renewal revenue.
- **30-day hold period.** Bounties are accrued on signup but not paid out until 30 days have passed. If the customer refunds or cancels inside that 30-day window, the bounty is voided (no clawback needed — the money hasn't been sent yet).
- **Monthly payout cadence.** Super affiliate payouts are processed on the 1st of each month for all bounties that cleared their 30-day hold during the prior month.
- **Attribution window: 30 days.** A super affiliate's referral cookie credits them for any signup that occurs within 30 days of the follower first clicking their link. Clicks older than 30 days do not earn attribution.
- **Last-click wins.** If a visitor clicks multiple affiliate links within the attribution window, the most recent click receives credit.
- **Plan choice is the customer's.** Super affiliate links unlock annual pricing options via the existing `affiliate_ref` cookie mechanism, but the visitor can still choose monthly if they prefer. In that case, the super affiliate earns nothing on that signup (the regular affiliate rate does not apply to super affiliates on monthly plans).

### Qualification criteria

To be offered the super affiliate tier, an applicant must meet both:

1. **Audience size:** 5,000+ followers or subscribers on any platform where they publish supplement, wellness, fitness, or health-related content. Qualifying platforms include Instagram, YouTube, TikTok, X/Twitter, and newsletter subscriber lists. Podcast audiences count if verifiable.

2. **Topical relevance:** Their content must be actively related to supplements, wellness, fitness, biohacking, or health — verified by a manual review of their recent posts/videos.

Initial qualification is by manual review. There is no open self-service application for the super tier — it is offered to applicants who meet the criteria after they complete the regular affiliate signup form and indicate a content platform.

**Threshold may be raised later** once the program is proven and applicant volume justifies a higher bar. For launch, 5,000 is low enough to let micro-influencers in (often the best converters in niche supplement communities) and high enough to filter out hobby accounts.

### What the super affiliate gets beyond the bounty

- The `offers_annual_perk=true` flag on their affiliate record, which unlocks the discounted annual pricing for everyone who clicks their link
- A compelling sales narrative for their audience ("save $19–40 per year with my link")
- Priority support and a direct contact person at SR for campaign coordination

### Data model implications

The existing `affiliates` table already supports this via the `offers_annual_perk` flag. No schema changes required for the core mechanic. Additional columns to consider adding as part of implementation:

- `tier text` — enum of `regular` or `super`, human-readable
- `audience_size integer` — manually entered on approval
- `primary_platform text` — e.g. `youtube`, `instagram`, `tiktok`, `newsletter`, `other`
- `platform_handle text` — the creator's handle/URL on their primary platform

### Implementation dependencies

This comp structure depends on two items currently on the SR roadmap:

1. **Stripe webhook for subscription attribution** — required to automatically detect when a referred visitor completes an annual signup and accrue a bounty against the correct affiliate.
2. **UTM parameter parsing** — supports the attribution window and last-click logic.

Both are required before the super affiliate program can operate at scale. A manual-only version could run first (approve affiliates, track signups in a spreadsheet, pay quarterly) to validate the program before building the webhook automation.

### Open decisions (to revisit)

- **Launch as manual-tracked MVP or wait for webhook automation?** Manual tracking lets us launch immediately, but caps the program at ~10 super affiliates before it becomes operationally painful.
- **Payout method:** Zelle, PayPal, ACH, or check? The existing `affiliates` table already has `payout_method` but we should confirm the default for this tier.

---

## Summary of decisions

### Store Postcard
- 4×6 standard postcard, front/back, commission specifics off the card
- Front: consumer pitch + QR to signup with `utm_campaign=store_tour`
- Back: owner pitch + QR to `/affiliate` signup
- Requires small web change: optional "Referred by a store?" dropdown on the signup page

### Super Affiliate Program
- Flat upfront bounty: **$5 Plus annual / $24 Pro annual**
- No recurring, no commissions on monthly plans
- 30-day hold before payout
- Monthly payouts on the 1st
- 30-day attribution window, last-click wins
- Qualification: 5,000+ followers on any relevant platform + topical content review
- Manual approval, no open application
