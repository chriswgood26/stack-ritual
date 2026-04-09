import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase";

// Server-side: check whether the current visitor has the annual-perk unlocked
// via their affiliate_ref cookie. Returns true only if the cookie points at an
// active affiliate with offers_annual_perk=true.
export async function visitorHasAnnualPerk(): Promise<boolean> {
  try {
    const cookieStore = await cookies();
    const ref = cookieStore.get("affiliate_ref")?.value;
    if (!ref) return false;

    const { data } = await supabaseAdmin
      .from("affiliates")
      .select("offers_annual_perk, status")
      .eq("code", ref)
      .maybeSingle() as { data: { offers_annual_perk: boolean; status: string } | null };

    if (!data) return false;
    if (data.status !== "active") return false;
    return !!data.offers_annual_perk;
  } catch {
    return false;
  }
}
