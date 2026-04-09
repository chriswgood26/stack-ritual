import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase";

const ADMIN_USER_IDS = process.env.ADMIN_USER_IDS?.split(",") || [];

export const dynamic = "force-dynamic";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = any;

export default async function AdminSMSPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");
  if (!ADMIN_USER_IDS.includes(user.id)) redirect("/dashboard");

  // Counts
  const [enabledR, confirmedR, optedOutR, sentTodayR, failedTodayR] = await Promise.all([
    supabaseAdmin.from("user_profiles").select("*", { count: "exact", head: true }).eq("sms_enabled", true),
    supabaseAdmin.from("user_profiles").select("*", { count: "exact", head: true }).eq("sms_enabled", true).eq("sms_confirmed", true),
    supabaseAdmin.from("user_profiles").select("*", { count: "exact", head: true }).eq("sms_opted_out", true),
    supabaseAdmin.from("sms_logs").select("*", { count: "exact", head: true }).gte("created_at", new Date(new Date().setHours(0, 0, 0, 0)).toISOString()),
    supabaseAdmin.from("sms_logs").select("*", { count: "exact", head: true })
      .gte("created_at", new Date(new Date().setHours(0, 0, 0, 0)).toISOString())
      .eq("status", "failed"),
  ]);

  const { data: recentLogs } = await supabaseAdmin
    .from("sms_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50) as { data: AnyRecord[] | null };

  const { data: recentErrors } = await supabaseAdmin
    .from("sms_logs")
    .select("*")
    .or("status.eq.failed,error_code.not.is.null")
    .order("created_at", { ascending: false })
    .limit(20) as { data: AnyRecord[] | null };

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">SMS</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <StatCard icon="📱" label="SMS Enabled" value={enabledR.count ?? 0} />
        <StatCard icon="✓" label="Confirmed" value={confirmedR.count ?? 0} color="emerald" />
        <StatCard icon="🚫" label="Opted Out" value={optedOutR.count ?? 0} color="red" />
        <StatCard icon="📤" label="Sent Today" value={sentTodayR.count ?? 0} />
        <StatCard icon="⚠️" label="Failed Today" value={failedTodayR.count ?? 0} color={(failedTodayR.count ?? 0) > 0 ? "red" : undefined} />
      </div>

      {/* Recent errors */}
      {recentErrors && recentErrors.length > 0 && (
        <div className="bg-stone-800 rounded-2xl border border-red-700/50 overflow-hidden mb-6">
          <div className="px-5 py-3 border-b border-stone-700">
            <h2 className="font-bold text-red-300 text-sm">⚠️ Recent Errors</h2>
          </div>
          <div className="divide-y divide-stone-700">
            {recentErrors.map((log: AnyRecord) => (
              <div key={log.id} className="px-5 py-3 text-xs">
                <div className="flex justify-between text-stone-400 mb-1">
                  <span>{log.kind} → {log.to_phone}</span>
                  <span>{new Date(log.created_at).toLocaleString()}</span>
                </div>
                <div className="text-red-400">
                  {log.error_code ? `[${log.error_code}] ` : ""}{log.error_message || log.status}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent activity */}
      <div className="bg-stone-800 rounded-2xl border border-stone-700 overflow-hidden">
        <div className="px-5 py-3 border-b border-stone-700 flex items-center justify-between">
          <h2 className="font-bold text-white text-sm">Recent SMS Activity</h2>
          <span className="text-xs text-stone-500">Last 50 messages</span>
        </div>
        {!recentLogs || recentLogs.length === 0 ? (
          <div className="px-5 py-8 text-center text-stone-500 text-sm">
            No SMS activity yet. First messages will appear once the A2P campaign is approved.
          </div>
        ) : (
          <div className="divide-y divide-stone-700">
            {recentLogs.map((log: AnyRecord) => (
              <div key={log.id} className="px-5 py-3">
                <div className="flex items-center justify-between text-xs mb-1">
                  <div className="flex items-center gap-2">
                    <KindBadge kind={log.kind} />
                    <span className="text-stone-300 font-mono">{log.to_phone}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={log.status} />
                    <span className="text-stone-500">{new Date(log.created_at).toLocaleString()}</span>
                  </div>
                </div>
                <div className="text-xs text-stone-400 truncate">{log.body}</div>
                {log.error_message && <div className="text-xs text-red-400 mt-1">{log.error_code ? `[${log.error_code}] ` : ""}{log.error_message}</div>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: string; label: string; value: number; color?: "emerald" | "red" }) {
  const valueColor = color === "emerald" ? "text-emerald-400" : color === "red" ? "text-red-400" : "text-white";
  return (
    <div className="bg-stone-800 border border-stone-700 rounded-xl p-4">
      <div className="text-2xl mb-1">{icon}</div>
      <div className={`text-2xl font-bold ${valueColor}`}>{value}</div>
      <div className="text-xs text-stone-400 mt-0.5">{label}</div>
    </div>
  );
}

function KindBadge({ kind }: { kind: string }) {
  const colors: Record<string, string> = {
    reminder: "bg-emerald-900 text-emerald-300",
    confirmation: "bg-amber-900 text-amber-300",
    welcome: "bg-blue-900 text-blue-300",
    test: "bg-stone-700 text-stone-300",
    help: "bg-stone-700 text-stone-300",
    stop_ack: "bg-red-900 text-red-300",
  };
  return <span className={`text-[10px] px-1.5 py-0.5 rounded ${colors[kind] || "bg-stone-700 text-stone-300"}`}>{kind}</span>;
}

function StatusBadge({ status }: { status: string | null }) {
  if (!status) return null;
  const isGood = ["delivered", "sent", "queued", "accepted"].includes(status);
  const isBad = ["failed", "undelivered"].includes(status);
  const cls = isGood ? "text-emerald-400" : isBad ? "text-red-400" : "text-stone-500";
  return <span className={`text-[10px] ${cls}`}>{status}</span>;
}
