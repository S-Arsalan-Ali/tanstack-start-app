import { createLazyFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState, useMemo, type PointerEvent as ReactPointerEvent } from "react";
import { useSuspenseQuery, useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion, type PanInfo } from "framer-motion";
import { Heart, ShoppingBag, Truck, Shield, RotateCcw, Star, ChevronRight, X, ChevronLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { productBySlugQuery, productsQuery, reviewsQuery, settingsQuery } from "@/lib/catalog-queries";
import { resolveImage, getOptimizedImageUrl } from "@/lib/local-images";
import { ProductCard } from "@/components/shop/ProductCard";
import { ReviewsSection } from "@/components/shop/ReviewsSection";
import { useShop } from "@/store/shop";
import { HelmetSizingModal } from "@/components/shop/HelmetSizingModal";

export const Route = createLazyFileRoute("/product/$slug")({
  component: ProductPage,
});

function ProductPage() {
  const { product: { slug: pSlug } } = Route.useLoaderData();
  const { data: product } = useSuspenseQuery(productBySlugQuery(pSlug));
  const { data: allProducts } = useSuspenseQuery(productsQuery({}));
  const { data: settings } = useQuery(settingsQuery());
  if (!product) return null;

  const symbol = settings?.currency_symbol ?? "Rs.";
  const threshold = settings?.free_shipping_threshold ?? 20000;

  const baseImages = useMemo(() => product.images.length ? product.images.map((i) => resolveImage(i.url)) : [resolveImage(product.primary_image)], [product.images, product.primary_image]);

  const initialColor = product.colors[0]?.name ?? "Default";
  const [color, setColor] = useState(initialColor);

  // Derive sizes available for the currently selected color
  const availableSizes = useMemo(() => {
    const sizeSet = new Set<string>();
    for (const v of product.variants) {
      if (v.color === color && v.size) sizeSet.add(v.size);
    }
    return Array.from(sizeSet);
  }, [product.variants, color]);

  const [size, setSize] = useState(() => availableSizes[0] ?? "M");

  // When color changes, pick the first available size for that color
  useEffect(() => {
    if (availableSizes.length > 0 && !availableSizes.includes(size)) {
      setSize(availableSizes[0]);
    }
  }, [color, availableSizes]);

  const selectedVariant = product.variants.find((v) => v.color === color && v.size === size);

  const images = useMemo(() => {
    if (selectedVariant?.image_url) {
      const vImg = resolveImage(selectedVariant.image_url);
      return [vImg, ...baseImages.filter(url => url !== vImg)];
    }
    return baseImages;
  }, [baseImages, selectedVariant?.image_url]);

  const [activeImg, setActiveImg] = useState(0);

  useEffect(() => {
    if (selectedVariant?.image_url) {
      setActiveImg(0);
    }
  }, [selectedVariant?.image_url]);
  const [lightbox, setLightbox] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [scale, setScale] = useState(1);
  const lastTapRef = useRef(0);
  const pinchRef = useRef<{ id1: number; id2: number; startDist: number; startScale: number } | null>(null);
  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());

  const [qty, setQty] = useState(1);
  const [tab, setTab] = useState<"desc" | "specs" | "ship">("desc");

  const wishlist = useShop((s) => s.wishlist);
  const toggleWishlist = useShop((s) => s.toggleWishlist);
  const addToCart = useShop((s) => s.addToCart);
  const saved = wishlist.includes(product.slug);

  const related = allProducts
    .filter((p) => p.category?.slug === product.category?.slug && p.id !== product.id)
    .slice(0, 4);

  const handleAdd = () => {
    if (!selectedVariant) {
      toast.error("Selected variant option is unavailable");
      return;
    }
    if (selectedVariant.stock <= 0) {
      toast.error("This option is currently out of stock");
      return;
    }
    if (qty > selectedVariant.stock) {
      toast.error(`Only ${selectedVariant.stock} items left in stock`);
      return;
    }

    addToCart({
      id: selectedVariant.id, slug: product.slug, name: product.name,
      price: selectedVariant.price_override != null ? Number(selectedVariant.price_override) : product.price,
      image: images[0], color, size, qty,
    });
    toast.success("Added to cart", { description: `${product.name} · ${color} · ${size}` });
  };

  const handleWishlist = () => {
    const nowSaved = toggleWishlist(product.slug);
    toast[nowSaved ? "success" : "info"](nowSaved ? "Saved to wishlist" : "Removed from wishlist", { description: product.name });
  };

  const goNext = () => { setImgLoaded(false); setScale(1); setActiveImg((activeImg + 1) % images.length); };
  const goPrev = () => { setImgLoaded(false); setScale(1); setActiveImg((activeImg - 1 + images.length) % images.length); };

  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(false);
      else if (e.key === "ArrowRight") goNext();
      else if (e.key === "ArrowLeft") goPrev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lightbox, activeImg]);

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointersRef.current.size === 2) {
      const [a, b] = Array.from(pointersRef.current.entries());
      const dx = a[1].x - b[1].x; const dy = a[1].y - b[1].y;
      pinchRef.current = { id1: a[0], id2: b[0], startDist: Math.hypot(dx, dy), startScale: scale };
    } else if (pointersRef.current.size === 1) {
      const now = Date.now();
      if (now - lastTapRef.current < 300) { setScale((s) => (s > 1 ? 1 : 2.5)); lastTapRef.current = 0; }
      else lastTapRef.current = now;
    }
  };
  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!pointersRef.current.has(e.pointerId)) return;
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const pinch = pinchRef.current;
    if (pinch && pointersRef.current.size >= 2) {
      const p1 = pointersRef.current.get(pinch.id1);
      const p2 = pointersRef.current.get(pinch.id2);
      if (!p1 || !p2) return;
      const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
      setScale(Math.min(4, Math.max(1, pinch.startScale * (dist / pinch.startDist))));
    }
  };
  const onPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    pointersRef.current.delete(e.pointerId);
    if (pointersRef.current.size < 2) pinchRef.current = null;
  };

  return (
    <>
      <div className="pt-16 md:pt-20">
        <div className="mx-auto max-w-[1600px] px-4 md:px-8 pt-3 pb-4 flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-muted-foreground">
          <Link to="/" className="hover:text-foreground">Home</Link>
          <ChevronRight className="size-3" />
          <Link to="/shop" className="hover:text-foreground">Shop</Link>
          {product.category && (
            <>
              <ChevronRight className="size-3" />
              <Link to="/shop/$category" params={{ category: product.category.slug }} className="hover:text-foreground capitalize">{product.category.name}</Link>
            </>
          )}
          <ChevronRight className="size-3" />
          <span className="text-foreground truncate">{product.name}</span>
        </div>

        <section className="mx-auto max-w-[1600px] px-4 md:px-8 grid lg:grid-cols-[1fr_1fr] gap-8 lg:gap-16">
          <div className="lg:sticky lg:top-24 lg:self-start">
            <div className="flex flex-col md:flex-row gap-3 md:gap-4 w-full">
              {images.length > 1 && (
                <div className="order-2 md:order-1 flex md:flex-col gap-2 md:gap-3 overflow-x-auto md:overflow-y-auto scrollbar-hide md:max-h-[600px] w-full md:w-20 snap-x md:snap-y snap-mandatory">
                  {images.map((img, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveImg(i)}
                      className={`size-16 md:size-20 shrink-0 snap-start bg-surface overflow-hidden border-2 transition-colors ${activeImg === i ? "border-primary" : "border-transparent hover:border-border"}`}
                      aria-label={`View image ${i + 1}`}
                    >
                      <img src={getOptimizedImageUrl(img, 200)} alt="" className="size-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
              <motion.button
                type="button"
                onTap={() => { setLightbox(true); setImgLoaded(false); setScale(1); }}
                key={activeImg}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.4}
                onDragEnd={(_, info) => {
                  if (images.length <= 1) return;
                  if (info.offset.x < -50 || info.velocity.x < -200) goNext();
                  else if (info.offset.x > 50 || info.velocity.x > 200) goPrev();
                }}
                className="order-1 md:order-2 aspect-square w-full md:flex-1 bg-surface relative overflow-hidden group block cursor-zoom-in touch-pan-y"
                aria-label="View full image"
              >
                <img src={getOptimizedImageUrl(images[activeImg], 800)} alt={product.name} className="size-full object-cover transition-transform duration-700 group-hover:scale-105" draggable="false" />
                {product.badge && (
                  <span className="absolute top-4 left-4 px-3 py-1.5 bg-primary text-primary-foreground text-xs font-mono font-bold tracking-wider pointer-events-none select-none">
                    {product.badge}
                  </span>
                )}
              </motion.button>
            </div>
          </div>

          <div className="pb-12">
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-primary">
              {product.brand?.name} · {product.category?.name?.replace("-", " ")}
            </p>
            <h1 className="font-display text-5xl md:text-7xl tracking-tight mt-2 leading-[0.95]">{product.name}</h1>

            <div className="flex items-center gap-4 mt-4">
              <div className="flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className={`size-4 ${i < Math.floor(product.rating ?? 0) ? "fill-primary text-primary" : "text-muted-foreground"}`} />
                ))}
              </div>
              <span className="font-mono text-sm text-muted-foreground">{product.rating ?? 0} · {product.reviews_count ?? 0} reviews</span>
            </div>

            <div className="flex items-baseline gap-4 mt-6">
              {(() => {
                const effectivePrice = selectedVariant?.price_override != null
                  ? Number(selectedVariant.price_override)
                  : product.price;
                const showCompare = selectedVariant?.price_override != null
                  ? product.price !== effectivePrice
                  : !!product.compare_price;
                const comparePrice = selectedVariant?.price_override != null
                  ? product.price
                  : product.compare_price;
                return (
                  <>
                    <span className="font-display text-5xl text-primary">{symbol}{effectivePrice.toFixed(0)}</span>
                    {showCompare && comparePrice != null && (
                      <span className="font-mono text-muted-foreground line-through">{symbol}{Number(comparePrice).toFixed(0)}</span>
                    )}
                  </>
                );
              })()}
            </div>

            <p className="mt-6 text-muted-foreground leading-relaxed">{product.description}</p>

            {product.certifications && product.certifications.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-6">
                {product.certifications.map((c) => (
                  <span key={c} className="px-3 py-1.5 border border-border font-mono text-[10px] uppercase tracking-wider">{c}</span>
                ))}
              </div>
            )}

            {product.colors.length > 0 && (
              <div className="mt-8">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-mono text-xs uppercase tracking-[0.2em]">Colorway</h3>
                  <span className="text-sm text-muted-foreground">{color}</span>
                </div>
                <div className="flex gap-3">
                  {product.colors.map((c) => (
                    <button
                      key={c.name}
                      onClick={() => setColor(c.name)}
                      className={`group flex items-center gap-2 p-1 border ${color === c.name ? "border-primary" : "border-border"}`}
                      aria-label={c.name}
                    >
                      <span className="size-10 rounded-none" style={{ background: c.hex }} />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {availableSizes.length > 0 && (
              <div className="mt-8">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-mono text-xs uppercase tracking-[0.2em]">Size</h3>
                  <HelmetSizingModal>
                    <button className="font-mono text-xs underline text-muted-foreground hover:text-primary transition-colors cursor-pointer">
                      Sizing Guide
                    </button>
                  </HelmetSizingModal>
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {availableSizes.map((s) => {
                    const variant = product.variants.find((v) => v.color === color && v.size === s);
                    const outOfStock = variant ? variant.stock <= 0 : true;
                    return (
                      <button
                        key={s}
                        onClick={() => setSize(s)}
                        disabled={outOfStock}
                        className={`py-3 border font-mono text-sm font-bold transition-colors ${
                          size === s
                            ? "border-primary bg-primary text-primary-foreground"
                            : outOfStock
                              ? "border-border text-muted-foreground/40 line-through cursor-not-allowed"
                              : "border-border hover:border-foreground"
                        }`}
                      >
                        {s}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <div className="flex items-center justify-between sm:justify-start border border-border w-full sm:w-auto">
                <button onClick={() => setQty(Math.max(1, qty - 1))} className="size-12 grid place-items-center hover:bg-surface cursor-pointer" aria-label="Decrease">−</button>
                <span className="w-12 text-center font-mono">{qty}</span>
                <button onClick={() => setQty(qty + 1)} className="size-12 grid place-items-center hover:bg-surface cursor-pointer" aria-label="Increase">+</button>
              </div>
              <div className="flex flex-1 gap-3 w-full">
                <button
                  onClick={handleAdd}
                  disabled={!selectedVariant || selectedVariant.stock <= 0}
                  className="flex-1 bg-primary text-primary-foreground py-4 font-mono text-xs uppercase tracking-[0.2em] font-bold hover:bg-primary-glow transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  <ShoppingBag className="size-4 shrink-0" />
                  <span className="truncate">
                    {!selectedVariant ? "Unavailable"
                     : selectedVariant.stock <= 0 ? "Out of Stock"
                     : `Add to Cart · ${symbol}${((selectedVariant.price_override != null ? Number(selectedVariant.price_override) : product.price) * qty).toFixed(0)}`}
                  </span>
                </button>
                <button
                  onClick={handleWishlist}
                  className={`size-14 shrink-0 border grid place-items-center transition-colors cursor-pointer ${saved ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-foreground"}`}
                  aria-label="Wishlist"
                >
                  <Heart className={`size-5 ${saved ? "fill-current" : ""}`} />
                </button>
              </div>
            </div>

            <div className="mt-8 grid grid-cols-3 gap-4 pt-8 border-t border-border">
              {[
                settings?.free_shipping_enabled !== false
                  ? { icon: Truck, label: `Free shipping over ${symbol}${Number(threshold).toLocaleString()}` }
                  : { icon: Truck, label: "Flat rate shipping" },
                { icon: RotateCcw, label: "30-day returns" },
                { icon: Shield, label: "2-year warranty" },
              ].map((p, i) => (
                <div key={i} className="text-center">
                  <p.icon className="size-5 mx-auto text-primary mb-2" />
                  <p className="text-[10px] md:text-xs text-muted-foreground font-mono uppercase tracking-wider">{p.label}</p>
                </div>
              ))}
            </div>

            <div className="mt-12">
              <div className="flex gap-6 border-b border-border overflow-x-auto scrollbar-hide">
                {[
                  { id: "desc", label: "Overview" },
                  { id: "specs", label: "Specs" },
                  { id: "ship", label: "Shipping" },
                  { id: "reviews", label: `Reviews` },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      if (t.id === "reviews") {
                        document.getElementById("reviews")?.scrollIntoView({ behavior: "smooth", block: "start" });
                      } else {
                        setTab(t.id as typeof tab);
                      }
                    }}
                    className={`py-4 font-mono text-xs uppercase tracking-[0.2em] border-b-2 -mb-px transition-colors whitespace-nowrap ${tab === t.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <div className="py-6 text-sm text-muted-foreground leading-relaxed">
                {tab === "desc" && <p>{product.description}</p>}
                {tab === "specs" && product.specs && (
                  <dl className="grid sm:grid-cols-2 gap-x-8 gap-y-3">
                    {product.specs.map((s) => (
                      <div key={s.label} className="flex justify-between py-2 border-b border-border">
                        <dt className="font-mono text-xs uppercase tracking-wider text-muted-foreground">{s.label}</dt>
                        <dd className="font-mono text-sm text-foreground">{s.value}</dd>
                      </div>
                    ))}
                  </dl>
                )}
                {tab === "ship" && (
                  <p>
                    {settings?.free_shipping_enabled !== false
                      ? `Free ground shipping on orders over ${symbol}${Number(threshold).toLocaleString()}. `
                      : `Flat rate shipping of ${symbol}${settings?.shipping_flat ?? 150} on all orders. `}
                    Express 2-day available at checkout. International shipping to 40+ countries. All helmets are inspected and packed in protective shipping cases.
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>

        <div className="lg:hidden h-24" aria-hidden />
        <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-background/95 backdrop-blur-xl border-t border-border px-3 py-2.5 flex items-center gap-2 pb-[max(0.625rem,env(safe-area-inset-bottom))]">
          <button
            onClick={handleWishlist}
            className={`size-12 shrink-0 grid place-items-center border ${saved ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}
            aria-label="Wishlist"
          >
            <Heart className={`size-4 ${saved ? "fill-current" : ""}`} />
          </button>
          <button
            onClick={handleAdd}
            disabled={!selectedVariant || selectedVariant.stock <= 0}
            className="flex-1 h-12 bg-primary text-primary-foreground font-mono text-[10px] sm:text-xs uppercase tracking-wider sm:tracking-[0.18em] font-bold flex items-center justify-center gap-1.5 sm:gap-2 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap px-1"
          >
            <ShoppingBag className="size-3.5 shrink-0" />
            {!selectedVariant ? "Unavailable"
             : selectedVariant.stock <= 0 ? "Out of Stock"
             : `Add to Cart · ${symbol}${((selectedVariant.price_override != null ? Number(selectedVariant.price_override) : product.price) * qty).toFixed(0)}`}
          </button>
        </div>

        <ReviewsSection slug={product.slug} productId={product.id} />

        {related.length > 0 && (
          <section className="mt-24 py-20 bg-surface/30 border-t border-border">
            <div className="mx-auto max-w-[1600px] px-4 md:px-8">
              <div className="flex items-center gap-3 mb-2">
                <span className="size-2 bg-primary" />
                <span className="font-mono text-xs tracking-[0.3em] text-primary uppercase">More from the lineup</span>
              </div>
              <h2 className="font-display text-4xl md:text-6xl tracking-tight mb-12">YOU MIGHT ALSO LIKE</h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
                {related.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
              </div>
            </div>
          </section>
        )}
      </div>

      <AnimatePresence>
        {lightbox && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-xl flex items-center justify-center overflow-hidden"
            onClick={() => setLightbox(false)}
          >
            <button
              onClick={(e) => { e.stopPropagation(); setLightbox(false); }}
              className="absolute top-4 right-4 size-12 grid place-items-center border border-border bg-background/80 hover:bg-surface z-20"
              aria-label="Close"
            >
              <X className="size-5" />
            </button>
            {images.length > 1 && (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); goPrev(); }}
                  className="absolute left-4 top-1/2 -translate-y-1/2 size-12 grid place-items-center border border-border bg-background/80 hover:bg-surface z-20"
                  aria-label="Previous"
                >
                  <ChevronLeft className="size-5" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); goNext(); }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 size-12 grid place-items-center border border-border bg-background/80 hover:bg-surface z-20"
                  aria-label="Next"
                >
                  <ChevronRight className="size-5" />
                </button>
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 px-3 py-1.5 bg-background/80 border border-border font-mono text-xs">
                  {activeImg + 1} / {images.length}
                </div>
              </>
            )}

            {!imgLoaded && (
              <div className="absolute inset-0 grid place-items-center z-10 pointer-events-none">
                <Loader2 className="size-10 animate-spin text-primary" />
              </div>
            )}

            <motion.div
              key={activeImg}
              className="relative touch-none select-none"
              drag={scale === 1 ? "x" : true}
              dragConstraints={scale === 1 ? { left: 0, right: 0 } : undefined}
              dragElastic={scale === 1 ? 0.4 : 0.1}
              onDragEnd={(_, info: PanInfo) => {
                if (scale !== 1) return;
                if (info.offset.x < -80 || info.velocity.x < -400) goNext();
                else if (info.offset.x > 80 || info.velocity.x > 400) goPrev();
              }}
              onClick={(e) => e.stopPropagation()}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
            >
              <motion.img
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: imgLoaded ? 1 : 0, scale }}
                transition={{ scale: { type: "spring", stiffness: 200, damping: 25 } }}
                src={getOptimizedImageUrl(images[activeImg], 1600)}
                alt={product.name}
                draggable={false}
                onLoad={() => setImgLoaded(true)}
                className="max-w-[95vw] max-h-[90vh] object-contain"
                style={{ touchAction: "none" }}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
