import { createLazyFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { DollarSign, ShoppingBag, Package, Undo2, TrendingUp } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { fmtMoney, fmtDate, statusColor } from "@/lib/admin-utils";

export const Route = createLazyFileRoute("/admin/dashboard")({ component: Dashboard });

type KPI = { revenue: number; orders: number; products: number; returns: number; aov: number };

function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [kpi, setKpi] = useState<KPI>({ revenue: 0, orders: 0, products: 0, returns: 0, aov: 0 });
  const [revenueSeries, setRevenueSeries] = useState<{ date: string; revenue: number }[]>([]);
  const [statusBreakdown, setStatusBreakdown] = useState<{ name: string; value: number }[]>([]);
  const [paymentBreakdown, setPaymentBreakdown] = useState<{ name: string; value: number }[]>([]);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [lowStock, setLowStock] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [ordersRes, productsRes, returnsRes, lowStockRes] = await Promise.all([
          supabase.from("orders").select("id, number, total, status, payment_mode, payment_status, customer_name, created_at").order("created_at", { ascending: false }).limit(500),
          supabase.from("products").select("id", { count: "exact", head: true }),
          supabase.from("returns").select("id", { count: "exact", head: true }),
          supabase.from("products").select("id, name, stock, slug").lt("stock", 5).order("stock").limit(10),
        ]);
        const orders = ordersRes.data ?? [];
        const revenue = orders.filter((o: any) => o.payment_status === "paid").reduce((s: number, o: any) => s + Number(o.total), 0);
        setKpi({
          revenue,
          orders: orders.length,
          products: productsRes.count ?? 0,
          returns: returnsRes.count ?? 0,
          aov: orders.length ? revenue / orders.length : 0,
        });

        // last 14 days
        const days: { date: string; revenue: number }[] = [];
        for (let i = 13; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          const key = d.toISOString().slice(0, 10);
          days.push({ date: key.slice(5), revenue: 0 });
        }
        orders.forEach((o: any) => {
          const key = String(o.created_at).slice(5, 10);
          const day = days.find((d) => d.date === key);
          if (day && o.payment_status === "paid") day.revenue += Number(o.total);
        });
        setRevenueSeries(days);

        const status: Record<string, number> = {};
        const payment: Record<string, number> = {};
        orders.forEach((o: any) => {
          status[o.status] = (status[o.status] ?? 0) + 1;
          payment[o.payment_mode] = (payment[o.payment_mode] ?? 0) + 1;
        });
        setStatusBreakdown(Object.entries(status).map(([name, value]) => ({ name, value })));
        setPaymentBreakdown(Object.entries(payment).map(([name, value]) => ({ name, value })));
        setRecentOrders(orders.slice(0, 8));
        setLowStock(lowStockRes.data ?? []);
      } catch (err) {
        console.error("Failed to load dashboard statistics", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const COLORS = ["#f97316", "#a855f7", "#3b82f6", "#10b981", "#ef4444", "#eab308"];

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        {/* KPI Row Skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-zinc-900 border border-zinc-800/80 p-4 rounded h-24 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <div className="size-8 bg-zinc-800/50 rounded" />
                <div className="h-4 w-12 bg-zinc-800/50 rounded" />
              </div>
              <div className="h-6 w-20 bg-zinc-800/50 rounded" />
            </div>
          ))}
        </div>

        {/* Charts Row Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded p-4 h-80 flex flex-col">
            <div className="h-4 w-48 bg-zinc-800/50 rounded mb-4" />
            <div className="flex-1 bg-zinc-850/30 rounded flex items-center justify-center">
              <span className="text-xs text-zinc-600 font-mono">LOADING METRICS...</span>
            </div>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded p-4 h-80 flex flex-col">
            <div className="h-4 w-32 bg-zinc-800/50 rounded mb-4" />
            <div className="flex-1 bg-zinc-850/30 rounded flex items-center justify-center">
              <div className="size-36 rounded-full border-[12px] border-zinc-800 animate-spin border-t-orange-500/30" />
            </div>
          </div>
        </div>

        {/* Table & Bottom Chart Row Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded p-4 h-72 flex flex-col">
            <div className="h-4 w-36 bg-zinc-800/50 rounded mb-4" />
            <div className="flex-1 bg-zinc-850/30 rounded" />
          </div>
          <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded p-4 h-72 flex flex-col">
            <div className="h-4 w-36 bg-zinc-800/50 rounded mb-4" />
            <div className="space-y-3 flex-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-8 bg-zinc-800/20 rounded flex items-center justify-between px-3">
                  <div className="h-3 w-16 bg-zinc-800/50 rounded" />
                  <div className="h-3 w-28 bg-zinc-800/50 rounded" />
                  <div className="h-3 w-12 bg-zinc-800/50 rounded" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KCard icon={<DollarSign className="size-4" />} label="Revenue (paid)" value={fmtMoney(kpi.revenue)} accent />
        <KCard icon={<ShoppingBag className="size-4" />} label="Orders" value={String(kpi.orders)} />
        <KCard icon={<TrendingUp className="size-4" />} label="AOV" value={fmtMoney(kpi.aov)} />
        <KCard icon={<Package className="size-4" />} label="Products" value={String(kpi.products)} />
        <KCard icon={<Undo2 className="size-4" />} label="Returns" value={String(kpi.returns)} />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded p-4">
          <h3 className="text-xs uppercase tracking-wider text-zinc-400 mb-3">Revenue — last 14 days</h3>
          <div className="h-64">
            <ResponsiveContainer>
              <LineChart data={revenueSeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="date" stroke="#71717a" fontSize={11} />
                <YAxis stroke="#71717a" fontSize={11} />
                <Tooltip contentStyle={{ background: "#18181b", border: "1px solid #27272a" }} />
                <Line type="monotone" dataKey="revenue" stroke="#f97316" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded p-4">
          <h3 className="text-xs uppercase tracking-wider text-zinc-400 mb-3">Orders by status</h3>
          <div className="h-64">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={statusBreakdown} dataKey="value" nameKey="name" outerRadius={70} label={(e) => e.name}>
                  {statusBreakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "#18181b", border: "1px solid #27272a" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded p-4">
          <h3 className="text-xs uppercase tracking-wider text-zinc-400 mb-3">Payment modes</h3>
          <div className="h-56">
            <ResponsiveContainer>
              <BarChart data={paymentBreakdown}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="name" stroke="#71717a" fontSize={11} />
                <YAxis stroke="#71717a" fontSize={11} />
                <Tooltip contentStyle={{ background: "#18181b", border: "1px solid #27272a" }} />
                <Bar dataKey="value" fill="#a855f7" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded p-4">
          <h3 className="text-xs uppercase tracking-wider text-zinc-400 mb-3">Recent orders</h3>
          {recentOrders.length === 0 ? (
            <p className="text-sm text-zinc-500 py-8 text-center">No orders yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-zinc-500 border-b border-zinc-800">
                <tr><th className="text-left py-2">Order</th><th className="text-left">Customer</th><th className="text-left">Status</th><th className="text-right">Total</th><th className="text-right">Date</th></tr>
              </thead>
              <tbody>
                {recentOrders.map((o) => (
                  <tr key={o.id} className="border-b border-zinc-800/50">
                    <td className="py-2 font-mono text-xs">{o.number}</td>
                    <td>{o.customer_name ?? "—"}</td>
                    <td><span className={`inline-block px-2 py-0.5 rounded text-[10px] uppercase border ${statusColor(o.status)}`}>{o.status}</span></td>
                    <td className="text-right">{fmtMoney(o.total)}</td>
                    <td className="text-right text-xs text-zinc-500">{fmtDate(o.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {lowStock.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded p-4">
          <h3 className="text-xs uppercase tracking-wider text-amber-400 mb-3">⚠ Low stock</h3>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-2">
            {lowStock.map((p) => (
              <div key={p.id} className="flex items-center justify-between border border-zinc-800 px-3 py-2 rounded">
                <span className="text-sm truncate">{p.name}</span>
                <span className="text-xs font-mono text-amber-400">{p.stock} left</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function KCard({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent?: boolean }) {
  return (
    <div className={`border rounded p-4 ${accent ? "bg-orange-500/10 border-orange-500/30" : "bg-zinc-900 border-zinc-800"}`}>
      <div className="flex items-center gap-2 text-zinc-400 text-xs uppercase tracking-wider">{icon}{label}</div>
      <p className={`mt-2 font-display text-2xl ${accent ? "text-orange-400" : "text-zinc-100"}`}>{value}</p>
    </div>
  );
}
