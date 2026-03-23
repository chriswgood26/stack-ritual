import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import TopNav from "@/components/TopNav";
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
      <TopNav />

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
      <BottomNav />
    </div>
  );
}
