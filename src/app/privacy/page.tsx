import Link from "next/link";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-stone-50 font-sans">
      <nav className="bg-white border-b border-stone-200 px-4 py-3.5 flex items-center gap-3">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-lg">🌿</span>
          <span className="font-bold text-stone-900">Stack Ritual</span>
        </Link>
      </nav>

      <div className="max-w-3xl mx-auto px-4 py-10 pb-20">
        <h1 className="text-3xl font-bold text-stone-900 mb-2">Privacy Policy</h1>
        <p className="text-stone-500 text-sm mb-8">Last updated: April 2026 · Version 1.1</p>

        <div className="space-y-8 text-stone-700 text-sm leading-relaxed">

          <section>
            <h2 className="text-lg font-bold text-stone-900 mb-3">1. Introduction</h2>
            <p>Stack Ritual (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our website and application at stackritual.com.</p>
            <p className="mt-3">By using Stack Ritual, you agree to the collection and use of information in accordance with this policy.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-stone-900 mb-3">2. Information We Collect</h2>
            <h3 className="font-semibold text-stone-900 mb-2">Information you provide directly:</h3>
            <ul className="list-disc pl-5 space-y-1.5 mb-4">
              <li>Account information (name, email address, password)</li>
              <li>Supplement and wellness stack data you enter</li>
              <li>Daily check-in logs and mood data</li>
              <li>Experiences and reviews you submit</li>
              <li>Phone number (if you enable SMS reminders)</li>
              <li>Payment information (processed securely by Stripe — we do not store card details)</li>
              <li>Feedback you submit through the app</li>
            </ul>
            <h3 className="font-semibold text-stone-900 mb-2">Information collected automatically:</h3>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Browser type and operating system</li>
              <li>IP address and general location</li>
              <li>Pages visited and features used within the app</li>
              <li>Timezone (used to display correct dates)</li>
              <li>Referring website</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-stone-900 mb-3">3. How We Use Your Information</h2>
            <p className="mb-3">We use the information we collect to:</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Provide, maintain, and improve the Stack Ritual service</li>
              <li>Display your personal supplement stack and daily schedule</li>
              <li>Send SMS and email reminders (only if you opt in)</li>
              <li>Send weekly summary emails (Plus and Pro subscribers who opt in)</li>
              <li>Process payments and manage your subscription</li>
              <li>Respond to customer support requests</li>
              <li>Send product updates and health tips (only if you opt in)</li>
              <li>Analyze usage patterns to improve the app</li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-stone-900 mb-3">4. Sharing Your Information</h2>
            <p className="mb-3">We do not sell your personal information. We may share your information with:</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li><strong>Service providers:</strong> Clerk (authentication), Supabase (database), Stripe (payments), Resend (email), Twilio (SMS), Vercel (hosting). These providers are contractually obligated to protect your data.</li>
              <li><strong>Affiliate partners:</strong> When you click buy links (Amazon, iHerb, Thorne), those sites may collect data per their own privacy policies. We earn a commission on qualifying purchases.</li>
              <li><strong>Legal requirements:</strong> If required by law, court order, or governmental authority.</li>
              <li><strong>Business transfers:</strong> In connection with a merger, acquisition, or sale of assets, with notice to you.</li>
            </ul>
            <p className="mt-3"><strong>Community experiences:</strong> If you share a supplement experience, your review (but not your name or email) is visible to other users.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-stone-900 mb-3">5. Data Retention</h2>
            <p>We retain your data for as long as your account is active. If you delete your account, we will delete your personal data within 30 days, except where we are required to retain it for legal or regulatory purposes.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-stone-900 mb-3">6. Your Rights</h2>
            <p className="mb-3">Depending on your location, you may have the following rights:</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li><strong>Access:</strong> Request a copy of the personal data we hold about you</li>
              <li><strong>Correction:</strong> Request correction of inaccurate data</li>
              <li><strong>Deletion:</strong> Request deletion of your personal data ("right to be forgotten")</li>
              <li><strong>Portability:</strong> Request your data in a machine-readable format</li>
              <li><strong>Opt-out:</strong> Opt out of marketing communications at any time</li>
              <li><strong>SMS opt-out:</strong> Reply STOP to any SMS to unsubscribe immediately</li>
            </ul>
            <p className="mt-3">To exercise these rights, contact us at <a href="mailto:privacy@stackritual.com" className="text-emerald-600 underline">privacy@stackritual.com</a></p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-stone-900 mb-3">7. SMS / Text Messaging</h2>
            <p className="mb-3">If you opt in to SMS reminders, the following terms apply:</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li><strong>No sharing of opt-in data:</strong> Mobile information, including phone numbers and SMS opt-in consent data, will <strong>not be shared with third parties or affiliates for marketing or promotional purposes</strong>. Information sharing for the limited purpose of delivering messages you have requested is described below under &ldquo;Service providers.&rdquo;</li>
              <li><strong>Consent is not a condition of purchase.</strong> You can use Stack Ritual fully without receiving any text messages.</li>
              <li><strong>Message types:</strong> Transactional reminders based on your configured stack times, plus confirmation and service messages (e.g., double opt-in).</li>
              <li><strong>Message frequency:</strong> Varies based on your reminder settings — typically 0–4 messages per day.</li>
              <li><strong>Carriers:</strong> Messages are sent via Twilio, a licensed US messaging provider. Carriers are not liable for delayed or undelivered messages.</li>
              <li><strong>Rates:</strong> Message and data rates may apply depending on your mobile plan.</li>
              <li><strong>Opt-out:</strong> Reply <strong>STOP</strong>, <strong>UNSUBSCRIBE</strong>, <strong>QUIT</strong>, or <strong>CANCEL</strong> to any SMS to unsubscribe immediately. You&rsquo;ll receive a final confirmation and no further messages. To re-subscribe, reply <strong>START</strong> or re-enable SMS in your account profile.</li>
              <li><strong>Help:</strong> Reply <strong>HELP</strong> for help, or email <a href="mailto:hello@stackritual.com" className="text-emerald-600 underline">hello@stackritual.com</a>.</li>
              <li><strong>Service providers:</strong> Your phone number is shared only with Twilio (our messaging carrier) for the sole purpose of delivering the reminders you have opted into. It is never sold, rented, or disclosed to advertisers, marketers, data brokers, or affiliates for any marketing purpose.</li>
              <li><strong>Proof of consent:</strong> We record when and how you opted in (timestamp, IP address, and the exact consent language you agreed to) to comply with TCPA and CTIA requirements.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-stone-900 mb-3">8. Cookies</h2>
            <p>We use cookies and similar tracking technologies to:</p>
            <ul className="list-disc pl-5 space-y-1.5 mt-2">
              <li>Keep you logged in (authentication cookies via Clerk)</li>
              <li>Remember your timezone for accurate date display</li>
              <li>Analyze app usage (analytics)</li>
            </ul>
            <p className="mt-3">You can control cookies through your browser settings. Disabling cookies may affect app functionality.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-stone-900 mb-3">9. Data Security</h2>
            <p>We implement industry-standard security measures including:</p>
            <ul className="list-disc pl-5 space-y-1.5 mt-2">
              <li>SSL/TLS encryption for all data in transit</li>
              <li>Encrypted database storage via Supabase</li>
              <li>Secure authentication via Clerk</li>
              <li>Payment card data never stored on our servers (Stripe handles this)</li>
            </ul>
            <p className="mt-3">No method of transmission over the internet is 100% secure. We cannot guarantee absolute security.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-stone-900 mb-3">10. Children&apos;s Privacy</h2>
            <p>Stack Ritual is not directed to children under 13. We do not knowingly collect personal information from children under 13. If you believe we have inadvertently collected such information, please contact us immediately.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-stone-900 mb-3">11. California Privacy Rights (CCPA)</h2>
            <p>California residents have additional rights under the California Consumer Privacy Act (CCPA), including the right to know what personal information is collected, the right to delete personal information, and the right to opt-out of the sale of personal information. We do not sell personal information. To exercise your rights, contact <a href="mailto:privacy@stackritual.com" className="text-emerald-600 underline">privacy@stackritual.com</a>.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-stone-900 mb-3">12. Changes to This Policy</h2>
            <p>We may update this Privacy Policy from time to time. We will notify you of material changes via email or in-app notification. Continued use of the Service after changes constitutes acceptance of the updated policy.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-stone-900 mb-3">13. Contact Us</h2>
            <p>Questions about this Privacy Policy? Contact us:</p>
            <ul className="list-none mt-2 space-y-1">
              <li>📧 <a href="mailto:privacy@stackritual.com" className="text-emerald-600 underline">privacy@stackritual.com</a></li>
              <li>🌐 <a href="https://stackritual.com" className="text-emerald-600 underline">stackritual.com</a></li>
            </ul>
          </section>

        </div>

        <div className="mt-12 pt-8 border-t border-stone-200 flex gap-6 text-sm">
          <Link href="/terms" className="text-emerald-600 hover:underline">Terms & Conditions</Link>
          <Link href="/" className="text-stone-500 hover:text-stone-700">← Back to home</Link>
        </div>
      </div>
    </div>
  );
}
