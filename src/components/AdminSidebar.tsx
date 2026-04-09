"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard", icon: "📊" },
  { href: "/admin/users", label: "Users", icon: "👤" },
  { href: "/admin/supplements", label: "Supplements", icon: "💊" },
  { href: "/admin/experiences", label: "Experiences", icon: "⭐" },
  { href: "/admin/feedback", label: "Feedback", icon: "💬" },
  { href: "/admin/affiliates", label: "Affiliates", icon: "🤝" },
  { href: "/admin/sms", label: "SMS", icon: "📱" },
];

const BOTTOM_ITEMS = [
  { href: "/admin/releases", label: "Releases & Roadmap", icon: "📋" },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  function isActive(href: string) {
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  }

  const navContent = (
    <>
      <Link href="/admin" className="text-sm font-semibold text-emerald-400 mb-6 pb-3 border-b border-stone-700 block tracking-wider">
        🌿 STACK RITUAL ADMIN
      </Link>

      <nav className="flex flex-col gap-1 flex-1">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setMobileOpen(false)}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
              isActive(item.href)
                ? "bg-emerald-500/10 text-emerald-400"
                : "text-stone-400 hover:text-white hover:bg-stone-800/50"
            }`}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}

        <div className="border-t border-stone-700 mt-4 pt-4">
          {BOTTOM_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive(item.href)
                  ? "bg-emerald-500/10 text-emerald-400"
                  : "text-stone-400 hover:text-white hover:bg-stone-800/50"
              }`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>

      <Link
        href="/dashboard"
        onClick={() => setMobileOpen(false)}
        className="text-xs text-stone-500 hover:text-stone-300 transition-colors mt-4 pt-4 border-t border-stone-700"
      >
        ← Back to app
      </Link>
    </>
  );

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-3 left-3 z-50 bg-stone-900 border border-stone-700 rounded-lg p-2 text-stone-400 hover:text-white"
        aria-label="Open menu"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-stone-900 p-4 flex flex-col overflow-y-auto">
            <div className="flex justify-end mb-2">
              <button onClick={() => setMobileOpen(false)} className="text-stone-400 hover:text-white text-xl">✕</button>
            </div>
            {navContent}
          </aside>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-56 flex-shrink-0 bg-stone-900 border-r border-stone-700 min-h-screen p-4 flex-col">
        {navContent}
      </aside>
    </>
  );
}
