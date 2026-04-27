-- One-time normalization so future joins between user_profiles (Clerk email)
-- and newsletter_subscribers (signup email) are exact-match. Idempotent —
-- safe to re-run. Run BEFORE the email_marketing two-way sync code lands.

update newsletter_subscribers
   set email = lower(trim(email))
 where email is not null
   and email <> lower(trim(email));
