import Link from "next/link";
import Disclaimer from "@/components/Disclaimer";
import AddCustomSupplement from "@/components/AddCustomSupplement";
import SearchAndFilter from "@/components/SearchAndFilter";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function SearchPage() {
  const { data: supplements } = await supabase
    .from("supplements")
    .select("id, name, slug, category, icon, tagline, evidence_level")
    .order("name");

  return (
    <div className="min-h-screen bg-stone-50 font-sans pb-24">

      {/* Top Nav */}
      <nav className="bg-white border-b border-stone-200 px-4 py-3.5 flex items-center gap-3 sticky top-0 z-10">
        <Link href="/dashboard" className="text-stone-400 hover:text-stone-700 transition-colors">←</Link>
        <span className="font-bold text-stone-900 tracking-tight flex-1">Research</span>
      </nav>

      <div className="max-w-lg mx-auto px-4 py-5">
        <SearchAndFilter supplements={supplements || []} />

        {/* Can't find it? Add it */}
        <div className="mt-8">
          <div className="text-center mb-4">
            <p className="text-stone-500 text-sm">Can&apos;t find what you&apos;re looking for?</p>
          </div>
          <AddCustomSupplement />
        </div>

        <div className="mt-6">
          <Disclaimer compact />
        </div>
      </div>

      {/* Bottom Tab Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-stone-200 flex items-center justify-around px-4 py-2 z-10">
        <Link href="/dashboard" className="flex flex-col items-center gap-0.5 text-stone-400">
          <span className="text-xl">🏠</span>
          <span className="text-xs">Today</span>
        </Link>
        <Link href="/dashboard/search" className="flex flex-col items-center gap-0.5 text-emerald-700">
          <span className="text-xl">🔍</span>
          <span className="text-xs font-medium">Research</span>
        </Link>
        <Link href="/dashboard/stack" className="flex flex-col items-center gap-0.5 text-stone-400">
          <span className="text-xl">🧱</span>
          <span className="text-xs">My Stack</span>
        </Link>
        <Link href="/dashboard/experiences" className="flex flex-col items-center gap-0.5 text-stone-400">
          <span className="text-xl">💬</span>
          <span className="text-xs">Experiences</span>
        </Link>
        <Link href="/dashboard/profile" className="flex flex-col items-center gap-0.5 text-stone-400">
          <span className="text-xl">👤</span>
          <span className="text-xs">Profile</span>
        </Link>
      </div>

    </div>
  );
}
