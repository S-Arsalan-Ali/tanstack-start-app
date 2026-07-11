import { Link, useLocation } from "@tanstack/react-router";
import { Home, Search, Heart, ShoppingBag, Store } from "lucide-react";
import { motion, useMotionValueEvent, useScroll, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { useShop } from "@/store/shop";

export function MobileNav() {
  const loc = useLocation();
  const cart = useShop((s) => s.cart);
  const wishlist = useShop((s) => s.wishlist);
  const cartCount = cart.reduce((a, c) => a + c.qty, 0);
  const setSearchOpen = useShop((s) => s.setSearchOpen);
  const setCartOpen = useShop((s) => s.setCartOpen);
  const setWishlistOpen = useShop((s) => s.setWishlistOpen);

  const [hidden, setHidden] = useState(false);
  const { scrollY } = useScroll();
  useMotionValueEvent(scrollY, "change", (latest) => {
    const prev = scrollY.getPrevious() ?? 0;
    if (latest > prev && latest > 120) setHidden(true);
    else setHidden(false);
  });

  const tabs = [
    { id: "home", label: "Home", icon: Home, to: "/" as const, active: loc.pathname === "/" },
    { id: "shop", label: "Shop", icon: Store, to: "/shop" as const, active: loc.pathname.startsWith("/shop") },
    { id: "search", label: "Search", icon: Search, onClick: (e?: React.MouseEvent<HTMLButtonElement>) => {
      const el = e?.currentTarget;
      if (el) {
        const r = el.getBoundingClientRect();
        setSearchOpen(true, { x: r.left + r.width / 2, y: r.top + r.height / 2 });
      } else {
        setSearchOpen(true, null);
      }
    }, active: false },
    {
      id: "saved",
      label: "Saved",
      icon: Heart,
      onClick: () => setWishlistOpen(true),
      active: false,
      badge: wishlist.length,
    },
    {
      id: "cart",
      label: "Cart",
      icon: ShoppingBag,
      onClick: () => setCartOpen(true),
      active: false,
      badge: cartCount,
    },
  ];

  return (
    <motion.nav
      initial={{ y: 100 }}
      animate={{ y: hidden ? 100 : 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-background/95 backdrop-blur-xl border-t border-border pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="grid grid-cols-5 h-14">
        {tabs.map((t) => {
          const Icon = t.icon;
          const inner = (
            <div className="relative h-full w-full flex flex-col items-center justify-center gap-0.5 active:scale-95 transition-transform">
              {t.active && (
                <motion.span
                  layoutId="mobilenav-indicator"
                  className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-8 bg-primary"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <div className="relative">
                <Icon className={`size-5 ${t.active ? "text-primary" : "text-muted-foreground"}`} />
                <AnimatePresence>
                  {!!t.badge && t.badge > 0 && (
                    <motion.span
                      key={t.badge}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 grid place-items-center bg-primary text-primary-foreground text-[9px] font-mono font-bold rounded-full"
                    >
                      {t.badge}
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
              <span
                className={`text-[10px] font-mono uppercase tracking-wider ${
                  t.active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                {t.label}
              </span>
            </div>
          );
          return (
            <li key={t.id}>
              {t.to ? (
                <Link to={t.to} className="block h-full w-full" aria-label={t.label}>
                  {inner}
                </Link>
              ) : (
                <button onClick={t.onClick} className="block h-full w-full" aria-label={t.label}>
                  {inner}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </motion.nav>
  );
}
