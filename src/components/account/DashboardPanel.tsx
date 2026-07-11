import { Link } from "@tanstack/react-router";
import { Package, Heart, Award, ArrowUpRight, Bell } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useShop } from "@/store/shop";
import { featuredQuery, productsQuery, userOrdersQuery } from "@/lib/catalog-queries";
import { useState, useEffect } from "react";

export function DashboardPanel({ onTab }: { onTab: (id: string) => void }) {
  const profile = useShop((s) => s.profile);
  const wishlist = useShop((s) => s.wishlist);
  const { data: orders = [] } = useQuery(userOrdersQuery());
  const latest = orders[0];

  const { data: featured = [] } = useQuery(featuredQuery());
  const { data: all = [] } = useQuery(productsQuery({}));
  const recommended = (featured.length ? featured : all).slice(0, 3);

  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const lastReadStr = localStorage.getItem("lastReadNotifications") || "1970-01-01T00:00:00.000Z";
    const lastRead = new Date(lastReadStr).getTime();
    
    let count = 0;
    for (const o of orders) {
      for (const h of o.history ?? []) {
        if (new Date(h.created_at).getTime() > lastRead) {
          count++;
        }
      }
    }
    setUnreadCount(count);
  }, [orders]);

  return (
    <div className="space-y-10">
      {unreadCount > 0 && (
        <div className="border border-primary/30 bg-primary/5 p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 animate-pulse-glow shadow-[0_0_15px_rgba(239,68,68,0.05)]">
          <div className="flex items-center gap-3">
            <div className="size-8 bg-primary/20 text-primary border border-primary/30 grid place-items-center animate-bounce">
              <Bell className="size-4" />
            </div>
            <div>
              <p className="font-mono text-xs uppercase tracking-wider text-foreground">Status Updates Received</p>
              <p className="text-xs text-muted-foreground mt-0.5">You have {unreadCount} new order update{unreadCount !== 1 ? "s" : ""} in your inbox.</p>
            </div>
          </div>
          <button onClick={() => onTab("notifications")} className="font-mono text-xs uppercase tracking-wider text-primary border border-primary/20 hover:border-primary px-3 py-1.5 transition-colors bg-primary/5">
            Open Inbox
          </button>
        </div>
      )}

      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Welcome back</p>
        <h2 className="font-display text-4xl md:text-5xl tracking-tight mt-1">
          RIDER, {profile.name.split(" ")[0].toUpperCase()}
        </h2>
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        <Stat icon={Package} label="Orders" value={orders.length.toString()} onClick={() => onTab("orders")} />
        <Stat icon={Heart} label="Wishlist" value={wishlist.length.toString()} />
        <Stat icon={Award} label="Points" value={profile.points.toLocaleString()} />
      </div>

      {latest && (
        <div className="border border-border bg-surface/40 p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Latest Order</p>
              <p className="font-display text-2xl mt-1">{latest.number}</p>
            </div>
            <span className="px-3 py-1 border border-primary text-primary font-mono text-[10px] uppercase tracking-[0.2em]">
              {latest.status}
            </span>
          </div>
          <div className="space-y-2 text-sm">
            <p className="text-muted-foreground">
              {latest.items.length} item{latest.items.length !== 1 ? "s" : ""} ·{" "}
              <span className="text-primary font-mono">${latest.total}</span>
            </p>
            <p className="font-mono text-xs text-muted-foreground">
              Placed {new Date(latest.created_at).toLocaleDateString()}
            </p>
          </div>
          <button
            onClick={() => onTab("orders")}
            className="mt-5 inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.2em] text-primary hover:text-primary-glow"
          >
            View Orders <ArrowUpRight className="size-4" />
          </button>
        </div>
      )}

      {recommended.length > 0 && (
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-4">Recommended for You</p>
          <div className="grid sm:grid-cols-3 gap-4">
            {recommended.map((p) => (
              <Link
                key={p.id}
                to="/product/$slug"
                params={{ slug: p.slug }}
                className="group block border border-border hover:border-primary/50 transition-colors"
              >
                <div className="aspect-square bg-surface overflow-hidden">
                  <img src={p.primary_image} alt={p.name} className="size-full object-cover transition-transform duration-500 group-hover:scale-105" />
                </div>
                <div className="p-3">
                  <p className="font-display text-lg leading-tight">{p.name}</p>
                  <p className="font-mono text-xs text-primary mt-1">${p.price}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({
  icon: Icon, label, value, onClick,
}: {
  icon: typeof Package; label: string; value: string; onClick?: () => void;
}) {
  const Comp: React.ElementType = onClick ? "button" : "div";
  return (
    <Comp onClick={onClick} className="text-left border border-border bg-surface/40 p-5 hover:border-primary/40 transition-colors">
      <Icon className="size-5 text-primary" />
      <p className="font-display text-3xl mt-3">{value}</p>
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground mt-1">{label}</p>
    </Comp>
  );
}
