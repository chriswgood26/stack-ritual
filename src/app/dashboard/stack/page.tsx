import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import TopNav from "@/components/TopNav";
import Disclaimer from "@/components/Disclaimer";
import AddCustomSupplement from "@/components/AddCustomSupplement";
import DeleteStackItemButton from "@/components/DeleteStackItemButton";
import QuantityAdjuster from "@/components/QuantityAdjuster";
import EditStackItemButton from "@/components/EditStackItemButton";
import { currentUser } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function MyStackPage() {
  const user = await currentUser();
  if (!user) return null;

  const { data: stackItems } = await supabaseAdmin
    .from("user_stacks")
    .select("*, supplement:supplement_id(name, icon, slug)")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  const getItemName = (item: typeof stackItems[0]) => {
    const s = item.supplement;
    const supp = Array.isArray(s) ? s[0] : s;
    return (supp as {name?: string})?.name || item.custom_name || "";
  };

  const supplements = (stackItems || [])
    .filter(i => i.category === "supplement")
    .sort((a, b) => getItemName(a).localeCompare(getItemName(b)));
  const rituals = (stackItems || [])
    .filter(i => i.category === "ritual")
    .sort((a, b) => (a.custom_name || "").localeCompare(b.custom_name || ""));
  const total = (stackItems || []).length;

  return (
    <div className="min-h-screen bg-stone-50 font-sans pb-24">
      <TopNav />

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">

        {/* Stack stats */}
        <div className="bg-emerald-700 rounded-2xl p-5 text-white">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-2xl font-bold">{total} items</div>
              <div className="text-emerald-200 text-sm">{supplements.length} supplements · {rituals.length} rituals</div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">🌿</div>
            </div>
          </div>
          <div className="flex gap-2">
            <Link href="/dashboard/print"
              className="flex-1 bg-white/20 hover:bg-white/30 transition-colors text-white text-sm font-medium py-2.5 rounded-xl text-center">
              🖨️ Print summary
            </Link>
            <Link href="/dashboard/search"
              className="flex-1 bg-white/20 hover:bg-white/30 transition-colors text-white text-sm font-medium py-2.5 rounded-xl text-center">
              + Add to My Stack
            </Link>
          </div>
        </div>

        {total === 0 ? (
          <div className="bg-white rounded-2xl border border-stone-100 p-8 text-center">
            <div className="text-4xl mb-3">🌿</div>
            <p className="font-semibold text-stone-900 mb-1">Your stack is empty</p>
            <p className="text-stone-500 text-sm mb-4">Search our database or add your own supplements.</p>
            <Link href="/dashboard/search"
              className="bg-emerald-700 text-white px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-emerald-800 transition-colors inline-block">
              Browse supplements
            </Link>
          </div>
        ) : (
          <>
            {/* Supplements */}
            {supplements.length > 0 && (
              <div>
                <h2 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-3">
                  💊 Supplements ({supplements.length})
                </h2>
                <div className="space-y-2">
                  {supplements.map(item => {
                    const supp = Array.isArray(item.supplement) ? item.supplement[0] : item.supplement;
                    const name = supp?.name || item.custom_name || "Unknown";
                    const icon = supp?.icon || item.custom_icon || "💊";
                    return (
                      <div key={item.id} className="bg-white rounded-2xl border border-stone-100 shadow-sm px-4 py-4 flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center text-xl flex-shrink-0">
                          {icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-stone-900 text-sm">{name}</div>
                          <div className="text-xs text-stone-400 mt-0.5 flex items-center gap-2 flex-wrap">
                            <span>{[item.dose, item.timing, item.brand].filter(Boolean).join(" · ")}</span>
                          </div>
                          {item.quantity_remaining !== null && item.quantity_remaining !== undefined && (
                            <QuantityAdjuster
                              itemId={item.id}
                              currentRemaining={item.quantity_remaining}
                              currentTotal={item.quantity_total}
                              unit={item.quantity_unit}
                              name={name}
                            />
                          )}
                          <div className="hidden">
                          </div>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <EditStackItemButton
                            itemId={item.id}
                            name={name}
                            currentDose={item.dose}
                            currentTiming={item.timing}
                            currentBrand={item.brand}
                            currentNotes={item.notes}
                            currentFrequency={item.frequency_type}
                            currentQuantityTotal={item.quantity_total}
                            currentQuantityRemaining={item.quantity_remaining}
                            currentQuantityUnit={item.quantity_unit}
                          />
                          <DeleteStackItemButton itemId={item.id} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Rituals */}
            {rituals.length > 0 && (
              <div>
                <h2 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-3">
                  🧘 Rituals ({rituals.length})
                </h2>
                <div className="space-y-2">
                  {rituals.map(item => {
                    const icon = item.custom_icon || "🧘";
                    return (
                      <div key={item.id} className="bg-white rounded-2xl border border-stone-100 shadow-sm px-4 py-4 flex items-center gap-3">
                        <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center text-xl flex-shrink-0">
                          {icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-stone-900 text-sm">{item.custom_name || "Ritual"}</div>
                          <div className="text-xs text-stone-400 mt-0.5">
                            {[item.dose, item.timing].filter(Boolean).join(" · ")}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <EditStackItemButton
                            itemId={item.id}
                            name={item.custom_name || "Ritual"}
                            currentDose={item.dose}
                            currentTiming={item.timing}
                            currentNotes={item.notes}
                            currentFrequency={item.frequency_type}
                          />
                          <DeleteStackItemButton itemId={item.id} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}

        {/* Add from database */}
        <Link
          href="/dashboard/search"
          className="flex items-center justify-center gap-2 bg-emerald-700 text-white rounded-2xl py-4 font-medium text-sm hover:bg-emerald-800 transition-colors"
        >
          + Add to My Stack
        </Link>

        {/* Add custom */}
        <AddCustomSupplement />

        <Disclaimer compact />
      </div>
      <BottomNav />
    </div>
  );
}
