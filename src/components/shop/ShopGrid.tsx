import { useMemo, useState, useEffect } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { SlidersHorizontal, X } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { ProductCard } from "@/components/shop/ProductCard";
import { brandsQuery, categoriesQuery, productsQuery, settingsQuery } from "@/lib/catalog-queries";
import type { CatalogProduct } from "@/types/catalog";

type SortKey = "featured" | "price-asc" | "price-desc" | "rating";

const quickFilters = [
  { label: "All Helmets", badge: undefined },
  { label: "Bestsellers", badge: "BESTSELLER" as const },
  { label: "New & Notable", badge: "NEW" as const },
  { label: "Limited Edition", badge: "LIMITED" as const },
  { label: "Special Offers", badge: "SALE" as const },
];

export function ShopGrid({
  initialCategory,
  initialBadge,
  initialSort,
  title,
  kicker,
}: {
  initialCategory?: string;
  initialBadge?: string;
  initialSort?: SortKey;
  title: string;
  kicker: string;
}) {
  const [cat, setCat] = useState<string>(initialCategory ?? "all");
  const [sort, setSort] = useState<SortKey>(initialSort ?? "featured");
  const [maxPrice, setMaxPrice] = useState<number | null>(null);
  const [openMobile, setOpenMobile] = useState(false);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [visibleCount, setVisibleCount] = useState(12);

  const { data: allProducts } = useSuspenseQuery(productsQuery({}));
  const { data: cats } = useSuspenseQuery(categoriesQuery());
  const { data: brandList } = useSuspenseQuery(brandsQuery());
  const { data: settings } = useSuspenseQuery(settingsQuery());
  const symbol = settings?.currency_symbol ?? "Rs.";

  const maxAvailablePrice = useMemo(() => {
    if (!allProducts || allProducts.length === 0) return 1000;
    return Math.ceil(Math.max(...allProducts.map((p) => p.price)));
  }, [allProducts]);

  const currentMaxPrice = maxPrice ?? maxAvailablePrice;

  const brands = useMemo(() => brandList.map((b) => b.name), [brandList]);

  const filtered: CatalogProduct[] = useMemo(() => {
    let r = allProducts.filter((p) => (cat === "all" ? true : p.category?.slug === cat));
    
    // Pre-filter by badge
    if (initialBadge) {
      if (initialBadge === "SALE") {
        r = r.filter((p) => p.badge?.toUpperCase() === "SALE" || (p.compare_price !== null && p.compare_price > p.price));
      } else {
        r = r.filter((p) => p.badge?.toUpperCase() === initialBadge.toUpperCase());
      }
    }

    r = r.filter((p) => p.price <= currentMaxPrice);
    if (selectedBrands.length) r = r.filter((p) => p.brand && selectedBrands.includes(p.brand.name));
    switch (sort) {
      case "price-asc": r = [...r].sort((a, b) => a.price - b.price); break;
      case "price-desc": r = [...r].sort((a, b) => b.price - a.price); break;
      case "rating": r = [...r].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0)); break;
    }
    return r;
  }, [allProducts, cat, sort, currentMaxPrice, selectedBrands, initialBadge]);

  // Reset pagination when filter values or page routing changes
  useEffect(() => {
    setVisibleCount(12);
  }, [cat, sort, maxPrice, selectedBrands, initialBadge]);

  const visibleProducts = useMemo(() => filtered.slice(0, visibleCount), [filtered, visibleCount]);

  const toggleBrand = (b: string) =>
    setSelectedBrands((s) => (s.includes(b) ? s.filter((x) => x !== b) : [...s, b]));

  return (
    <>
      <section className="pt-24 md:pt-28 pb-12 mx-auto max-w-[1600px] px-4 md:px-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="inline-flex items-center gap-3 mb-4">
            <span className="size-2 bg-primary" />
            <span className="font-mono text-xs tracking-[0.3em] text-primary uppercase">{kicker}</span>
          </div>
          <h1 className="font-display text-6xl md:text-8xl lg:text-9xl leading-[0.9] tracking-tight">{title}</h1>
          <p className="mt-4 text-muted-foreground font-mono text-sm">
            <span className="text-foreground">{filtered.length}</span> products in inventory
          </p>
          <div className="flex flex-wrap gap-2.5 mt-6">
            {quickFilters.map((qf) => {
              const active = initialBadge === qf.badge;
              return (
                <Link
                  key={qf.label}
                  to="/shop"
                  search={(prev: any) => ({ ...prev, badge: qf.badge })}
                  className={`px-4 py-2 font-mono text-[10px] sm:text-xs uppercase tracking-wider border transition-all duration-300 ${
                    active
                      ? "bg-primary text-primary-foreground border-primary shadow-[0_0_15px_rgba(239,68,68,0.25)]"
                      : "bg-surface hover:bg-surface/80 border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground/50"
                  }`}
                >
                  {qf.label}
                </Link>
              );
            })}
          </div>
        </motion.div>
      </section>

      <section className="mx-auto max-w-[1600px] px-4 md:px-8 pb-24">
        <div className="grid lg:grid-cols-[260px_1fr] gap-10">
          <aside className="hidden lg:block sticky top-24 self-start space-y-8">
            <FilterBlock title="Category">
              {[{ slug: "all", name: "All" }, ...cats].map((c) => (
                <button
                  key={c.slug}
                  onClick={() => setCat(c.slug)}
                  className={`block w-full text-left py-1.5 font-mono text-sm uppercase tracking-wider ${cat === c.slug ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
                >
                  {c.name}
                </button>
              ))}
            </FilterBlock>

            <FilterBlock title="Brand">
              {brands.map((b) => (
                <label key={b} className="flex items-center gap-3 py-1.5 cursor-pointer">
                  <input type="checkbox" checked={selectedBrands.includes(b)} onChange={() => toggleBrand(b)} className="accent-primary size-4" />
                  <span className="font-mono text-sm">{b}</span>
                </label>
              ))}
            </FilterBlock>

            <FilterBlock title={`Price · ${symbol}0 – ${symbol}${currentMaxPrice}`}>
              <input
                type="range" min={0} max={maxAvailablePrice} step={maxAvailablePrice > 5000 ? 100 : 50}
                value={currentMaxPrice}
                onChange={(e) => setMaxPrice(Number(e.target.value))}
                className="w-full accent-primary"
              />
            </FilterBlock>
          </aside>

          <div>
            <div className="flex items-center justify-between mb-8 pb-4 border-b border-border">
              <button onClick={() => setOpenMobile(true)} className="lg:hidden inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.2em] border border-border px-4 py-2">
                <SlidersHorizontal className="size-4" /> Filters
              </button>
              <p className="hidden lg:block text-sm text-muted-foreground font-mono">Showing {Math.min(visibleCount, filtered.length)} of {filtered.length}</p>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
                className="bg-background border border-border px-3 py-2 font-mono text-xs uppercase tracking-wider"
              >
                <option value="featured">Featured</option>
                <option value="price-asc">Price: Low → High</option>
                <option value="price-desc">Price: High → Low</option>
                <option value="rating">Top Rated</option>
              </select>
            </div>

            {filtered.length === 0 ? (
              <div className="py-24 text-center text-muted-foreground font-mono text-sm">No products match these filters.</div>
            ) : (
              <>
                <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-6 md:gap-8">
                  {visibleProducts.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
                </div>

                {visibleCount < filtered.length && (
                  <div className="mt-12 flex justify-center">
                    <button
                      onClick={() => setVisibleCount((prev) => prev + 12)}
                      className="px-8 py-4 border border-primary text-primary font-mono text-xs uppercase tracking-[0.2em] font-bold hover:bg-primary hover:text-primary-foreground transition-all duration-300 relative group overflow-hidden cursor-pointer"
                    >
                      <div className="absolute top-0 right-0 w-0 h-0 border-t-[6px] border-r-[6px] border-t-primary border-r-primary opacity-40 group-hover:opacity-100 transition-opacity" />
                      Load More Helmets
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </section>

      {openMobile && (
        <div className="fixed inset-0 z-[70] lg:hidden">
          <div className="absolute inset-0 bg-background/80" onClick={() => setOpenMobile(false)} />
          <motion.div
            initial={{ y: "100%" }} animate={{ y: 0 }}
            className="absolute bottom-0 inset-x-0 bg-background border-t border-border max-h-[85vh] overflow-y-auto p-6 pb-24"
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-display text-2xl">FILTERS</h3>
              <button onClick={() => setOpenMobile(false)} className="size-10 grid place-items-center" aria-label="Close">
                <X className="size-5" />
              </button>
            </div>
            <div className="space-y-8">
              <FilterBlock title="Category">
                {[{ slug: "all", name: "All" }, ...cats].map((c) => (
                  <button key={c.slug} onClick={() => setCat(c.slug)} className={`block w-full text-left py-2 font-mono text-sm uppercase tracking-wider ${cat === c.slug ? "text-primary" : "text-muted-foreground"}`}>
                    {c.name}
                  </button>
                ))}
              </FilterBlock>
              <FilterBlock title="Brand">
                {brands.map((b) => (
                  <label key={b} className="flex items-center gap-3 py-1.5">
                    <input type="checkbox" checked={selectedBrands.includes(b)} onChange={() => toggleBrand(b)} className="accent-primary size-4" />
                    <span className="font-mono text-sm">{b}</span>
                  </label>
                ))}
              </FilterBlock>
              <FilterBlock title={`Price · up to ${symbol}${currentMaxPrice}`}>
                <input type="range" min={0} max={maxAvailablePrice} step={maxAvailablePrice > 5000 ? 100 : 50} value={currentMaxPrice} onChange={(e) => setMaxPrice(Number(e.target.value))} className="w-full accent-primary" />
              </FilterBlock>
              <button onClick={() => setOpenMobile(false)} className="w-full py-4 bg-primary text-primary-foreground font-mono text-xs uppercase tracking-[0.2em] font-bold">
                Show {filtered.length} Results
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </>
  );
}

function FilterBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="font-mono text-xs uppercase tracking-[0.2em] text-primary mb-3">{title}</h3>
      <div className="space-y-1">{children}</div>
    </div>
  );
}
