import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate } from "@tanstack/react-router";
import { useDebounce } from "@/hooks/use-debounce";
import { Search, X, ArrowUpRight, Clock, TrendingUp } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useShop } from "@/store/shop";
import { productsQuery, featuredQuery, settingsQuery } from "@/lib/catalog-queries";

const trending = ["Carbon", "Modular", "ECE 22.06", "Adventure", "Bestsellers"];

export function SearchOverlay() {
  const open = useShop((s) => s.searchOpen);
  const origin = useShop((s) => s.searchOrigin);
  const setOpen = useShop((s) => s.setSearchOpen);
  const recent = useShop((s) => s.recentSearches);
  const addRecent = useShop((s) => s.addRecentSearch);
  const clearRecent = useShop((s) => s.clearRecentSearches);

  const { data: products = [] } = useQuery({ ...productsQuery({}), enabled: open });
  const { data: featured = [] } = useQuery({ ...featuredQuery(), enabled: open });
  const { data: settings } = useQuery({ ...settingsQuery(), enabled: open });
  const symbol = settings?.currency_symbol ?? "Rs.";

  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const debouncedQuery = useDebounce(q, 250);

  const results = useMemo(() => {
    const term = debouncedQuery.trim().toLowerCase();
    if (!term) return [];
    return products
      .filter(
        (p) =>
          p.name.toLowerCase().includes(term) ||
          (p.brand?.name ?? "").toLowerCase().includes(term) ||
          (p.category?.name ?? "").toLowerCase().includes(term) ||
          (p.category?.slug ?? "").toLowerCase().includes(term) ||
          p.slug.toLowerCase().includes(term)
      )
      .slice(0, 6);
  }, [debouncedQuery, products]);

  useEffect(() => { setActive(0); }, [debouncedQuery]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
      setQ("");
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(!open);
      }
      if (e.key === "Escape" && open) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  const go = (slug: string) => {
    addRecent(q || slug);
    setOpen(false);
    navigate({ to: "/product/$slug", params: { slug } });
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (results[active]) {
      go(results[active].slug);
    } else if (q.trim()) {
      addRecent(q);
      setOpen(false);
      navigate({ to: "/shop" });
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    }
  };

  const popular = (featured.length ? featured : products).slice(0, 4);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, clipPath: origin ? `circle(0px at ${origin.x}px ${origin.y}px)` : "circle(0% at 50% 0%)" }}
          animate={{ opacity: 1, clipPath: origin ? `circle(150% at ${origin.x}px ${origin.y}px)` : "circle(150% at 50% 0%)" }}
          exit={{ opacity: 0, clipPath: origin ? `circle(0px at ${origin.x}px ${origin.y}px)` : "circle(0% at 50% 0%)" }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-0 z-[60] bg-background/95 backdrop-blur-2xl"
        >
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto max-w-[1100px] px-4 md:px-8 pt-16 md:pt-24 pb-8 h-full overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <span className="size-2 bg-primary animate-pulse-glow" />
                <span className="font-mono text-xs uppercase tracking-[0.3em] text-primary">Search MotoHelm</span>
              </div>
              <button onClick={() => setOpen(false)} className="size-10 grid place-items-center border border-border hover:border-primary hover:text-primary transition-colors" aria-label="Close search">
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={submit} className="relative group">
              <Search className="absolute left-0 top-1/2 -translate-y-1/2 size-6 md:size-7 text-primary" />
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="SEARCH HELMETS, BRANDS, CATEGORIES…"
                className="w-full bg-transparent pl-10 md:pl-12 pr-12 py-5 md:py-6 font-display text-3xl md:text-5xl tracking-tight placeholder:text-muted-foreground/60 focus:outline-none"
              />
              {q && (
                <button type="button" onClick={() => setQ("")} className="absolute right-0 top-1/2 -translate-y-1/2 size-8 grid place-items-center hover:text-primary" aria-label="Clear">
                  <X className="size-4" />
                </button>
              )}
              <div className="absolute -bottom-px left-0 right-0 h-px bg-border overflow-hidden">
                <motion.div className="h-full bg-fire" initial={false} animate={{ width: q ? "100%" : "0%" }} transition={{ duration: 0.4 }} />
              </div>
            </form>


            <div className="mt-8">
              {results.length > 0 ? (
                <ul className="space-y-1">
                  {results.map((p, i) => (
                    <li key={p.id}>
                      <button
                        onMouseEnter={() => setActive(i)}
                        onClick={() => go(p.slug)}
                        className={`w-full flex items-center gap-4 p-3 transition-colors text-left ${
                          active === i ? "bg-surface border-l-2 border-primary" : "border-l-2 border-transparent hover:bg-surface/50"
                        }`}
                      >
                        <div className="size-14 bg-surface-2 shrink-0 overflow-hidden">
                          <img src={p.primary_image} alt="" className="size-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-display text-xl leading-none truncate">{p.name}</p>
                          <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mt-1">
                            {p.brand?.name ?? ""} · {p.category?.name ?? ""}
                          </p>
                        </div>
                        <span className="font-mono text-sm text-primary">{symbol}{p.price}</span>
                        <ArrowUpRight className="size-4 text-muted-foreground" />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="space-y-8">
                  {recent.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                          <Clock className="size-3" /> Recent
                        </span>
                        <button onClick={clearRecent} className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground hover:text-primary">Clear</button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {recent.map((r) => (
                          <button key={r} onClick={() => setQ(r)} className="px-3 py-2 border border-border font-mono text-xs hover:border-primary hover:text-primary transition-colors">{r}</button>
                        ))}
                      </div>
                    </div>
                  )}
                  <div>
                    <span className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-3">
                      <TrendingUp className="size-3" /> Trending
                    </span>
                    <div className="flex flex-wrap gap-2 mt-3">
                      {trending.map((t) => (
                        <button key={t} onClick={() => setQ(t)} className="px-3 py-2 border border-border font-mono text-xs hover:border-primary hover:text-primary transition-colors">{t}</button>
                      ))}
                    </div>
                  </div>
                  {popular.length > 0 && (
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-4">Popular Right Now</p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {popular.map((p) => (
                          <Link key={p.id} to="/product/$slug" params={{ slug: p.slug }} onClick={() => setOpen(false)} className="group block">
                            <div className="aspect-square bg-surface-2 overflow-hidden">
                              <img src={p.primary_image} alt={p.name} className="size-full object-cover transition-transform duration-500 group-hover:scale-105" />
                            </div>
                            <p className="font-mono text-xs mt-2 truncate">{p.name}</p>
                            <p className="font-mono text-[10px] text-primary">{symbol}{p.price}</p>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
