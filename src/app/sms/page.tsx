import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "SMS Reminders — How They Work | Stack Ritual",
  description:
    "How Stack Ritual collects consent for SMS reminders, what messages we send, message frequency, opt-out instructions, and links to our Privacy Policy and Terms.",
};

export default function SmsPage() {
  return (
    <div className="min-h-screen bg-stone-50 font-sans">
      <nav className="bg-white border-b border-stone-200 px-4 py-3.5 flex items-center gap-3">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-lg">🌿</span>
          <span className="font-bold text-stone-900">Stack Ritual</span>
        </Link>
      </nav>

      <div className="max-w-3xl mx-auto px-4 py-10 pb-20">
        <h1 className="text-3xl font-bold text-stone-900 mb-2">SMS Reminders</h1>
        <p className="text-stone-500 text-sm mb-8">
          How consent is collected and what users receive. Last updated April 2026.
        </p>

        <div className="space-y-8 text-stone-700 text-sm leading-relaxed">

          <section>
            <h2 className="text-lg font-bold text-stone-900 mb-3">Program overview</h2>
            <p>
              Stack Ritual offers an optional SMS reminder program for Pro plan subscribers. Messages
              are <strong>transactional reminders</strong> tied to the supplement and wellness schedules
              users explicitly configure inside their account. We do not send marketing or promotional
              SMS of any kind, and we do not share mobile numbers with third parties.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-stone-900 mb-3">How users opt in</h2>
            <p className="mb-3">
              SMS reminders are off by default. Users opt in through a multi-step, double-opt-in flow
              inside their authenticated account. The full sequence:
            </p>
            <ol className="list-decimal pl-5 space-y-3">
              <li>
                <strong>Sign up and subscribe to Pro.</strong> Users create a Stack Ritual account at{" "}
                <Link href="/sign-up" className="text-emerald-700 underline">
                  stackritual.com/sign-up
                </Link>{" "}
                and upgrade to the Pro plan ($9.99/month). SMS reminders are a Pro-only feature.
              </li>
              <li>
                <strong>Open SMS Reminders in Profile.</strong> The user navigates to their Profile and
                taps the &ldquo;SMS Reminders&rdquo; row. A modal opens.
              </li>
              <li>
                <strong>Enable the toggle and enter a phone number.</strong> The user toggles
                &ldquo;Enable SMS reminders&rdquo; on and enters their US mobile number.
              </li>
              <li>
                <strong>Check the consent checkbox.</strong> The Save button is{" "}
                <em>disabled</em> until the user checks a TCPA-compliant consent checkbox displaying
                the exact language quoted below. The checkbox is unchecked by default.
              </li>
              <li>
                <strong>Save.</strong> When the user taps Save, Stack Ritual records the consent
                timestamp, the IP address, and the verbatim consent text in the user&apos;s profile
                record, and sends a one-time double-opt-in confirmation SMS to the phone number.
              </li>
              <li>
                <strong>Reply YES.</strong> The user must reply <code>YES</code> to the confirmation
                SMS before any reminders are sent. Until that reply is received, the user&apos;s
                reminder status remains pending and no further messages are sent.
              </li>
              <li>
                <strong>Receive reminders on the user&apos;s configured schedule.</strong> Once
                confirmed, Stack Ritual sends reminders only at the times the user has scheduled in
                their stack settings (morning, afternoon, evening, bedtime).
              </li>
            </ol>
          </section>

          <section>
            <h2 className="text-lg font-bold text-stone-900 mb-3">Exact consent text</h2>
            <p className="mb-3">
              The checkbox a user must affirmatively check in order to enable SMS displays the
              following language verbatim:
            </p>
            <blockquote className="bg-white border-l-4 border-emerald-700 px-4 py-3 text-stone-800 italic">
              &ldquo;I agree to receive recurring automated text message reminders from Stack Ritual at
              the phone number above. Consent is not a condition of purchase. Message frequency varies
              by my reminder settings. Msg &amp; data rates may apply. Reply STOP to unsubscribe, HELP
              for help. See our Terms and Privacy Policy.&rdquo;
            </blockquote>
          </section>

          <section>
            <h2 className="text-lg font-bold text-stone-900 mb-3">Screenshot of the opt-in modal</h2>
            <p className="mb-4">
              Below is a representation of the SMS Reminders settings modal as it appears inside a
              Pro user&apos;s authenticated account. The consent checkbox at the bottom must be
              checked before the Save button becomes active.
            </p>
            <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-sm">
              <div className="text-stone-900 font-bold text-base mb-1">SMS Reminders</div>
              <p className="text-stone-500 text-xs mb-4">
                Get a text when it&apos;s time to take your stack.
              </p>

              <div className="flex items-center justify-between py-2">
                <span className="text-stone-700 text-sm">Enable SMS reminders</span>
                <span className="inline-block w-10 h-6 bg-emerald-600 rounded-full relative">
                  <span className="absolute right-0.5 top-0.5 w-5 h-5 bg-white rounded-full" />
                </span>
              </div>

              <label className="block text-stone-600 text-xs mt-3 mb-1">Mobile number</label>
              <div className="border border-stone-300 rounded-lg px-3 py-2 text-stone-900 text-sm bg-stone-50">
                (555) 123-4567
              </div>

              <div className="mt-4 flex items-start gap-2 bg-stone-50 border border-stone-200 rounded-lg p-3">
                <span className="inline-block w-4 h-4 border-2 border-emerald-700 rounded bg-emerald-700 flex-shrink-0 mt-0.5 text-white text-[10px] text-center leading-none pt-[1px]">
                  ✓
                </span>
                <p className="text-[11px] text-stone-700 leading-relaxed">
                  I agree to receive recurring automated text message reminders from Stack Ritual at
                  the phone number above. Consent is not a condition of purchase. Message frequency
                  varies by my reminder settings. Msg &amp; data rates may apply. Reply STOP to
                  unsubscribe, HELP for help. See our{" "}
                  <Link href="/terms" className="text-emerald-700 underline">
                    Terms
                  </Link>{" "}
                  and{" "}
                  <Link href="/privacy" className="text-emerald-700 underline">
                    Privacy Policy
                  </Link>
                  .
                </p>
              </div>

              <p className="text-[10px] text-stone-500 mt-3 leading-relaxed">
                Reply STOP to unsubscribe or HELP for help at any time. Msg &amp; data rates may
                apply.
              </p>

              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  className="bg-emerald-700 text-white text-sm font-semibold px-4 py-2 rounded-lg"
                  disabled
                >
                  Save
                </button>
              </div>
            </div>
            <p className="text-stone-500 text-xs mt-3">
              Reviewers: this is a static representation of the live settings UI. Saving the form sends
              the confirmation SMS shown in the next section, and reminders only begin after the user
              replies YES.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-stone-900 mb-3">Sample messages</h2>

            <h3 className="font-semibold text-stone-900 mb-2">Double opt-in confirmation</h3>
            <div className="bg-white border border-stone-200 rounded-lg p-3 mb-4 text-stone-800 text-sm">
              Stack Ritual: Reply YES to confirm you want to receive reminder texts. Msg frequency
              varies. Msg &amp; data rates may apply. Reply STOP to cancel, HELP for help.
            </div>

            <h3 className="font-semibold text-stone-900 mb-2">Reminder (sent on the user&apos;s schedule)</h3>
            <div className="bg-white border border-stone-200 rounded-lg p-3 mb-4 text-stone-800 text-sm">
              🌿 Stack Ritual: Time for your morning stack — Magnesium, Vitamin D, Omega-3. Mark these
              all done: https://stackritual.com/done?uid=...
              <br />
              <br />
              Reply STOP to unsubscribe, HELP for help.
            </div>

            <h3 className="font-semibold text-stone-900 mb-2">Welcome (after replying YES)</h3>
            <div className="bg-white border border-stone-200 rounded-lg p-3 mb-4 text-stone-800 text-sm">
              Thanks! SMS reminders are confirmed. You&apos;ll receive reminders based on the schedule
              you set in Stack Ritual. Reply STOP to unsubscribe, HELP for help.
            </div>

            <h3 className="font-semibold text-stone-900 mb-2">STOP acknowledgment</h3>
            <div className="bg-white border border-stone-200 rounded-lg p-3 mb-4 text-stone-800 text-sm">
              You have been unsubscribed from Stack Ritual reminders. Reply START to resubscribe. Visit
              stackritual.com to manage your account.
            </div>

            <h3 className="font-semibold text-stone-900 mb-2">HELP response</h3>
            <div className="bg-white border border-stone-200 rounded-lg p-3 text-stone-800 text-sm">
              Stack Ritual: supplement &amp; wellness reminders. Msg&amp;data rates may apply. Msg
              frequency varies by your settings. Reply STOP to unsubscribe. Support:
              hello@stackritual.com
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold text-stone-900 mb-3">Message frequency</h2>
            <p>
              Message frequency is determined entirely by the schedule the user configures in their
              own account. A typical user receives <strong>0 to 4 messages per day</strong>, one per
              scheduled reminder time slot (morning, afternoon, evening, bedtime). Users with no
              scheduled reminders receive zero messages.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-stone-900 mb-3">Opt-out</h2>
            <p className="mb-3">
              Users can opt out at any time using any of these methods:
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                Reply <strong>STOP</strong>, <strong>UNSUBSCRIBE</strong>, <strong>QUIT</strong>, or{" "}
                <strong>CANCEL</strong> to any message
              </li>
              <li>Toggle &ldquo;Enable SMS reminders&rdquo; off in their account profile</li>
              <li>Email hello@stackritual.com</li>
            </ul>
            <p className="mt-3">
              On STOP, Stack Ritual immediately marks the user&apos;s SMS as disabled, halts all future
              messages to that number, and replies with the STOP acknowledgment shown above. To
              re-subscribe, the user must reply START or re-enable the toggle and re-confirm.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-stone-900 mb-3">Help</h2>
            <p>
              Replying <strong>HELP</strong> to any Stack Ritual message returns the HELP response
              shown above. Users can also email <strong>hello@stackritual.com</strong> for support at
              any time.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-stone-900 mb-3">Privacy &amp; data sharing</h2>
            <p>
              Mobile numbers collected for SMS reminders are{" "}
              <strong>never sold or shared with third parties for marketing</strong>. Phone numbers are
              used solely to deliver the reminders the user has configured. See Section 7 of our{" "}
              <Link href="/privacy" className="text-emerald-700 underline">
                Privacy Policy
              </Link>{" "}
              for full details.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-stone-900 mb-3">Related documents</h2>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                <Link href="/privacy" className="text-emerald-700 underline">
                  Privacy Policy
                </Link>{" "}
                — full data handling, including SMS-specific section
              </li>
              <li>
                <Link href="/terms" className="text-emerald-700 underline">
                  Terms of Service
                </Link>{" "}
                — including the SMS section users agree to at signup
              </li>
              <li>
                <Link href="/" className="text-emerald-700 underline">
                  Stack Ritual home
                </Link>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-stone-900 mb-3">Contact</h2>
            <p>
              Questions about our SMS program can be directed to{" "}
              <strong>hello@stackritual.com</strong>.
            </p>
          </section>

        </div>

        <div className="mt-12 pt-6 border-t border-stone-200 text-center">
          <Link href="/" className="text-emerald-700 text-sm font-medium">
            ← Back to Stack Ritual
          </Link>
        </div>
      </div>
    </div>
  );
}
