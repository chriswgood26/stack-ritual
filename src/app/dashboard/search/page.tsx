import Link from "next/link";
import Disclaimer from "@/components/Disclaimer";
import SearchAndFilterWrapper from "./SearchAndFilterWrapper";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function SearchPage() {
  const { data: supplements } = await supabase
    .from("supplements")
    .select("id, name, slug, category, icon, tagline, evidence_level")
    .order("name");

  return (
    <div className="min-h-screen bg-stone-50 font-sans pb-24">
      <nav className="bg-white border-b border-stone-200 px-4 py-3.5 flex items-center gap-3 sticky top-0 z-10">
        <Link href="/dashboard" className="text-stone-400 hover:text-stone-700 transition-colors">←</Link>
        <span className="font-bold text-stone-900 tracking-tight flex-1">Research</span>
      </nav>

      <div className="max-w-lg mx-auto px-4 py-5">
        <SearchAndFilterWrapper supplements={supplements || []} />

        <div className="mt-6">
          <Disclaimer compact />
        </div>
      </div>
    </div>
  );
}
