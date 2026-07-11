import { Link, Outlet, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Package,
  FolderTree,
  Tag,
  ShoppingBag,
  Undo2,
  Users,
  Settings,
  LogOut,
  Menu,
  X,
  Store,
  Ticket,
  Mail,
  Bell,
  AlertTriangle,
  User,
  Phone,
  Shield,
} from "lucide-react";
import { useState, useEffect, useRef, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { ConfirmProvider } from "@/components/admin/ConfirmDialog";

const nav = [
  { to: "/admin/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/admin/products", icon: Package, label: "Products" },
  { to: "/admin/categories", icon: FolderTree, label: "Categories" },
  { to: "/admin/brands", icon: Tag, label: "Brands" },
  { to: "/admin/orders", icon: ShoppingBag, label: "Orders" },
  { to: "/admin/returns", icon: Undo2, label: "Returns" },
  { to: "/admin/coupons", icon: Ticket, label: "Promo Codes", adminOnly: true },
  { to: "/admin/customers", icon: Users, label: "Customers" },
  { to: "/admin/messages", icon: Mail, label: "Messages" },
  { to: "/admin/activity-logs", icon: Shield, label: "Activity Logs", adminOnly: true },
  { to: "/admin/staff", icon: User, label: "Staff", adminOnly: true },
  { to: "/admin/settings", icon: Settings, label: "Settings" },
] as const;

export function AdminLayout({ userEmail }: { userEmail?: string | null }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Notifications Data Fetching
  const { data: unreadMessages = [] } = useQuery({
    queryKey: ["admin", "unread-messages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contact_messages")
        .select("id, name, topic, created_at")
        .eq("is_read", false)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    refetchInterval: 30000,
  });

  const { data: pendingOrders = [] } = useQuery({
    queryKey: ["admin", "pending-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id, number, customer_name, total, created_at")
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    refetchInterval: 30000,
  });

  const { data: stockAlerts = [] } = useQuery({
    queryKey: ["admin", "stock-alerts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, stock, slug")
        .eq("status", "active")
        .lte("stock", 5)
        .order("stock", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    refetchInterval: 60000,
  });

  // Profile and Roles Data Fetching
  const { data: profile } = useQuery({
    queryKey: ["admin", "profile"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profileData, error: profileErr } = await supabase
        .from("profiles")
        .select("name, email, phone")
        .eq("user_id", user.id)
        .maybeSingle();

      if (profileErr) throw profileErr;

      const { data: roleData, error: roleErr } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      if (roleErr) throw roleErr;

      const roles = (roleData ?? []).map((r) => r.role);
      const isSystemAdmin = roles.includes("admin");
      const isSystemStaff = roles.includes("staff");
      const displayRole = isSystemAdmin ? "Admin" : isSystemStaff ? "Staff" : "User";

      return {
        id: user.id,
        email: profileData?.email || user.email || "",
        name: profileData?.name || user.email?.split("@")[0] || "Admin User",
        phone: profileData?.phone || user.phone || null,
        role: displayRole,
      };
    },
    staleTime: 300000,
  });

  const [showNotifications, setShowNotifications] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const profileDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target as Node)) {
        setShowProfileDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const totalAlerts = unreadMessages.length + pendingOrders.length + stockAlerts.length;

  const combinedAlerts = useMemo(() => {
    const items: Array<{
      id: string;
      type: "message" | "order" | "stock";
      title: string;
      description: string;
      time?: string;
      link: string;
    }> = [];

    stockAlerts.forEach((item) => {
      items.push({
        id: `stock-${item.id}`,
        type: "stock",
        title: item.stock === 0 ? "❌ OUT OF STOCK" : "⚠️ LOW STOCK WARNING",
        description: `"${item.name}" has only ${item.stock} left in stock.`,
        link: "/admin/products",
      });
    });

    pendingOrders.forEach((item) => {
      items.push({
        id: `order-${item.id}`,
        type: "order",
        title: "📦 NEW PENDING ORDER",
        description: `Order #${item.number} placed by ${item.customer_name ?? "Guest"}.`,
        time: item.created_at,
        link: "/admin/orders",
      });
    });

    unreadMessages.forEach((item) => {
      items.push({
        id: `msg-${item.id}`,
        type: "message",
        title: "✉️ NEW CUSTOMER MESSAGE",
        description: `From ${item.name} regarding: "${item.topic}".`,
        time: item.created_at,
        link: "/admin/messages",
      });
    });

    return items.sort((a, b) => {
      if (a.type === "stock" && b.type !== "stock") return -1;
      if (b.type === "stock" && a.type !== "stock") return 1;
      if (a.time && b.time) {
        return new Date(b.time).getTime() - new Date(a.time).getTime();
      }
      return 0;
    });
  }, [unreadMessages, pendingOrders, stockAlerts]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate({ to: "/login" });
  };

  return (
    <ConfirmProvider>
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 bg-zinc-900 border-r border-zinc-800 flex flex-col transition-transform md:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="h-16 border-b border-zinc-800 flex items-center justify-between px-5">
          <Link to="/admin/dashboard" className="font-display text-xl tracking-tight">
            MOTO<span className="text-orange-500">ADMIN</span>
          </Link>
          <button className="md:hidden" onClick={() => setMobileOpen(false)}>
            <X className="size-5" />
          </button>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {nav.filter(n => !(n as any).adminOnly || profile?.role === "Admin").map((n) => {
            const active = path === n.to || path.startsWith(n.to + "/");
            let badgeCount = 0;
            let badgeColor = "bg-orange-500 text-black";
            if (n.to === "/admin/messages") {
              badgeCount = unreadMessages.length;
            } else if (n.to === "/admin/orders") {
              badgeCount = pendingOrders.length;
            } else if (n.to === "/admin/products") {
              badgeCount = stockAlerts.length;
              badgeColor = "bg-red-500/15 text-red-400 border border-red-500/30";
            }

            return (
              <Link
                key={n.to}
                to={n.to}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors",
                  active
                    ? "bg-orange-500/10 text-orange-400 border-l-2 border-orange-500"
                    : "text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-100"
                )}
              >
                <n.icon className="size-4 shrink-0" />
                <span className="flex-1">{n.label}</span>
                {badgeCount > 0 && (
                  <span className={cn("text-[9px] font-mono font-bold px-2 py-0.5 rounded-full", badgeColor)}>
                    {badgeCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-zinc-800 p-3 space-y-1">
          <Link
            to="/"
            className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-100"
          >
            <Store className="size-4" /> View storefront
          </Link>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-100"
          >
            <LogOut className="size-4" /> Sign out
          </button>
          {userEmail && (
            <p className="px-3 pt-2 text-[11px] text-zinc-500 truncate">{userEmail}</p>
          )}
        </div>
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 bg-black/60 z-30 md:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Main */}
      <div className="flex-1 md:ml-64 flex flex-col min-w-0">
        <header className="h-16 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between px-4 md:px-6 sticky top-0 z-20">
          <div className="flex items-center min-w-0">
            <button className="md:hidden mr-3 shrink-0" onClick={() => setMobileOpen(true)}>
              <Menu className="size-5" />
            </button>
            <h1 className="font-display text-lg tracking-tight uppercase truncate">
              {nav.find((n) => path === n.to || path.startsWith(n.to + "/"))?.label ?? "Admin"}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {/* Storefront Icon */}
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="size-10 rounded-md border border-zinc-800 hover:border-orange-500 hover:text-orange-400 flex items-center justify-center text-zinc-400 transition-all"
              title="View Storefront"
            >
              <Store className="size-4" />
            </a>

            {/* Notification Bell Icon & Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="size-10 rounded-md border border-zinc-800 hover:border-orange-500 hover:text-orange-400 flex items-center justify-center text-zinc-400 relative transition-all"
                title="Alerts Center"
              >
                <Bell className="size-4" />
                {totalAlerts > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-orange-500 text-black text-[9px] font-mono font-bold rounded-full flex items-center justify-center shadow-[0_0_8px_rgba(255,87,34,0.6)] animate-pulse">
                    {totalAlerts}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-zinc-900 border border-zinc-800 shadow-2xl rounded-md z-30 font-mono text-xs text-zinc-300 overflow-hidden divide-y divide-zinc-800 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="p-3 bg-zinc-950 flex justify-between items-center">
                    <span className="font-bold text-orange-400 tracking-wider">ALERTS TELEMETRY</span>
                    <span className="text-[9px] text-zinc-500">{totalAlerts} ACTIVE</span>
                  </div>

                  <div className="max-h-72 overflow-y-auto divide-y divide-zinc-800/50 scrollbar-none">
                    {combinedAlerts.length === 0 ? (
                      <div className="p-6 text-center text-zinc-500">
                        <p>STATUS GREEN</p>
                        <p className="text-[9px] text-zinc-650 mt-1 uppercase">0 active alerts logged</p>
                      </div>
                    ) : (
                      combinedAlerts.map((alert) => (
                        <button
                          key={alert.id}
                          onClick={() => {
                            setShowNotifications(false);
                            navigate({ to: alert.link as any });
                          }}
                          className="w-full text-left p-3 hover:bg-zinc-800/40 transition-colors flex gap-2.5 items-start block"
                        >
                          <div className="flex-1 space-y-1">
                            <div className="flex justify-between items-start gap-1">
                              <span className={cn(
                                "text-[9px] font-bold tracking-wider",
                                alert.type === "stock" ? "text-red-400" : alert.type === "order" ? "text-emerald-400" : "text-orange-400"
                              )}>
                                {alert.title}
                              </span>
                              {alert.time && (
                                <span className="text-[8px] text-zinc-650 shrink-0">
                                  {new Date(alert.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-zinc-400 font-sans leading-normal">
                              {alert.description}
                            </p>
                          </div>
                        </button>
                      ))
                    )}
                  </div>

                  {totalAlerts > 0 && (
                    <div className="p-2 bg-zinc-950/60 text-center">
                      <span className="text-[9px] text-zinc-500">SYSTEM STABLE · CLICK ALERT TO ROUTE</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Profile Dropdown */}
            <div className="relative" ref={profileDropdownRef}>
              <button 
                onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                className="size-10 rounded-full bg-orange-500/10 border border-orange-500/30 hover:bg-orange-500/20 hover:border-orange-500 text-orange-400 font-bold flex items-center justify-center transition-all focus:outline-none"
                title="Profile Menu"
              >
                {profile?.name ? profile.name[0].toUpperCase() : (userEmail ? userEmail[0].toUpperCase() : "A")}
              </button>

              {showProfileDropdown && (
                <div className="absolute right-0 mt-2 w-72 bg-zinc-900 border border-zinc-800 shadow-2xl rounded-md z-30 font-mono text-xs text-zinc-300 overflow-hidden divide-y divide-zinc-800 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="p-4 bg-zinc-950 flex flex-col gap-1.5">
                    <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Authenticated User</span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="font-display font-semibold text-sm text-white truncate max-w-[150px]">
                        {profile?.name || "Admin User"}
                      </span>
                      <span className={cn(
                        "text-[9px] font-bold px-2 py-0.5 rounded-full select-none shrink-0 font-mono",
                        profile?.role === "Admin" ? "bg-orange-500/10 text-orange-400 border border-orange-500/20" : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      )}>
                        {profile?.role || "Staff"}
                      </span>
                    </div>
                  </div>

                  <div className="p-3.5 space-y-3 font-sans text-xs">
                    <div className="flex items-center gap-2.5 text-zinc-400">
                      <Mail className="size-3.5 text-orange-400 shrink-0" />
                      <span className="truncate text-zinc-300 font-mono text-[11px]">{profile?.email || userEmail || "No Email"}</span>
                    </div>
                    <div className="flex items-center gap-2.5 text-zinc-400">
                      <Phone className="size-3.5 text-orange-400 shrink-0" />
                      <span className="truncate text-zinc-300 font-mono text-[11px]">{profile?.phone || "No phone number"}</span>
                    </div>
                  </div>

                  <div className="p-2 bg-zinc-950/60 flex flex-col">
                    <button
                      onClick={() => {
                        setShowProfileDropdown(false);
                        handleSignOut();
                      }}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/10 transition-colors font-bold font-mono text-[10px] uppercase cursor-pointer"
                    >
                      <LogOut className="size-3.5" /> Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-full overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  </ConfirmProvider>
  );
}
