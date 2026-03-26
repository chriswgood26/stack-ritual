import Link from "next/link";
import Disclaimer from "@/components/Disclaimer";
import SearchAndFilterWrapper from "./SearchAndFilterWrapper";
import { supabase } from "@/lib/supabase";
import BottomNav from "@/components/BottomNav";
import TopNav from "@/components/TopNav";

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
        <SearchAndFilterWrapper supplements={supplements || []} />

        <div className="mt-6">
          <Disclaimer compact />
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
