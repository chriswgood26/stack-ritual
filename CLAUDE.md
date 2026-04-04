@AGENTS.md

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

Stack Ritual is a supplement and wellness habit tracking app. Users build a daily "stack" of supplements and rituals, check them off, track mood, view history, and get reminders. SaaS with Stripe billing (Free/Plus $4.99/Pro $9.99). Deployed on Vercel. Currently at v1.3 — see CHANGELOG.md for release history.

## Commands

- `npm run dev` — dev server on localhost:3000
- `npm run build` — production build
- `npm run lint` — ESLint

No test suite configured.

## Architecture

- `src/app/dashboard/*` — protected user routes (stack, search, experiences, history, mood-report, print, profile, settings)
- `src/app/admin/*` — admin dashboard
- `src/app/api/*` — ~35 RESTful endpoints organized by resource (stack, supplements, mood, experiences, email, sms, stripe, cron, admin, brands, etc.)
- `src/app/` — public pages (landing, FAQ, privacy, terms, disclaimer)
- `src/components/` — ~35 React components
- `src/lib/` — service clients and utilities

**Key lib files:**
- `src/lib/supabase.ts` — public client (browser reads) + admin client (server writes with Clerk user IDs)
- `src/lib/stripe.ts` — Stripe SDK + PLANS/PRICE_IDS constants
- `src/lib/resend.ts` + `src/lib/emails.ts` — email service + templates (`hello@stackritual.com`)
- `src/lib/twilio.ts` — SMS reminders (pending A2P carrier approval)
- `src/lib/timezone.ts` — timezone utilities

**Cron jobs (Vercel):**
- `/api/cron/sms-reminders` — every 15 min
- `/api/cron/weekly-summary` — Mondays 9am
- `/api/cron/low-supply` — daily 8am

## Key Patterns

**Auth:** Clerk handles sign-in. Terms acceptance gated in `dashboard/layout.tsx` — users must accept before accessing any dashboard page.

**Data isolation:** All user data scoped by `user_id` from Clerk auth. Supabase RLS enforces isolation.

**Payment flow:** Stripe checkout → webhook updates `subscriptions` table with plan level → API routes check plan before allowing premium features (e.g., SMS for Pro).

**Feature tiers:** Free (5 supplements), Plus (unlimited + email reminders), Pro (all + SMS). Plan check via `src/lib/stripe.ts` constants.

**Supplement add flow:** Search database → if no results, "Add [name]" button appears → multi-step custom add form (`AddCustomSupplement.tsx`). If results found, "Can't find it?" button opens form with query pre-filled.

**Inventory tracking:** Doses remaining per supplement with colored badge. Auto-decrement on checkoff (supplements ON by default, rituals OFF). Manual +/- adjustment with reorder links (iHerb/Amazon).

**Mood tracking:** Daily mood score (1-10) with notes. Calendar view with completion % color coding. Correlation analysis ("your mood is X points higher on days you complete your stack").

## Conventions

- Path alias: `@/*` maps to `./src/*`
- Color palette: emerald-700 primary, stone grays
- Mobile-first responsive design (PWA-ready with manifest.json)
- Cron routes bypass auth using `isPublicApiRoute` matcher in proxy.ts
- Email/SMS gracefully fail if API keys not configured
