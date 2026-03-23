import Link from "next/link";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-stone-50 font-sans">
      <nav className="bg-white border-b border-stone-200 px-4 py-3.5 flex items-center gap-3">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-lg">🌿</span>
          <span className="font-bold text-stone-900">Stack Ritual</span>
        </Link>
      </nav>

      <div className="max-w-3xl mx-auto px-4 py-10 pb-20">
        <h1 className="text-3xl font-bold text-stone-900 mb-2">Terms and Conditions</h1>
        <p className="text-stone-500 text-sm mb-8">Last updated: March 2026 · Version 1.0</p>

        <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 mb-8 text-sm text-amber-900">
          <strong>⚕️ Medical Disclaimer:</strong> Stack Ritual is an informational tool only. Nothing on this platform constitutes medical advice, diagnosis, or treatment. Always consult a qualified healthcare provider before beginning, changing, or stopping any supplement or wellness regimen.
        </div>

        <div className="space-y-8 text-stone-700 text-sm leading-relaxed">

          <section>
            <h2 className="text-lg font-bold text-stone-900 mb-3">1. Acceptance of Terms</h2>
            <p>By creating an account and using Stack Ritual (&quot;the Service&quot;), you agree to be bound by these Terms and Conditions. If you do not agree to these terms, you may not use the Service. These terms constitute a legally binding agreement between you and Stack Ritual.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-stone-900 mb-3">2. No Medical Advice</h2>
            <p className="mb-3">Stack Ritual provides general wellness and supplement information for educational purposes only. The information provided through the Service:</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Is not intended to diagnose, treat, cure, or prevent any disease or medical condition</li>
              <li>Does not constitute medical advice or replace consultation with a licensed healthcare provider</li>
              <li>May not be accurate, complete, or current</li>
              <li>Should not be relied upon as the sole basis for any health decision</li>
            </ul>
            <p className="mt-3">You acknowledge that supplement information, interactions, and recommendations on this platform are provided for general informational purposes only and may not apply to your individual health situation.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-stone-900 mb-3">3. Disclaimer of Warranties</h2>
            <p className="mb-3">THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED. STACK RITUAL EXPRESSLY DISCLAIMS ALL WARRANTIES INCLUDING, WITHOUT LIMITATION:</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Any warranty that the Service will be uninterrupted, error-free, or free of viruses</li>
              <li>Any warranty regarding the accuracy, reliability, completeness, or timeliness of supplement information</li>
              <li>Any implied warranties of merchantability, fitness for a particular purpose, or non-infringement</li>
              <li>Any warranty that information on the Service is free of misinformation or errors</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-stone-900 mb-3">4. Limitation of Liability and Indemnification</h2>
            <p className="mb-3">TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW:</p>
            <p className="mb-3"><strong>Limitation of Liability:</strong> Stack Ritual's total liability to you for any claims arising from or related to the Service shall not exceed the amount you paid to Stack Ritual in the twelve (12) months preceding the claim. If you have not made any payment, Stack Ritual's liability is limited to fifty dollars ($50.00).</p>
            <p className="mb-3">IN NO EVENT SHALL STACK RITUAL BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING WITHOUT LIMITATION LOSS OF PROFITS, DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES, RESULTING FROM:</p>
            <ul className="list-disc pl-5 space-y-1.5 mb-3">
              <li>Your use of or inability to use the Service</li>
              <li>Any supplement, vitamin, mineral, herb, or wellness practice you undertake based on information from the Service</li>
              <li>Any adverse health effects, injuries, or medical conditions arising from supplements or practices referenced on the Service</li>
              <li>Any inaccurate, incomplete, or misleading information on the Service</li>
              <li>Unauthorized access to or alteration of your data</li>
            </ul>
            <p className="mb-3"><strong>Indemnification:</strong> You agree to indemnify, defend, and hold harmless Stack Ritual and its officers, directors, employees, agents, and successors from and against any claims, liabilities, damages, losses, costs, and expenses (including reasonable attorneys' fees) arising out of or in any way connected with:</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Your use of the Service</li>
              <li>Your violation of these Terms</li>
              <li>Any supplement, wellness practice, or health decision you make based on information from the Service</li>
              <li>Any content you submit to the Service</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-stone-900 mb-3">5. User-Generated Content</h2>
            <p className="mb-3">Users may submit supplement experiences, reviews, and custom supplement information to the Service. By submitting content, you:</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Represent that you have the right to submit such content</li>
              <li>Grant Stack Ritual a non-exclusive license to display and distribute your content within the Service</li>
              <li>Acknowledge that your experiences are personal and may not apply to others</li>
              <li>Agree not to submit false, misleading, harmful, or inappropriate content</li>
            </ul>
            <p className="mt-3">Stack Ritual reserves the right to remove any user-generated content that violates these terms or is otherwise inappropriate, without notice.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-stone-900 mb-3">6. Affiliate Disclosures</h2>
            <p>Stack Ritual participates in affiliate programs. When you click on links to purchase supplements, we may earn a commission at no additional cost to you. This does not influence the information or recommendations provided on the platform. We are not responsible for third-party websites, their products, or any transactions you make with them.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-stone-900 mb-3">7. Subscriptions and Payments</h2>
            <p className="mb-3">Paid subscription plans are billed monthly or annually. By subscribing:</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>You authorize Stack Ritual to charge your payment method on a recurring basis</li>
              <li>Subscriptions automatically renew unless cancelled at least 24 hours before the renewal date</li>
              <li>Refunds are not provided for partial subscription periods</li>
              <li>You can cancel at any time through the billing portal in your Profile settings</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-stone-900 mb-3">8. Binding Arbitration</h2>
            <p className="mb-3"><strong>PLEASE READ THIS SECTION CAREFULLY. IT AFFECTS YOUR LEGAL RIGHTS.</strong></p>
            <p className="mb-3">Any dispute, controversy, or claim arising out of or relating to these Terms or the Service, or the breach, termination, or invalidity thereof, shall be resolved by binding arbitration rather than in court, except that you may assert claims in small claims court if your claims qualify.</p>
            <p className="mb-3"><strong>Arbitration Process:</strong> Arbitration shall be conducted by a single arbitrator under the rules of the American Arbitration Association (AAA) Consumer Arbitration Rules. The arbitration shall take place in Los Angeles, California, or by video conference at either party's request. The arbitrator's decision shall be final and binding.</p>
            <p className="mb-3"><strong>Class Action Waiver:</strong> YOU AND STACK RITUAL AGREE THAT EACH MAY BRING CLAIMS AGAINST THE OTHER ONLY IN AN INDIVIDUAL CAPACITY AND NOT AS A PLAINTIFF OR CLASS MEMBER IN ANY PURPORTED CLASS OR REPRESENTATIVE PROCEEDING.</p>
            <p><strong>Opt-Out:</strong> You may opt out of this arbitration agreement by sending written notice to legal@stackritual.com within 30 days of first accepting these Terms.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-stone-900 mb-3">9. Governing Law</h2>
            <p>These Terms shall be governed by the laws of the State of California, without regard to conflict of law principles. Any disputes not subject to arbitration shall be resolved in the state or federal courts located in Los Angeles County, California.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-stone-900 mb-3">10. Changes to Terms</h2>
            <p>Stack Ritual reserves the right to modify these Terms at any time. Material changes will be communicated via email or in-app notification. Continued use of the Service after changes constitutes acceptance of the updated Terms.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-stone-900 mb-3">11. Contact</h2>
            <p>Questions about these Terms? Contact us at <a href="mailto:legal@stackritual.com" className="text-emerald-600 underline">legal@stackritual.com</a></p>
          </section>

        </div>
      </div>
    </div>
  );
}
