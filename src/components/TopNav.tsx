"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignOutButton } from "@clerk/nextjs";

const pageTitles: Record<string, string> = {
  "/dashboard": "Today",
  "/dashboard/stack": "My Stack",
  "/dashboard/search": "Research",
  "/dashboard/experiences": "Experiences",
  "/dashboard/profile": "Profile",
  "/dashboard/print": "Print Summary",
  "/dashboard/history": "History",
};

interface Props {
  title?: string;
  right?: React.ReactNode;
}

export default function TopNav({ title, right }: Props) {
  const pathname = usePathname();
  const pageTitle = title || pageTitles[pathname] || "";

  return (
    <nav className="bg-white border-b border-stone-200 px-4 py-3.5 flex items-center sticky top-0 z-10">
      {/* Left — Stack Ritual logo */}
      <Link href="/dashboard" className="flex items-center gap-1.5 flex-1">
        <span className="text-lg">🌿</span>
        <span className="font-bold text-emerald-700 text-sm tracking-tight">Stack Ritual</span>
      </Link>

      {/* Center — page title */}
      <div className="absolute left-1/2 -translate-x-1/2 font-bold text-stone-900 text-base max-w-[40%] truncate text-center">
        {pageTitle}
      </div>

      {/* Right slot — custom content or default sign out */}
      <div className="flex-1 flex justify-end items-center gap-3">
        {right}
        <SignOutButton>
          <button className="text-xs text-stone-400 hover:text-red-500 transition-colors font-medium">
            Sign out
          </button>
        </SignOutButton>
      </div>
    </nav>
  );
}
