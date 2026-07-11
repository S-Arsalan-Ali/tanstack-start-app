import { createLazyFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Search, Shield, UserCog } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { fmtDate, fmtMoney, statusColor, logActivity } from "@/lib/admin-utils";
import { EntityDrawer, AdminInput, GhostBtn, PrimaryBtn } from "@/components/admin/EntityDrawer";
import { toast } from "sonner";

export const Route = createLazyFileRoute("/admin/customers")({
  component: Customers,
});

type Profile = {
  id: string; user_id: string; name: string | null; email: string | null;
  phone: string | null; created_at: string;
};
type Role = "admin" | "staff" | "customer";

function Customers() {
  const [rows, setRows] = useState<Profile[]>([]);
  const [rolesMap, setRolesMap] = useState<Record<string, Role[]>>({});
  const [orderStats, setOrderStats] = useState<Record<string, { count: number; total: number }>>({});
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Profile | null>(null);
  const [drawerOrders, setDrawerOrders] = useState<any[]>([]);
  const [meIsAdmin, setMeIsAdmin] = useState(false);

  const load = async () => {
    const [{ data: profiles }, { data: roles }, { data: orders }, { data: sess }] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("user_id, role"),
      supabase.from("orders").select("user_id, total, payment_status"),
      supabase.auth.getSession(),
    ]);
    setRows((profiles ?? []) as Profile[]);
    const rmap: Record<string, Role[]> = {};
    (roles ?? []).forEach((r: any) => { (rmap[r.user_id] ??= []).push(r.role); });
    setRolesMap(rmap);
    const stats: Record<string, { count: number; total: number }> = {};
    (orders ?? []).forEach((o: any) => {
      if (!o.user_id) return;
      const s = (stats[o.user_id] ??= { count: 0, total: 0 });
      s.count += 1;
      if (o.payment_status === "paid") s.total += Number(o.total);
    });
    setOrderStats(stats);
    const uid = sess.session?.user.id;
    if (uid) setMeIsAdmin((rmap[uid] ?? []).includes("admin"));
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => rows.filter((r) => {
    if (!q) return true;
    const s = q.toLowerCase();
    return (r.name ?? "").toLowerCase().includes(s) || (r.email ?? "").toLowerCase().includes(s);
  }), [rows, q]);

  const openDetail = async (p: Profile) => {
    setSelected(p);
    const { data } = await supabase.from("orders").select("id, number, total, status, payment_status, created_at").eq("user_id", p.user_id).order("created_at", { ascending: false }).limit(50);
    setDrawerOrders(data ?? []);
  };

  const setRole = async (userId: string, role: Role, on: boolean) => {
    if (!meIsAdmin) return toast.error("Admins only");
    if (on) {
      const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
      if (error && !error.message.includes("duplicate")) return toast.error(error.message);
      logActivity("ASSIGN_ROLE", userId, { role, target_user: selected?.name || userId });
    } else {
      const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", role);
      if (error) return toast.error(error.message);
      logActivity("REMOVE_ROLE", userId, { role, target_user: selected?.name || userId });
    }
    toast.success("Roles updated");
    await load();
  };

  return (
    <div className="space-y-4">
      <div className="relative max-w-xs">
        <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
        <AdminInput placeholder="Search customers..." value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead className="text-xs uppercase text-zinc-500 border-b border-zinc-800">
              <tr>
                <th className="text-left p-3">Name</th>
                <th className="text-left p-3">Email</th>
                <th className="text-left p-3">Role</th>
                <th className="text-right p-3">Orders</th>
                <th className="text-right p-3">Lifetime</th>
                <th className="text-left p-3">Joined</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-zinc-500">No customers.</td></tr>}
              {filtered.map((r) => {
                const userRoles = rolesMap[r.user_id] ?? [];
                const stats = orderStats[r.user_id] ?? { count: 0, total: 0 };
                return (
                  <tr key={r.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 cursor-pointer" onClick={() => openDetail(r)}>
                    <td className="p-3 font-medium">{r.name ?? "—"}</td>
                    <td className="p-3 text-zinc-400">{r.email}</td>
                    <td className="p-3">
                      <div className="flex gap-1 flex-wrap">
                        {userRoles.length === 0 && <span className="text-xs text-zinc-600">—</span>}
                        {userRoles.map((rl) => (
                          <span key={rl} className={`text-[10px] uppercase px-2 py-0.5 rounded border ${rl === "admin" ? "border-orange-500/40 text-orange-400 bg-orange-500/10" : rl === "staff" ? "border-blue-500/40 text-blue-400 bg-blue-500/10" : "border-zinc-700 text-zinc-400"}`}>{rl}</span>
                        ))}
                      </div>
                    </td>
                    <td className="p-3 text-right">{stats.count}</td>
                    <td className="p-3 text-right">{fmtMoney(stats.total)}</td>
                    <td className="p-3 text-xs text-zinc-500">{fmtDate(r.created_at)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <EntityDrawer
        open={!!selected}
        onOpenChange={(o) => !o && setSelected(null)}
        title={selected?.name ?? "Customer"}
        description={selected?.email ?? ""}
        footer={<GhostBtn onClick={() => setSelected(null)}>Close</GhostBtn>}
      >
        {selected && (
          <div className="space-y-6">
            <section>
              <h3 className="text-[10px] uppercase tracking-wider text-zinc-500 mb-2">Profile</h3>
              <div className="bg-zinc-900 border border-zinc-800 rounded p-3 text-sm grid grid-cols-2 gap-y-2">
                <span className="text-zinc-500">Name</span><span>{selected.name ?? "—"}</span>
                <span className="text-zinc-500">Email</span><span className="truncate">{selected.email}</span>
                <span className="text-zinc-500">Phone</span><span>{selected.phone ?? "—"}</span>
                <span className="text-zinc-500">Joined</span><span>{fmtDate(selected.created_at)}</span>
              </div>
            </section>

            <section>
              <h3 className="text-[10px] uppercase tracking-wider text-zinc-500 mb-2 flex items-center gap-2"><UserCog className="size-3" />Roles {!meIsAdmin && <span className="text-amber-500/70">(admin only)</span>}</h3>
              <div className="flex flex-wrap gap-2">
                {(["admin", "staff", "customer"] as Role[]).map((role) => {
                  const has = (rolesMap[selected.user_id] ?? []).includes(role);
                  return (
                    <button
                      key={role}
                      disabled={!meIsAdmin}
                      onClick={() => setRole(selected.user_id, role, !has)}
                      className={`px-3 py-1.5 rounded border text-xs uppercase tracking-wider transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${has ? (role === "admin" ? "border-orange-500 bg-orange-500/15 text-orange-300" : role === "staff" ? "border-blue-500 bg-blue-500/15 text-blue-300" : "border-zinc-600 bg-zinc-800 text-zinc-200") : "border-zinc-800 text-zinc-500 hover:border-zinc-600"}`}
                    >
                      {has && <Shield className="size-3 inline mr-1" />}{role}
                    </button>
                  );
                })}
              </div>
            </section>

            <section>
              <h3 className="text-[10px] uppercase tracking-wider text-zinc-500 mb-2">Order history ({drawerOrders.length})</h3>
              {drawerOrders.length === 0 ? (
                <p className="text-sm text-zinc-500 py-4 text-center bg-zinc-900 border border-zinc-800 rounded">No orders yet.</p>
              ) : (
                <div className="bg-zinc-900 border border-zinc-800 rounded overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="text-[10px] uppercase text-zinc-500 border-b border-zinc-800">
                      <tr><th className="text-left p-2">Order</th><th className="text-left p-2">Status</th><th className="text-right p-2">Total</th><th className="text-right p-2">Date</th></tr>
                    </thead>
                    <tbody>
                      {drawerOrders.map((o) => (
                        <tr key={o.id} className="border-b border-zinc-800/50">
                          <td className="p-2 font-mono text-xs">{o.number}</td>
                          <td className="p-2"><span className={`inline-block px-1.5 py-0.5 rounded text-[10px] uppercase border ${statusColor(o.status)}`}>{o.status}</span></td>
                          <td className="p-2 text-right">{fmtMoney(o.total)}</td>
                          <td className="p-2 text-right text-xs text-zinc-500">{fmtDate(o.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        )}
      </EntityDrawer>
    </div>
  );
}
