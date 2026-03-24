"use client";

import { useAuth } from "@clerk/nextjs";
import Link from "next/link";

export default function PricingButton({ label, className }: { label: string; className: string }) {
  const { isSignedIn } = useAuth();
  const href = isSignedIn ? "/dashboard/profile" : "/sign-up";

  return (
    <Link href={href} className={className}>
      {label}
    </Link>
  );
}
