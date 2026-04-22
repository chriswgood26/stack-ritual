import { SignUp } from "@clerk/nextjs";
import { currentUser } from "@clerk/nextjs/server";
import Link from "next/link";
import ReferralCodeInput from "@/components/ReferralCodeInput";

export default async function SignUpPage() {
  const user = await currentUser();

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center px-4 font-sans py-8">
      <div className="mb-8 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <span className="text-3xl">🌿</span>
          <span className="text-2xl font-bold text-stone-900">Stack Ritual</span>
        </div>
        <p className="text-stone-500 text-sm">
          {user ? "You're already signed in." : "Join thousands optimizing their health ritual."}
        </p>
      </div>

      {user ? (
        <Link
          href="/dashboard"
          className="bg-emerald-700 text-white px-6 py-3 rounded-full font-semibold hover:bg-emerald-800 transition-colors shadow-sm"
        >
          Continue to Stack Ritual →
        </Link>
      ) : (
        <>
          <SignUp fallbackRedirectUrl="/sign-up-complete" forceRedirectUrl="/sign-up-complete" />
          {/* Referral code entry — for users arriving from a physical postcard
              or other offline source with no cookie set. Sets the affiliate_ref
              cookie before they finish signing up so attribution is preserved. */}
          <div className="w-full max-w-sm mt-4">
            <ReferralCodeInput />
          </div>
        </>
      )}
    </div>
  );
}
