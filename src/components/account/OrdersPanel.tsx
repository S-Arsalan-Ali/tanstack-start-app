import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Truck, Loader2, ShoppingBag, Package, Award } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { userOrdersQuery, settingsQuery } from "@/lib/catalog-queries";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "@tanstack/react-router";

const STEPS = ["processing", "packed", "shipped", "delivered"];

const STEP_ICONS: Record<string, any> = {
  processing: ShoppingBag,
  packed: Package,
  shipped: Truck,
  delivered: Award,
};

export function OrdersPanel() {
  const queryClient = useQueryClient();
  const { data: orders = [], isLoading } = useQuery(userOrdersQuery());
  const { data: settings } = useQuery(settingsQuery());
  const symbol = settings?.currency_symbol ?? "Rs.";
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    if (orders.length && openId === null) {
      setOpenId(orders[0].id);
    }
  }, [orders, openId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="border border-border p-12 text-center">
        <p className="font-display text-3xl">NO ORDERS YET</p>
        <p className="text-muted-foreground mt-2">Your future rides will show up here.</p>
      </div>
    );
  }

  const formatAddress = (addr: any) => {
    if (!addr) return "—";
    return `${addr.first_name || ""} ${addr.last_name || ""}\n${addr.line1 || ""}\n${addr.city || ""}, ${addr.state || ""} ${addr.postal_code || ""}`;
  };

  const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);

  return (
    <div className="space-y-4">
      <h2 className="font-display text-4xl md:text-5xl tracking-tight">ORDERS</h2>
      <div className="space-y-3">
        {orders.map((o) => {
          const open = openId === o.id;
          const stepIdx = STEPS.indexOf(o.status);
          
          return (
            <div key={o.id} className="border border-border bg-surface/30">
              <button
                onClick={() => {
                  setOpenId(open ? null : o.id);
                  if (!open) {
                    // Mark as read when expanded
                    const nowStr = new Date().toISOString();
                    localStorage.setItem("lastReadNotifications", nowStr);
                    queryClient.invalidateQueries({ queryKey: ["account", "orders"] });
                  }
                }}
                className="w-full flex items-center justify-between gap-4 p-5 text-left"
              >
                <div className="min-w-0">
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                    {new Date(o.created_at).toLocaleDateString()}
                  </p>
                  <p className="font-display text-2xl mt-1 truncate">{o.number}</p>
                </div>
                <div className="flex items-center gap-2 md:gap-4 shrink-0">
                  <span className="hidden sm:inline font-mono text-sm text-primary">
                    {symbol}{Number(o.total).toLocaleString()}
                  </span>
                  <span
                    className={`px-2 py-0.5 font-mono text-[8px] md:text-[10px] uppercase tracking-wider border ${
                      o.payment_status === "paid"
                        ? "border-[#3fae29] text-[#3fae29] bg-[#3fae29]/5"
                        : o.payment_status === "pending"
                        ? "border-amber-500 text-amber-500 bg-amber-500/5"
                        : "border-destructive text-destructive bg-destructive/5"
                    }`}
                  >
                    {o.payment_status}
                  </span>
                  <span
                    className={`px-2 py-0.5 font-mono text-[8px] md:text-[10px] uppercase tracking-wider border ${
                      o.status === "delivered"
                        ? "border-[#3fae29] text-[#3fae29]"
                        : "border-border text-muted-foreground"
                    }`}
                  >
                    {o.status}
                  </span>
                  <ChevronDown
                    className={`size-4 transition-transform ${open ? "rotate-180" : ""}`}
                  />
                </div>
              </button>

              <AnimatePresence>
                {open && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-5 pb-5 space-y-6">
                      {/* Timeline */}
                      {stepIdx !== -1 && (
                        <div className="py-6 px-4 bg-zinc-950/20 border border-zinc-900/60 rounded-none">
                          <div className="relative flex items-center justify-between">
                            {/* Connecting Line background */}
                            <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-[2px] bg-surface-2 -z-10" />
                            
                            {/* Glowing active line */}
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${(stepIdx / (STEPS.length - 1)) * 100}%` }}
                              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                              className="absolute left-0 top-1/2 -translate-y-1/2 h-[2px] bg-primary -z-10"
                            />

                            {STEPS.map((s, i) => {
                              const Icon = STEP_ICONS[s];
                              const active = i <= stepIdx;
                              const isCurrent = i === stepIdx;
                              
                              // Find exact date/time from status logs
                              const log = o.history?.find((h: any) => h.status === s);
                              const formattedDate = log 
                                ? new Date(log.created_at).toLocaleDateString([], { month: "short", day: "numeric" })
                                : null;
                              const formattedTime = log 
                                ? new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                : null;

                              return (
                                <div key={s} className="flex flex-col items-center relative flex-1">
                                  {/* Milestone Icon Indicator */}
                                  <div
                                    className={`size-9 sm:size-11 rounded-none border-2 grid place-items-center bg-background transition-all duration-500 ${
                                      active 
                                        ? "border-primary text-primary shadow-[0_0_10px_rgba(239,68,68,0.15)]" 
                                        : "border-border text-muted-foreground"
                                    } ${isCurrent ? "scale-105 ring-2 ring-primary/20 animate-pulse-glow bg-background" : ""}`}
                                  >
                                    <Icon className="size-4 sm:size-5" />
                                  </div>

                                  {/* Step Label */}
                                  <p
                                    className={`font-display text-[10px] sm:text-xs uppercase tracking-wider mt-2.5 ${
                                      active ? "text-primary font-bold" : "text-muted-foreground"
                                    }`}
                                  >
                                    {s === "processing" ? "Ordered" : capitalize(s)}
                                  </p>

                                  {/* Milestone Date Info */}
                                  <div className="h-4 mt-1">
                                    {formattedDate ? (
                                      <p className="font-mono text-[8px] sm:text-[9px] uppercase tracking-tight text-zinc-400 text-center leading-none">
                                        {formattedDate} <span className="hidden sm:inline text-zinc-600">· {formattedTime}</span>
                                      </p>
                                    ) : (
                                      <p className="font-mono text-[8px] sm:text-[9px] uppercase tracking-tight text-zinc-600 text-center leading-none">
                                        Pending
                                      </p>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Items */}
                      <ul className="divide-y divide-border border-y border-border">
                        {(o.items ?? []).map((it: any, i: number) => (
                          <li key={i} className="py-3 flex items-center gap-3">
                            <div className="size-12 bg-surface-2 grid place-items-center font-mono text-[10px] uppercase text-muted-foreground">
                              {it.name_snapshot.slice(0, 2)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-mono text-sm truncate">{it.name_snapshot}</p>
                              <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                                {it.color} · {it.size} · Qty {it.qty}
                              </p>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              {o.status === "delivered" && it.product?.slug && (
                                <Link
                                  to="/product/$slug"
                                  params={{ slug: it.product.slug }}
                                  hash="reviews"
                                  className="font-mono text-[9px] uppercase tracking-wider text-primary border border-primary/20 hover:border-primary px-2.5 py-1.5 transition-colors bg-primary/5 hover:bg-primary/10"
                                >
                                  Review Gear
                                </Link>
                              )}
                              <span className="font-mono text-sm text-primary">{symbol}{Number(it.unit_price).toLocaleString()}</span>
                            </div>
                          </li>
                        ))}
                      </ul>

                      <div className="grid sm:grid-cols-3 gap-6 text-sm pt-4 border-t border-border/50">
                        <div>
                          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-1.5">
                            Payment Details
                          </p>
                          <div className="bg-zinc-950/20 border border-zinc-800 p-3 font-mono text-xs space-y-1">
                            <div className="flex justify-between">
                              <span className="text-zinc-500">MODE:</span>
                              <span className="text-foreground uppercase">{o.payment_mode}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-zinc-500">STATUS:</span>
                              <span className={`font-bold ${
                                o.payment_status === "paid"
                                  ? "text-[#3fae29]"
                                  : o.payment_status === "pending"
                                  ? "text-amber-500"
                                  : "text-destructive"
                              } uppercase`}>{o.payment_status}</span>
                            </div>
                            {o.payment_reference && (
                              <div className="flex justify-between">
                                <span className="text-zinc-500">REF:</span>
                                <span className="text-zinc-300 font-bold">{o.payment_reference}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div>
                          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-1.5">
                            Ship To
                          </p>
                          <p className="text-foreground whitespace-pre-line leading-relaxed text-xs">{formatAddress(o.shipping_address)}</p>
                        </div>

                        <div>
                          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-1.5">
                            Fulfillment
                          </p>
                          <div className="space-y-1.5">
                            <p className="font-mono text-xs text-foreground uppercase tracking-wider">
                              Status: <span className="text-primary font-bold">{o.status}</span>
                            </p>
                            {o.tracking && (
                              <p className="font-mono text-xs flex items-center gap-1.5 text-primary">
                                <Truck className="size-3.5" /> {o.tracking}
                              </p>
                            )}
                            {o.tracking_url && (
                              <p className="font-mono text-xs mt-1">
                                <a
                                  href={o.tracking_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-primary hover:underline flex items-center gap-1.5 break-all"
                                >
                                  Track Package
                                </a>
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Timeline / Activity Logs */}
                      {o.history && o.history.length > 0 && (
                        <div className="pt-6 border-t border-border/50 space-y-4">
                          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary font-bold">
                            Order Activity Log
                          </p>
                          <div className="relative border-l border-border pl-6 ml-3 space-y-5">
                            {(o.history as any[])
                              .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                              .map((h, idx) => {
                                const active = idx === 0;
                                
                                let badgeClass = "border-zinc-800 text-zinc-400 bg-zinc-950";
                                switch (h.status.toLowerCase()) {
                                  case "processing":
                                    badgeClass = "border-blue-500/30 text-blue-400 bg-blue-500/5";
                                    break;
                                  case "packed":
                                    badgeClass = "border-amber-500/30 text-amber-400 bg-amber-500/5";
                                    break;
                                  case "shipped":
                                    badgeClass = "border-primary/30 text-primary bg-primary/5";
                                    break;
                                  case "delivered":
                                    badgeClass = "border-emerald-500/30 text-emerald-400 bg-emerald-500/5";
                                    break;
                                }

                                return (
                                  <div key={idx} className="relative group">
                                    {/* Vertical Timeline Node Marker */}
                                    <div 
                                      className={`absolute -left-6 -translate-x-1/2 top-1.5 size-2 rounded-full border-2 transition-all duration-300 ${
                                        active 
                                          ? "bg-primary border-primary scale-125 shadow-[0_0_8px_rgba(239,68,68,0.4)] animate-pulse" 
                                          : "bg-background border-border group-hover:border-zinc-400"
                                      }`}
                                    />

                                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                                      {/* Timestamp */}
                                      <span className="font-mono text-[10px] text-muted-foreground shrink-0 select-none sm:w-32">
                                        {new Date(h.created_at).toLocaleDateString([], { month: "short", day: "numeric" })} · {new Date(h.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                      </span>
                                      
                                      <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-0">
                                        {/* Color Badge */}
                                        <span className={`font-mono uppercase text-[9px] font-bold px-2 py-0.5 border shrink-0 ${badgeClass}`}>
                                          {h.status === "processing" ? "ordered" : h.status}
                                        </span>
                                        
                                        {/* Activity Note */}
                                        <span className="text-xs text-zinc-300 font-sans group-hover:text-foreground transition-colors break-words whitespace-pre-wrap flex-1 min-w-0">
                                          {h.notes ? h.notes.replace(/^Manual Alert Sent via (WhatsApp|Email & WhatsApp|Email):\s*/i, "") : ""}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}
