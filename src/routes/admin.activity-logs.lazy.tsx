import { createLazyFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Search, ShieldAlert, History } from "lucide-react";
import { fmtDateTime } from "@/lib/admin-utils";
import { AdminInput } from "@/components/admin/EntityDrawer";
import { toast } from "sonner";

export const Route = createLazyFileRoute("/admin/activity-logs")({ component: ActivityLogs });

function ActivityLogs() {
  const [logs, setLogs] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  const loadLogs = async () => {
    setLoading(true);
    // Fetch logs
    const { data: logData, error: logErr } = await supabase
      .from("activity_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);

    if (logErr) toast.error("Failed to load logs: " + logErr.message);

    // Fetch profiles to map user_ids to names
    const { data: profileData, error: profErr } = await supabase
      .from("profiles")
      .select("user_id, name");

    if (profErr) console.error("Failed to load profiles:", profErr);

    const profMap: Record<string, string> = {};
    if (profileData) {
      profileData.forEach((p) => {
        profMap[p.user_id] = p.name || "Unknown User";
      });
    }

    setProfiles(profMap);
    setLogs(logData || []);
    setLoading(false);
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const filteredLogs = logs.filter((log) => {
    if (!q) return true;
    const term = q.toLowerCase();
    const userName = (profiles[log.user_id] || log.user_id).toLowerCase();
    const action = log.action_type.toLowerCase();
    const entity = (log.entity_id || "").toLowerCase();
    return userName.includes(term) || action.includes(term) || entity.includes(term);
  });

  if (loading) {
    return <div className="p-12 flex justify-center"><Loader2 className="size-6 animate-spin text-orange-500" /></div>;
  }

  return (
    <div className="space-y-6 pb-20 max-w-5xl">
      <div className="border-b border-zinc-800 pb-4">
        <h2 className="font-display text-2xl tracking-wide uppercase text-white flex items-center gap-3">
          <History className="size-6 text-orange-500" /> Activity Audit Logs
        </h2>
        <p className="text-sm text-zinc-500 mt-1 font-mono">
          Chronological record of important actions performed by staff and administrators.
        </p>
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <AdminInput 
            placeholder="Search by user, action, or entity ID..." 
            value={q} 
            onChange={(e) => setQ(e.target.value)} 
            className="pl-9 bg-zinc-950" 
          />
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded overflow-hidden">
        {filteredLogs.length === 0 ? (
          <div className="p-12 text-center text-zinc-500 font-mono text-sm">
            <ShieldAlert className="size-8 mx-auto mb-3 opacity-20" />
            No audit logs match your search.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[800px]">
              <thead className="text-[10px] font-mono tracking-wider uppercase text-zinc-500 border-b border-zinc-800 bg-zinc-950">
                <tr>
                  <th className="text-left p-3 w-[160px]">Timestamp</th>
                  <th className="text-left p-3 w-[180px]">User</th>
                  <th className="text-left p-3 w-[180px]">Action</th>
                  <th className="text-left p-3 w-[220px]">Entity / Target</th>
                  <th className="text-left p-3">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="p-3 text-xs text-zinc-400 font-mono">
                      {fmtDateTime(log.created_at)}
                    </td>
                    <td className="p-3">
                      <div className="font-medium text-zinc-200">
                        {profiles[log.user_id] || "Unknown User"}
                      </div>
                      <div className="text-[9px] text-zinc-600 font-mono mt-0.5 truncate max-w-[150px]" title={log.user_id}>
                        {log.user_id}
                      </div>
                    </td>
                    <td className="p-3">
                      <span className="inline-block px-2 py-1 bg-orange-500/10 text-orange-400 border border-orange-500/20 text-[10px] font-mono font-bold uppercase tracking-wider rounded">
                        {log.action_type.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="p-3">
                      {log.entity_id ? (
                        <span className="text-[10px] text-zinc-400 font-mono bg-zinc-950 px-2 py-1 border border-zinc-800 rounded">
                          {log.entity_id}
                        </span>
                      ) : (
                        <span className="text-zinc-600 text-xs">—</span>
                      )}
                    </td>
                    <td className="p-3">
                      {log.details && Object.keys(log.details).length > 0 ? (
                        <div className="text-[10px] text-zinc-500 font-mono break-all max-w-xs max-h-20 overflow-y-auto scrollbar-none">
                          {JSON.stringify(log.details)}
                        </div>
                      ) : (
                        <span className="text-zinc-600 text-xs">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
