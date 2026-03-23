"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/dashboard", label: "Today", icon: "🏠", exact: true },
  { href: "/dashboard/stack", label: "My Stack", icon: "🧱" },
  { href: "/dashboard/search", label: "Research", icon: "🔍" },
  { href: "/dashboard/experiences", label: "Experiences", icon: "⭐" },
  { href: "/dashboard/profile", label: "Profile", icon: "👤" },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-stone-200 flex items-center justify-around px-2 py-2 z-10">
      {tabs.map(tab => {
        const active = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href);
        return (
          <Link key={tab.href} href={tab.href}
            className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-colors ${
              active
                ? "bg-emerald-700 text-white"
                : "text-stone-600 hover:bg-stone-100"
            }`}>
            <span className="text-xl">{tab.icon}</span>
            <span className={`text-xs font-medium`}>{tab.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
