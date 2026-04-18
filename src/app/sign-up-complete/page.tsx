"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Post-signup conversion interstitial. Clerk redirects here after a
// successful sign-up (see <SignUp forceRedirectUrl=... />); this page fires
// the Meta Pixel CompleteRegistration event, then client-side redirects
// into the app.
export default function SignUpCompletePage() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== "undefined" && typeof window.fbq === "function") {
      window.fbq("track", "CompleteRegistration");
    }
    // Small delay so the event request has time to leave the browser before
    // we navigate to /dashboard (which unmounts the pixel).
    const t = setTimeout(() => router.replace("/dashboard"), 300);
    return () => clearTimeout(t);
  }, [router]);

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center font-sans">
      <div className="text-stone-500 text-sm">Setting up your account…</div>
    </div>
  );
}
