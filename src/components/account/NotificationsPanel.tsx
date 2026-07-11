import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { userOrdersQuery } from "@/lib/catalog-queries";
import { Check, ClipboardList, Package, Truck, CheckSquare, Bell, ArrowRight } from "lucide-react";
import { Link } from "@tanstack/react-router";

type OrderHistoryItem = {
  id: string;
  order_id: string;
  order_number: string;
  status: string;
  notes: string | null;
  created_at: string;
};

export function NotificationsPanel() {
  const queryClient = useQueryClient();
  const { data: orders = [], isLoading } = useQuery(userOrdersQuery());
  const [lastRead, setLastRead] = useState<number>(0);

  useEffect(() => {
    const lastReadStr = localStorage.getItem("lastReadNotifications") || "1970-01-01T00:00:00.000Z";
    setLastRead(new Date(lastReadStr).getTime());

    // Auto-mark as read after 1.5 seconds so user can see which ones are new before they fade
    const timer = setTimeout(() => {
      const nowStr = new Date().toISOString();
      localStorage.setItem("lastReadNotifications", nowStr);
      setLastRead(new Date(nowStr).getTime());
      // Invalidate queries so that the badges in account sidebar/header recalculate
      queryClient.invalidateQueries({ queryKey: ["account", "orders"] });
    }, 1500);

    return () => clearTimeout(timer);
  }, [queryClient]);

  const notifications = useMemo(() => {
    const list: OrderHistoryItem[] = [];
    for (const o of orders) {
      for (const h of o.history ?? []) {
        list.push({
          id: h.id,
          order_id: o.id,
          order_number: o.number,
          status: h.status,
          notes: h.notes,
          created_at: h.created_at,
        });
      }
    }
    return list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [orders]);

  const markAllRead = () => {
    const nowStr = new Date().toISOString();
    localStorage.setItem("lastReadNotifications", nowStr);
    setLastRead(new Date(nowStr).getTime());
    queryClient.invalidateQueries({ queryKey: ["account", "orders"] });
  };

  const getStatusMeta = (status: string) => {
    switch (status.toLowerCase()) {
      case "processing":
        return {
          title: "Order Placed & Registered",
          icon: ClipboardList,
          color: "text-blue-500 bg-blue-500/10 border-blue-500/20",
          desc: "We've received your order and queued it for pit lane checks and safety inspections.",
        };
      case "packed":
        return {
          title: "Gear Prepped & Packed",
          icon: Package,
          color: "text-amber-500 bg-amber-500/10 border-amber-500/20",
          desc: "Your gear has passed our quality inspections and is safely boxed for courier handoff.",
        };
      case "shipped":
        return {
          title: "Dispatched from Grid",
          icon: Truck,
          color: "text-primary bg-primary/10 border-primary/20",
          desc: "Your package is on track! It has left our hub and is headed to your shipping destination.",
        };
      case "delivered":
        return {
          title: "Podium Finish - Delivered",
          icon: CheckSquare,
          color: "text-green-500 bg-green-500/10 border-green-500/20",
          desc: "Gear delivered! We hope it serves you well. Wear it with pride and ride safely.",
        };
      default:
        return {
          title: "Order Status Updated",
          icon: Bell,
          color: "text-zinc-400 bg-zinc-400/10 border-zinc-400/20",
          desc: "Your order details have been updated.",
        };
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h2 className="font-display text-4xl md:text-5xl tracking-tight">NOTIFICATIONS</h2>
        <div className="flex justify-center py-12">
          <div className="size-6 border-2 border-primary border-t-transparent animate-spin rounded-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="font-display text-4xl md:text-5xl tracking-tight">INBOX & LOGS</h2>
        {notifications.some((n) => new Date(n.created_at).getTime() > lastRead) && (
          <button
            onClick={markAllRead}
            className="font-mono text-xs uppercase tracking-wider text-primary border border-primary/20 hover:border-primary px-3 py-1.5 transition-colors flex items-center gap-1.5 bg-primary/5"
          >
            <Check className="size-3.5" /> Mark all as read
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="border border-border p-12 text-center bg-surface/10">
          <p className="font-display text-2xl text-muted-foreground">NO NOTIFICATIONS</p>
          <p className="text-sm text-muted-foreground/60 mt-1">Updates on your active shipments will appear here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => {
            const meta = getStatusMeta(n.status);
            const Icon = meta.icon;
            const isNew = new Date(n.created_at).getTime() > lastRead;

            return (
              <div
                key={n.id}
                className={`relative border transition-all duration-500 p-4 sm:p-5 flex items-start gap-4 ${
                  isNew
                    ? "bg-surface/50 border-primary/40 shadow-[0_0_15px_rgba(239,68,68,0.05)] border-l-4 border-l-primary"
                    : "bg-surface/20 border-border"
                }`}
              >
                {isNew && (
                  <span className="absolute top-3 right-3 size-2 bg-primary rounded-full animate-pulse-glow" />
                )}

                <div className={`p-2.5 border shrink-0 ${meta.color}`}>
                  <Icon className="size-5" />
                </div>

                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <h3 className="font-display text-lg tracking-wide uppercase">{meta.title}</h3>
                    <span className="font-mono text-[10px] uppercase text-muted-foreground">
                      Order: #{n.order_number}
                    </span>
                  </div>

                  <p className="text-sm text-zinc-300 leading-relaxed font-sans">
                    {meta.desc}
                  </p>
                  
                  {n.notes && (
                    <div className="bg-zinc-950/40 border border-zinc-900/60 px-3 py-2 font-mono text-[11px] text-zinc-400 mt-2 break-words whitespace-pre-wrap">
                      RIDER NOTE: "{n.notes.replace(/^Manual Alert Sent via (WhatsApp|Email & WhatsApp|Email):\s*/i, "")}"
                    </div>
                  )}

                  {n.status.toLowerCase() === "delivered" && (
                    (() => {
                      const order = orders.find((o) => o.id === n.order_id);
                      if (!order || !order.items || order.items.length === 0) return null;
                      return (
                        <div className="mt-3.5 pt-3 border-t border-border/40 space-y-2.5">
                          <p className="font-mono text-[10px] text-primary uppercase tracking-widest font-semibold">
                            Review your gear:
                          </p>
                          <div className="grid sm:grid-cols-2 gap-2">
                            {order.items.map((it: any, idx: number) => {
                              const productSlug = it.product?.slug || "";
                              if (!productSlug) return null;
                              return (
                                <Link
                                  key={idx}
                                  to="/product/$slug"
                                  params={{ slug: productSlug }}
                                  hash="reviews"
                                  className="flex items-center justify-between gap-3 p-2 bg-zinc-950/40 border border-zinc-900 hover:border-primary/50 transition-colors group/item"
                                >
                                  <div className="min-w-0">
                                    <p className="font-mono text-xs truncate group-hover/item:text-primary transition-colors">
                                      {it.name_snapshot}
                                    </p>
                                    <p className="font-mono text-[9px] text-muted-foreground uppercase">
                                      Size: {it.size}
                                    </p>
                                  </div>
                                  <span className="font-mono text-[9px] uppercase text-primary border border-primary/20 group-hover/item:border-primary px-2 py-1 shrink-0 bg-primary/5 group-hover/item:bg-primary/10">
                                    Leave Review
                                  </span>
                                </Link>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()
                  )}

                  <div className="flex justify-between items-center pt-2">
                    <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
                      {new Date(n.created_at).toLocaleDateString([], {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}{" "}
                      {new Date(n.created_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>

                    <Link
                      to="/account"
                      search={{ tab: "orders" }}
                      className="font-mono text-[10px] uppercase text-primary hover:text-primary-glow flex items-center gap-1 group"
                    >
                      Track Order <ArrowRight className="size-3 transition-transform group-hover:translate-x-1" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
