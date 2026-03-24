import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center px-4 font-sans">
      <div className="mb-8 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <span className="text-3xl">🌿</span>
          <span className="text-2xl font-bold text-stone-900">Stack Ritual</span>
        </div>
        <p className="text-stone-500 text-sm">Join thousands optimizing their health ritual.</p>
      </div>
      <SignUp fallbackRedirectUrl="/dashboard" forceRedirectUrl="/dashboard" />
    </div>
  );
}
