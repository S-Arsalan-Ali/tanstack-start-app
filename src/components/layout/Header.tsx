import { Link, useLocation } from "@tanstack/react-router";
import { useEffect, useMemo, useState, useRef } from "react";
import { Menu, X, Search, Heart, ShoppingBag, User, ChevronDown, Bell } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useShop } from "@/store/shop";
import { motion, AnimatePresence } from "framer-motion";
import { categoriesQuery, featuredQuery, userOrdersQuery, settingsQuery } from "@/lib/catalog-queries";
import { toast } from "sonner";
import { Logo } from "@/components/layout/Logo";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";

type NavLink = { to: string; label: string; hasMenu?: boolean; matchPrefix?: string };

const navLinks: NavLink[] = [
  { to: "/", label: "Home" },
  { to: "/shop", label: "Helmets", hasMenu: true, matchPrefix: "/shop" },
  { to: "/shop/parts", label: "Parts" },
  { to: "/shop/bike-mounting", label: "Bike Mounting" },
  { to: "/shop/accessories", label: "Accessories" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
];

const HELMET_SLUGS = new Set(["full-face", "modular", "off-road", "urban"]);

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [helmetsOpen, setHelmetsOpen] = useState(false);
  const [mobileHelmets, setMobileHelmets] = useState(false);
  const cart = useShop((s) => s.cart);
  const wishlist = useShop((s) => s.wishlist);
  const isAuthed = useShop((s) => s.isAuthed);
  const profile = useShop((s) => s.profile);
  const setCartOpen = useShop((s) => s.setCartOpen);
  const setWishlistOpen = useShop((s) => s.setWishlistOpen);
  const setSearchOpen = useShop((s) => s.setSearchOpen);
  const signOut = useShop((s) => s.signOut);
  const loc = useLocation();

  const menuRef = useRef<HTMLDivElement>(null);
  const [showScrollArrow, setShowScrollArrow] = useState(false);

  // Check if mobile menu is scrollable and show scroll-down indicator if needed
  useEffect(() => {
    if (!open) {
      setShowScrollArrow(false);
      return;
    }

    const checkScrollable = () => {
      if (!menuRef.current) return;
      const { scrollTop, scrollHeight, clientHeight } = menuRef.current;
      // Show arrow if there's more than 15px scrollable content below the viewport
      const canScrollMore = scrollHeight - clientHeight - scrollTop > 15;
      setShowScrollArrow(canScrollMore);
    };

    // Run check initially
    checkScrollable();

    // A small timeout is needed to wait for layout/render updates (like initial slide animation)
    const timer = setTimeout(checkScrollable, 100);

    const container = menuRef.current;
    if (container) {
      container.addEventListener("scroll", checkScrollable, { passive: true });
    }
    window.addEventListener("resize", checkScrollable, { passive: true });

    return () => {
      if (container) {
        container.removeEventListener("scroll", checkScrollable);
      }
      window.removeEventListener("resize", checkScrollable);
      clearTimeout(timer);
    };
  }, [open, mobileHelmets]);

  const handleScrollDown = () => {
    if (menuRef.current) {
      menuRef.current.scrollTo({
        top: menuRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  };

  const { data: orders = [] } = useQuery(userOrdersQuery());
  const queryClient = useQueryClient();
  const { data: settingsData, isLoading } = useQuery(settingsQuery());
  const settings = settingsData || queryClient.getQueryData<any>(settingsQuery().queryKey);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  useEffect(() => {
    if (!isAuthed) {
      setUnreadNotifications(0);
      return;
    }
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
    setUnreadNotifications(count);
  }, [orders, isAuthed, loc.pathname]);

  const { data: allCategories = [] } = useQuery(categoriesQuery());
  const { data: featured = [] } = useQuery(featuredQuery());

  const helmetCategories = useMemo(
    () => allCategories.filter((c) => HELMET_SLUGS.has(c.slug)),
    [allCategories]
  );
  const featuredHelmet = featured[0];

  const cartCount = cart.reduce((a, c) => a + c.qty, 0);
  const isHome = loc.pathname === "/";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setOpen(false);
    setMobileHelmets(false);
    setHelmetsOpen(false);
  }, [loc.pathname]);

  const solid = scrolled || !isHome || open;

  const isActive = (link: NavLink) => {
    if (link.to === "/") return loc.pathname === "/";
    if (link.hasMenu && link.matchPrefix) {
      if (loc.pathname === "/shop") return true;
      const m = loc.pathname.match(/^\/shop\/([^/]+)/);
      return !!m && HELMET_SLUGS.has(m[1]);
    }
    return loc.pathname === link.to || loc.pathname.startsWith(link.to + "/");
  };

  return (
    <>
      <header
        className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
          solid ? "bg-background/90 backdrop-blur-xl border-b border-border" : "bg-gradient-to-b from-background/60 to-transparent"
        }`}
      >
        <div className="mx-auto max-w-[1600px] px-4 md:px-8 h-16 md:h-20 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2.5 group">
            {isLoading && !settings ? (
              <div className="h-8 w-24 bg-zinc-800/40 animate-pulse rounded" />
            ) : settings?.logo_url ? (
              <img
                src={settings.logo_url}
                alt={settings.store_name || "Logo"}
                className="h-8 md:h-9 w-auto object-contain transition-transform group-hover:scale-105"
              />
            ) : (
              <Logo className="h-6 md:h-7 w-auto text-foreground transition-transform group-hover:scale-105" />
            )}
            {settings?.store_name && (
              <span className="font-display text-xl md:text-2xl tracking-wide text-primary">
                {settings.store_name}
              </span>
            )}
          </Link>

          <nav className="hidden lg:flex items-center gap-7">
            {navLinks.map((l) => {
              const active = isActive(l);
              if (l.hasMenu) {
                return (
                  <div key={l.to} className="relative" onMouseEnter={() => setHelmetsOpen(true)} onMouseLeave={() => setHelmetsOpen(false)}>
                    <Link
                      to={l.to}
                      className={`flex items-center gap-1 text-xs uppercase tracking-[0.2em] font-semibold transition-colors relative group ${
                        active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {l.label}
                      <ChevronDown className="size-3" />
                      <span className={`absolute -bottom-2 left-0 h-px bg-primary transition-all duration-300 ${active ? "w-full" : "w-0 group-hover:w-full"}`} />
                    </Link>
                    <AnimatePresence>
                      {helmetsOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 8 }}
                          transition={{ duration: 0.18 }}
                          className="absolute left-1/2 -translate-x-1/2 top-full pt-4"
                        >
                          <div className="bg-background border border-border shadow-fire p-5 w-[520px] grid grid-cols-[1fr_180px] gap-5">
                            <ul className="space-y-1">
                              {helmetCategories.map((c) => (
                                <li key={c.slug}>
                                  <Link
                                    to="/shop/$category"
                                    params={{ category: c.slug }}
                                    className="group flex items-center justify-between px-3 py-3 border-l-2 border-transparent hover:border-primary hover:bg-surface/60 transition-all"
                                  >
                                    <div>
                                      <p className="font-display text-lg leading-none">{c.name}</p>
                                      {c.description && (
                                        <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mt-1.5">{c.description}</p>
                                      )}
                                    </div>
                                    <ChevronDown className="size-4 -rotate-90 text-muted-foreground group-hover:text-primary" />
                                  </Link>
                                </li>
                              ))}
                              <li className="pt-2 border-t border-border mt-2">
                                <Link to="/shop" className="block px-3 py-2 font-mono text-[11px] uppercase tracking-[0.2em] text-primary hover:text-primary-glow">
                                  View All Helmets →
                                </Link>
                              </li>
                            </ul>
                            {featuredHelmet && (
                              <Link to="/product/$slug" params={{ slug: featuredHelmet.slug }} className="group block bg-surface/40 p-3">
                                <div className="aspect-square bg-surface overflow-hidden mb-3">
                                  <img src={featuredHelmet.primary_image} alt={featuredHelmet.name} className="size-full object-cover transition-transform duration-500 group-hover:scale-105" />
                                </div>
                                <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-primary">Featured</p>
                                <p className="font-display text-sm leading-tight mt-1">{featuredHelmet.name}</p>
                                <p className="font-mono text-xs mt-1">${featuredHelmet.price}</p>
                              </Link>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              }
              return (
                <Link
                  key={l.to}
                  to={l.to}
                  className={`text-xs uppercase tracking-[0.2em] font-semibold transition-colors relative group ${
                    active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {l.label}
                  <span className={`absolute -bottom-2 left-0 h-px bg-primary transition-all duration-300 ${active ? "w-full" : "w-0 group-hover:w-full"}`} />
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-1 md:gap-2">
            <TooltipProvider delayDuration={150}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button onClick={() => setSearchOpen(true)} className="hidden md:grid place-items-center size-10 hover:bg-surface transition-colors cursor-pointer" aria-label="Search">
                    <Search className="size-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="bg-zinc-950 border border-primary/30 text-primary font-mono text-[9px] uppercase tracking-[0.15em] px-2.5 py-1.5 rounded-none shadow-[0_4px_12px_rgba(0,0,0,0.6)]">
                  Launch Search
                </TooltipContent>
              </Tooltip>

              {isAuthed && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link
                      to="/account"
                      search={{ tab: "notifications" }}
                      className="grid place-items-center size-10 hover:bg-surface transition-colors relative cursor-pointer"
                      aria-label="Notifications"
                    >
                      <Bell className="size-4" />
                      {unreadNotifications > 0 && (
                        <span className="absolute top-1 right-1 size-4 grid place-items-center bg-primary text-primary-foreground text-[10px] font-mono font-bold animate-pulse-glow">
                          {unreadNotifications}
                        </span>
                      )}
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent className="bg-zinc-950 border border-primary/30 text-primary font-mono text-[9px] uppercase tracking-[0.15em] px-2.5 py-1.5 rounded-none shadow-[0_4px_12px_rgba(0,0,0,0.6)]">
                    Pit Alerts
                  </TooltipContent>
                </Tooltip>
              )}

              <Tooltip>
                <TooltipTrigger asChild>
                  <button onClick={() => setWishlistOpen(true)} className="hidden md:grid place-items-center size-10 hover:bg-surface transition-colors relative cursor-pointer" aria-label="Wishlist">
                    <Heart className="size-4" />
                    {wishlist.length > 0 && (
                      <span className="absolute top-1 right-1 size-4 grid place-items-center bg-primary text-primary-foreground text-[10px] font-mono font-bold">
                        {wishlist.length}
                      </span>
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent className="bg-zinc-950 border border-primary/30 text-primary font-mono text-[9px] uppercase tracking-[0.15em] px-2.5 py-1.5 rounded-none shadow-[0_4px_12px_rgba(0,0,0,0.6)]">
                  Saved Gear
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <button onClick={() => setCartOpen(true)} className="grid place-items-center size-10 hover:bg-surface transition-colors relative cursor-pointer" aria-label="Open cart">
                    <ShoppingBag className="size-4" />
                    {cartCount > 0 && (
                      <span className="absolute top-1 right-1 size-4 grid place-items-center bg-primary text-primary-foreground text-[10px] font-mono font-bold animate-pulse-glow">
                        {cartCount}
                      </span>
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent className="bg-zinc-950 border border-primary/30 text-primary font-mono text-[9px] uppercase tracking-[0.15em] px-2.5 py-1.5 rounded-none shadow-[0_4px_12px_rgba(0,0,0,0.6)]">
                  Shopping Bag
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Link to="/account" className="hidden md:grid place-items-center size-12 hover:bg-surface transition-colors cursor-pointer" aria-label="Account">
                    {isAuthed && profile?.name ? (
                      <div className="size-8 rounded-full bg-primary text-primary-foreground font-mono text-sm font-bold grid place-items-center uppercase">
                        {profile.name.charAt(0)}
                      </div>
                    ) : (
                      <User className="size-5" />
                    )}
                  </Link>
                </TooltipTrigger>
                <TooltipContent className="bg-zinc-950 border border-primary/30 text-primary font-mono text-[9px] uppercase tracking-[0.15em] px-2.5 py-1.5 rounded-none shadow-[0_4px_12px_rgba(0,0,0,0.6)]">
                  {isAuthed ? "Rider Garage" : "Garage Access"}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <button onClick={() => setOpen(!open)} className="lg:hidden grid place-items-center size-10 hover:bg-surface cursor-pointer" aria-label="Menu">
              {open ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[49] bg-background lg:hidden pt-20 flex flex-col"
          >
            <div
              ref={menuRef}
              className="flex-1 overflow-y-auto scrollbar-hide"
            >
              <nav className="flex flex-col px-6 pt-6 pb-16 gap-1">
                {/* Profile / Auth Section at the Top */}
                <div className="mb-6">
                  {isAuthed ? (
                    <div className="flex items-center gap-4 p-4 bg-surface/30 border border-border">
                      <div className="size-12 rounded-full bg-primary text-primary-foreground font-mono text-lg font-bold grid place-items-center uppercase shadow-fire">
                        {profile?.name ? profile.name.charAt(0) : "R"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-display text-lg truncate leading-tight">{profile?.name ?? "Rider"}</p>
                        <p className="font-mono text-[10px] text-muted-foreground truncate">{profile?.email ?? ""}</p>
                        <div className="flex items-center gap-4 mt-2">
                          <Link
                            to="/account"
                            onClick={() => setOpen(false)}
                            className="font-mono text-xs uppercase tracking-wider text-primary hover:text-primary-glow font-bold transition-colors"
                          >
                            My Account
                          </Link>
                          <span className="text-muted-foreground/30 font-mono text-xs select-none">|</span>
                          <button
                            onClick={() => {
                              signOut();
                              toast.success("Signed out successfully");
                              setOpen(false);
                            }}
                            className="font-mono text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground font-bold transition-colors cursor-pointer"
                          >
                            Sign Out
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-4 p-4 bg-surface/30 border border-border">
                      <div className="size-12 rounded-full border border-border flex items-center justify-center text-muted-foreground bg-background">
                        <User className="size-6" />
                      </div>
                      <div className="flex-1">
                        <p className="font-display text-lg leading-tight">Welcome, Rider</p>
                        <p className="font-mono text-[10px] text-muted-foreground mt-0.5">Sign in to manage orders & rewards</p>
                        <div className="mt-2.5">
                          <Link
                            to="/login"
                            onClick={() => setOpen(false)}
                            className="inline-flex items-center justify-center px-4 py-2 bg-primary text-primary-foreground font-mono text-[10px] font-bold uppercase tracking-wider hover:bg-primary-glow transition-colors"
                          >
                            Sign In / Sign Up
                          </Link>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {[
                  ...navLinks.slice(0, 5),
                  { to: "/blog", label: "Journal" },
                  ...navLinks.slice(5)
                ].map((l, i) => {
                  const active = isActive(l);
                  if (l.hasMenu) {
                    return (
                      <motion.div key={l.to} initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: i * 0.04 }}>
                        <button
                          onClick={() => setMobileHelmets((x) => !x)}
                          className={`w-full py-4 border-b border-border font-display text-3xl tracking-wide flex items-center justify-between ${active ? "text-primary" : ""}`}
                        >
                          {l.label}
                          <ChevronDown className={`size-5 transition-transform ${mobileHelmets ? "rotate-180" : ""}`} />
                        </button>
                        <AnimatePresence>
                          {mobileHelmets && (
                            <motion.ul initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                              {helmetCategories.map((c) => (
                                <li key={c.slug}>
                                  <Link to="/shop/$category" params={{ category: c.slug }} className="block pl-4 py-3 border-b border-border/50 font-mono text-sm uppercase tracking-wider text-muted-foreground hover:text-primary">
                                    → {c.name}
                                  </Link>
                                </li>
                              ))}
                              <li>
                                <Link to="/shop" className="block pl-4 py-3 border-b border-border/50 font-mono text-sm uppercase tracking-wider text-primary">→ All Helmets</Link>
                              </li>
                            </motion.ul>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    );
                  }
                  return (
                    <motion.div key={l.to} initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: i * 0.04 }}>
                      <Link to={l.to} className={`block py-4 border-b border-border font-display text-3xl tracking-wide hover:text-primary transition-colors ${active ? "text-primary" : ""}`}>
                        {l.label}
                      </Link>
                    </motion.div>
                  );
                })}
              </nav>
            </div>

            {/* Bottom Gradient Fade */}
            <AnimatePresence>
              {showScrollArrow && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="pointer-events-none absolute bottom-0 inset-x-0 h-32 bg-gradient-to-t from-background via-background/70 to-transparent z-10"
                />
              )}
            </AnimatePresence>

            {/* Bouncing Floating Arrow indicator */}
            <AnimatePresence>
              {showScrollArrow && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  onClick={handleScrollDown}
                  className="fixed bottom-8 right-6 z-20 cursor-pointer flex flex-col items-center gap-1.5 group"
                >
                  <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-primary/80 group-hover:text-primary transition-colors select-none font-bold">
                    MORE
                  </span>
                  <motion.div
                    animate={{ y: [0, 5, 0] }}
                    transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut" }}
                    className="size-8 rounded-full border border-primary/20 bg-background/90 backdrop-blur-md flex items-center justify-center text-primary shadow-[0_4px_20px_rgba(235,94,40,0.15)] group-hover:border-primary/50 group-hover:text-primary-glow transition-all"
                  >
                    <ChevronDown className="size-4" />
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
