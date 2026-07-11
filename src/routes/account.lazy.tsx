import { createLazyFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { User, Package, MapPin, Settings, Heart, LogOut, Bell } from "lucide-react";
import { toast } from "sonner";
import { useShop } from "@/store/shop";
import { DashboardPanel } from "@/components/account/DashboardPanel";
import { OrdersPanel } from "@/components/account/OrdersPanel";
import { AddressesPanel } from "@/components/account/AddressesPanel";
import { SettingsPanel } from "@/components/account/SettingsPanel";
import { NotificationsPanel } from "@/components/account/NotificationsPanel";
import { useQuery } from "@tanstack/react-query";
import { userOrdersQuery } from "@/lib/catalog-queries";

export const Route = createLazyFileRoute("/account")({
  component: AccountPage,
});

const tabs = [
  { id: "dashboard", label: "Dashboard", icon: User },
  { id: "orders", label: "Orders", icon: Package },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "addresses", label: "Addresses", icon: MapPin },
  { id: "wishlist", label: "Wishlist", icon: Heart },
  { id: "settings", label: "Settings", icon: Settings },
] as const;

function AccountPage() {
  const signOut = useShop((s) => s.signOut);
  const profile = useShop((s) => s.profile);
  const navigate = useNavigate();
  
  const { tab: searchTab } = Route.useSearch();
  const [tab, setTab] = useState<string>("dashboard");
  const { data: orders = [] } = useQuery(userOrdersQuery());
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (searchTab) {
      setTab(searchTab);
    }
  }, [searchTab]);

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
  }, [orders, tab]);

  return (
    <section className="pt-24 md:pt-28 pb-32 mx-auto max-w-[1400px] px-4 md:px-8">
      <div className="grid lg:grid-cols-[280px_1fr] gap-10">
        <aside className="lg:sticky lg:top-28 lg:self-start space-y-6">
          <div className="flex items-center gap-3 p-4 border border-border bg-surface/30">
            <div className="size-12 bg-fire grid place-items-center font-display text-2xl text-primary-foreground">
              {profile.name[0]}
            </div>
            <div className="min-w-0">
              <p className="font-display text-lg truncate">{profile.name}</p>
              <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground truncate">
                {profile.email}
              </p>
            </div>
          </div>
          <nav className="space-y-1">
            {tabs.map((t) => {
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`w-full text-left flex items-center gap-3 px-4 py-3 font-mono text-xs uppercase tracking-[0.2em] border-l-2 transition-colors ${
                    active
                      ? "border-primary text-primary bg-surface"
                      : "border-transparent text-muted-foreground hover:text-foreground hover:bg-surface/50"
                  }`}
                >
                  <t.icon className="size-4" /> 
                  <span className="flex-1">{t.label}</span>
                  {t.id === "notifications" && unreadCount > 0 && (
                    <span className="min-w-[18px] h-[18px] px-1 grid place-items-center bg-primary text-primary-foreground text-[9px] font-mono font-bold rounded-full animate-pulse-glow">
                      {unreadCount}
                    </span>
                  )}
                </button>
              );
            })}
            <button
              onClick={() => { signOut(); toast("Signed out"); navigate({ to: "/" }); }}
              className="w-full text-left flex items-center gap-3 px-4 py-3 font-mono text-xs uppercase tracking-[0.2em] border-l-2 border-transparent text-muted-foreground hover:text-destructive transition-colors"
            >
              <LogOut className="size-4" /> Sign Out
            </button>
          </nav>
        </aside>

        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="min-w-0"
        >
          {tab === "dashboard" && <DashboardPanel onTab={setTab} />}
          {tab === "orders" && <OrdersPanel />}
          {tab === "notifications" && <NotificationsPanel />}
          {tab === "addresses" && <AddressesPanel />}
          {tab === "settings" && <SettingsPanel />}
          {tab === "wishlist" && <WishlistRedirect />}
        </motion.div>
      </div>
    </section>
  );
}

function WishlistRedirect() {
  return (
    <div className="border border-border p-12 text-center">
      <p className="font-display text-3xl">YOUR GARAGE</p>
      <p className="text-muted-foreground mt-2 mb-6">Saved helmets live on the dedicated wishlist page.</p>
      <Link to="/wishlist" className="inline-block bg-primary text-primary-foreground px-6 py-3 font-mono text-xs uppercase tracking-[0.2em] font-bold">
        Go to Wishlist
      </Link>
    </div>
  );
}
