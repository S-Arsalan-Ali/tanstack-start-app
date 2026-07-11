import { createLazyFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowUpRight, Shield, Wind, Zap, Award, Star, CheckCircle2 } from "lucide-react";
import { HeroSlider } from "@/components/home/HeroSlider";
import { BrandSlider } from "@/components/home/BrandSlider";
import { ProductCard } from "@/components/shop/ProductCard";
import { CountUp } from "@/components/shared/CountUp";
import type { CatalogProduct } from "@/types/catalog";
import {
  categoriesQuery,
  featuredQuery,
  newArrivalsQuery,
  productsQuery,
  settingsQuery,
  brandsQuery,
} from "@/lib/catalog-queries";
import { resolveImage, getOptimizedImageUrl } from "@/lib/local-images";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
} from "@/components/ui/carousel";

export const Route = createLazyFileRoute("/")({
  component: Index,
});

function Index() {
  const { data: catsRes, isLoading: catsLoading } = useQuery(categoriesQuery());
  const { data: featuredRes, isLoading: featuredLoading } = useQuery(featuredQuery());
  const { data: newArrivalsRes, isLoading: arrivalsLoading } = useQuery(newArrivalsQuery());
  const { data: allProductsRes, isLoading: productsLoading } = useQuery(productsQuery({}));
  const { data: settings } = useSuspenseQuery(settingsQuery());
  const { data: brands, isLoading: brandsLoading } = useQuery(brandsQuery());

  const cats = catsRes ?? [];
  const featured = featuredRes ?? [];
  const newArrivals = newArrivalsRes ?? [];
  const allProducts = allProductsRes ?? [];

  const symbol = settings?.currency_symbol ?? "Rs.";
  const threshold = settings?.free_shipping_threshold ?? 20000;

  const defaultTicker = [
    settings?.free_shipping_enabled !== false 
      ? `FREE SHIPPING OVER ${symbol}${Number(threshold).toLocaleString()}` 
      : "RACE-BRED. STREET-READY.",
    "ECE 22.06 CERTIFIED",
    "30-DAY RIDE & RETURN",
    "FIM HOMOLOGATED RACE GEAR",
  ];
  const promoTicker =
    settings?.promo_ticker && settings.promo_ticker.length > 0
      ? settings.promo_ticker.map(t => t.replace("Rs.200", `${symbol}${Number(threshold).toLocaleString()}`))
      : defaultTicker;

  const bestsellers = allProducts
    .filter((p) => p.badge?.toUpperCase() === "BESTSELLER" || (p.rating ?? 0) >= 4.8)
    .slice(0, 4);
  if (bestsellers.length === 0 && featured.length > 0) {
    bestsellers.push(...featured.slice(0, 4));
  }

  const showFeatured = newArrivals
    .filter((p) => p.badge?.toUpperCase() === "NEW" || p.featured)
    .slice(0, 4);
  if (showFeatured.length === 0) {
    showFeatured.push(...newArrivals.slice(0, 4));
  }

  const limitedProducts = allProducts
    .filter((p) => p.badge?.toUpperCase() === "LIMITED")
    .slice(0, 4);
  const saleProducts = allProducts
    .filter(
      (p) =>
        p.badge?.toUpperCase() === "SALE" ||
        (p.compare_price !== null && p.compare_price > p.price),
    )
    .slice(0, 4);

  return (
    <>
      <HeroSlider />

      <section className="relative border-y border-border bg-surface overflow-hidden">
        <div className="flex animate-marquee whitespace-nowrap py-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="flex shrink-0">
              {promoTicker.map((t, j) => (
                <span
                  key={`${i}-${j}`}
                  className="font-mono text-xs uppercase tracking-[0.3em] px-12 flex items-center gap-12"
                >
                  {t}
                  <span className="size-1.5 bg-primary rotate-45 inline-block" />
                </span>
              ))}
            </div>
          ))}
        </div>
      </section>

      <BrandSlider brands={brands} isLoading={brandsLoading} />

      <section className="py-12 md:py-20 mx-auto max-w-[1600px] px-4 md:px-8">
        <SectionHeader kicker="The Lineup" title="FIND YOUR" titleAccent="WEAPON." />
        {catsLoading ? (
          <div className="flex gap-4 overflow-hidden mt-12 pb-4">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div key={idx} className="basis-[85%] sm:basis-[48%] lg:basis-1/4 shrink-0 aspect-[3/4] bg-zinc-900 border border-zinc-800 animate-pulse relative overflow-hidden diagonal-cut">
                <div className="absolute inset-0 p-6 flex flex-col justify-end">
                  <div className="h-2 bg-zinc-800 w-1/4 mb-3" />
                  <div className="h-6 bg-zinc-800 w-2/3 mb-2" />
                  <div className="h-4 bg-zinc-800 w-3/4" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Carousel opts={{ align: "start" }} className="w-full mt-12 relative group/carousel">
            <CarouselContent className="-ml-3 md:-ml-4 pb-4">
              {cats.map((c, i) => {
                const sample = allProducts.find((p) => p.category?.slug === c.slug);
                const img = getOptimizedImageUrl(c.image_url ?? sample?.primary_image, 600);
                return (
                  <CarouselItem
                    key={c.slug}
                    className="pl-3 md:pl-4 basis-[85%] sm:basis-[48%] lg:basis-1/4"
                  >
                    <motion.div
                      initial={{ opacity: 0, y: 30 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: i * 0.08 }}
                    >
                      <Link
                        to="/shop/$category"
                        params={{ category: c.slug }}
                        className="group relative block aspect-[3/4] overflow-hidden bg-surface diagonal-cut"
                      >
                        <img
                          src={img}
                          alt={c.name}
                          loading="lazy"
                          className="absolute inset-0 size-full object-cover transition-transform duration-700 group-hover:scale-110"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
                        <div className="absolute inset-0 p-6 flex flex-col justify-end">
                          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-1">
                            0{i + 1} / 0{cats.length}
                          </p>
                          <h3 className="font-display text-3xl md:text-4xl">{c.name}</h3>
                          <p className="text-sm text-muted-foreground mt-1">{c.description}</p>
                          <div className="mt-4 flex items-center gap-2 font-mono text-xs uppercase tracking-[0.2em] text-foreground group-hover:text-primary transition-colors">
                            Shop{" "}
                            <ArrowUpRight className="size-3.5 transition-transform group-hover:rotate-45" />
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                  </CarouselItem>
                );
              })}
            </CarouselContent>
            <CarouselPrevious className="left-2 md:left-4 bg-background/90 md:bg-background/80 hover:bg-primary hover:text-primary-foreground border-border/60 size-8 md:size-10 transition-all duration-300 shadow-lg disabled:!opacity-0 disabled:!pointer-events-none cursor-pointer md:opacity-0 md:group-hover/carousel:opacity-100" />
            <CarouselNext className="right-2 md:right-4 bg-background/90 md:bg-background/80 hover:bg-primary hover:text-primary-foreground border-border/60 size-8 md:size-10 transition-all duration-300 shadow-lg disabled:!opacity-0 disabled:!pointer-events-none cursor-pointer md:opacity-0 md:group-hover/carousel:opacity-100" />
          </Carousel>
        )}
      </section>

      <ProductSection
        kicker="Top of the Grid"
        title="BESTSELLERS"
        products={bestsellers}
        badgeKey="BESTSELLER"
        bg
        isLoading={featuredLoading || productsLoading}
      />

      <section className="py-12 md:py-20 mx-auto max-w-[1600px] px-4 md:px-8">
        <div className="grid md:grid-cols-2 gap-12 items-end mb-16">
          <SectionHeader
            kicker="Engineered for the track"
            title="NUMBERS"
            titleAccent="DON'T LIE."
          />
          <p className="text-muted-foreground max-w-md">
            Every shell is wind-tunnel tested, lab-impacted, and FIM-graded. The data is the
            difference between a podium and a paddock.
          </p>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 border border-border">
          {[
            { num: 1180, suffix: "g", label: "Lightest Shell" },
            { num: 22, suffix: ".06", label: "ECE Standard" },
            { num: 14, suffix: "", label: "Vent Channels" },
            { num: 312, suffix: "k", label: "Riders Worldwide" },
          ].map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className={`p-6 md:p-10 ${i < 2 ? "border-b" : ""} lg:border-b-0 ${i % 2 === 0 ? "border-r" : ""} lg:border-r ${i === 3 ? "lg:border-r-0" : ""} border-border`}
            >
              <p className="font-display text-5xl md:text-7xl text-primary leading-none">
                <CountUp to={s.num} suffix={s.suffix} />
              </p>
              <p className="mt-4 font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
                {s.label}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="py-12 md:py-20 bg-surface/30 border-y border-border">
        <div className="mx-auto max-w-[1600px] px-4 md:px-8">
          <SectionHeader kicker="Inside the shell" title="OBSESSIVELY" titleAccent="ENGINEERED." />
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mt-12">
            {[
              {
                icon: Shield,
                title: "Carbon Composite",
                desc: "12K aerospace-grade weave for max strength at minimum weight.",
              },
              {
                icon: Wind,
                title: "Aero Optimized",
                desc: "Wind-tunnel sculpted with active spoiler to neutralize lift at speed.",
              },
              {
                icon: Zap,
                title: "Quick-Eject EPS",
                desc: "Multi-density liner with emergency cheek-pad release system.",
              },
              {
                icon: Award,
                title: "FIM Approved",
                desc: "Race-homologated for the most demanding circuits on earth.",
              },
            ].map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="border border-border p-6 hover:border-primary transition-colors group"
              >
                <f.icon className="size-8 text-primary mb-6 transition-transform group-hover:scale-110" />
                <h3 className="font-display text-xl mb-2 tracking-wide">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <ProductSection
        kicker="Just landed"
        title="NEW &"
        titleAccent="NOTABLE"
        products={showFeatured}
        badgeKey="NEW"
        isLoading={arrivalsLoading}
      />

      <ProductSection
        kicker="Rare & Exclusive"
        title="LIMITED"
        titleAccent="EDITION"
        products={limitedProducts}
        badgeKey="LIMITED"
        bg
        isLoading={productsLoading}
      />

      <ProductSection
        kicker="Special Offers"
        title="SALE &"
        titleAccent="DISCOUNTS"
        products={saleProducts}
        badgeKey="SALE"
        isLoading={productsLoading}
      />

      <section className="py-12 md:py-20 bg-surface/30 border-y border-border overflow-hidden relative">
        <SectionHeader kicker="From the saddle" title="RIDER" titleAccent="VERDICTS" centered />
        <div className="mt-16 overflow-hidden relative [mask-image:linear-gradient(to_right,transparent,white_15%,white_85%,transparent)]">
          <div className="flex animate-marquee hover:[animation-play-state:paused] whitespace-nowrap gap-6 cursor-pointer py-4">
            {[...testimonials, ...testimonials].map((t, i) => (
              <div
                key={i}
                className="shrink-0 w-[340px] md:w-[420px] border border-border/80 bg-surface/10 hover:bg-surface/20 p-6 md:p-8 whitespace-normal relative transition-all duration-300 hover:scale-[1.01] hover:-translate-y-1 shadow-md group"
              >
                <div className="absolute top-0 right-0 w-0 h-0 border-t-[8px] border-r-[8px] border-t-primary border-r-primary opacity-40 group-hover:opacity-100 transition-opacity" />
                <div className="flex justify-between items-center pb-3 border-b border-border/20 mb-5 font-mono text-[9px] text-muted-foreground tracking-widest uppercase">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-[8px] font-bold border border-emerald-500/20 rounded-none shadow-[0_0_6px_rgba(16,185,129,0.1)]">
                    <CheckCircle2 className="size-2.5 text-emerald-400" /> VERIFIED RIDER
                  </span>
                  <span className="text-primary">
                    SECTOR {String((i % 4) + 1).padStart(2, "0")}
                  </span>
                </div>
                <div className="flex gap-0.5 mb-4">
                  {Array.from({ length: 5 }).map((_, idx) => (
                    <Star
                      key={idx}
                      className="size-3.5 fill-primary text-primary filter drop-shadow-[0_0_2px_rgba(255,87,34,0.4)]"
                    />
                  ))}
                </div>
                <p className="font-display text-xl md:text-2xl leading-snug text-foreground group-hover:text-primary transition-colors duration-300">
                  "{t.quote}"
                </p>
                <div className="mt-8 pt-4 border-t border-border/20 flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  <span className="text-primary font-bold">{t.name}</span>
                  <span className="text-zinc-500">{t.role}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-12 md:py-20 mx-auto max-w-[1600px] px-4 md:px-8">
        <div className="relative overflow-hidden border border-border">
          <div className="absolute inset-0 bg-fire opacity-10" />
          <div className="relative grid lg:grid-cols-2 gap-8 p-8 md:p-16 items-center">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.3em] text-primary mb-4">
                Join the grid
              </p>
              <h2 className="font-display text-4xl md:text-6xl leading-[0.95]">
                FIRST DIBS ON
                <br />
                <span className="text-stroke-primary">LIMITED DROPS.</span>
              </h2>
              <p className="mt-4 text-muted-foreground max-w-md">
                Subscribe for early access to race-edition releases, track-day events, and
                rider-only discounts.
              </p>
            </div>
            <form className="flex flex-col sm:flex-row gap-3" onSubmit={(e) => e.preventDefault()}>
              <input
                type="email"
                placeholder="your@email.com"
                className="flex-1 bg-background border border-border px-4 py-4 font-mono text-sm focus:outline-none focus:border-primary"
              />
              <button className="px-8 py-4 bg-primary text-primary-foreground font-mono text-xs uppercase tracking-[0.2em] font-bold hover:bg-primary-glow transition-colors">
                Subscribe
              </button>
            </form>
          </div>
        </div>
      </section>
    </>
  );
}

function SectionHeader({
  kicker,
  title,
  titleAccent,
  centered,
}: {
  kicker: string;
  title: string;
  titleAccent?: string;
  centered?: boolean;
}) {
  return (
    <div className={centered ? "text-center" : ""}>
      <div className={`inline-flex items-center gap-3 mb-4 ${centered ? "justify-center" : ""}`}>
        <span className="size-2 bg-primary" />
        <span className="font-mono text-xs tracking-[0.3em] text-primary uppercase">{kicker}</span>
      </div>
      <h2 className="font-display text-5xl md:text-7xl lg:text-8xl leading-[0.9] tracking-tight">
        {title}
        {titleAccent && (
          <>
            {" "}
            <span className="text-stroke-primary">{titleAccent}</span>
          </>
        )}
      </h2>
    </div>
  );
}

function ProductSection({
  kicker,
  title,
  titleAccent,
  products,
  badgeKey,
  bg = false,
  isLoading = false,
}: {
  kicker: string;
  title: string;
  titleAccent?: string;
  products: CatalogProduct[];
  badgeKey: "BESTSELLER" | "NEW" | "LIMITED" | "SALE";
  bg?: boolean;
  isLoading?: boolean;
}) {
  if (products.length === 0 && !isLoading) return null;

  return (
    <section className={`py-12 md:py-20 ${bg ? "bg-surface/30 border-y border-border" : ""}`}>
      <div className="mx-auto max-w-[1600px] px-4 md:px-8">
        <div className="flex justify-between items-end gap-6 mb-12">
          <SectionHeader kicker={kicker} title={title} titleAccent={titleAccent} />
          {!isLoading && (
            <Link
              to="/shop"
              search={{ badge: badgeKey }}
              className="font-mono text-xs uppercase tracking-[0.2em] text-primary hidden sm:inline-flex items-center gap-2 group shrink-0"
            >
              View More{" "}
              <ArrowUpRight className="size-3.5 group-hover:rotate-45 transition-transform" />
            </Link>
          )}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div key={idx} className="bg-zinc-900 border border-zinc-800/80 animate-pulse flex flex-col h-full relative overflow-hidden aspect-[3/4] diagonal-cut">
                <div className="aspect-square bg-zinc-800/50 w-full" />
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="h-3 bg-zinc-800 w-1/3 mb-2" />
                    <div className="h-5 bg-zinc-800 w-2/3 mb-1" />
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <div className="h-4 bg-zinc-800 w-1/4" />
                    <div className="h-4 bg-zinc-800 w-1/4 animate-pulse" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className="hidden sm:grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              {products.map((p, i) => (
                <ProductCard key={p.id} product={p} index={i} />
              ))}
            </div>

            <Carousel opts={{ align: "start" }} className="sm:hidden w-full relative">
              <CarouselContent className="-ml-3 pb-4">
                {products.map((p, i) => (
                  <CarouselItem key={p.id} className="pl-3 basis-[85%]">
                    <ProductCard product={p} index={i} />
                  </CarouselItem>
                ))}
                {products.length >= 4 && (
                  <CarouselItem className="pl-3 basis-[85%]">
                    <Link
                      to="/shop"
                      search={{ badge: badgeKey }}
                      className="flex flex-col h-full group"
                    >
                      <div className="aspect-square bg-surface border border-border border-dashed hover:border-primary/50 transition-colors flex flex-col items-center justify-center gap-4 text-center p-6 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-0 h-0 border-t-[8px] border-r-[8px] border-t-primary border-r-primary opacity-40 group-hover:opacity-100 transition-opacity" />
                        <div className="size-12 rounded-full border border-border flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-all duration-300">
                          <ArrowUpRight className="size-5 transition-transform group-hover:rotate-45" />
                        </div>
                        <div>
                          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-1">
                            Explore All
                          </p>
                          <h3 className="font-display text-2xl tracking-wide uppercase text-foreground group-hover:text-primary transition-colors">
                            View More
                          </h3>
                          <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider mt-1">
                            {title} {titleAccent}
                          </p>
                        </div>
                      </div>
                      <div className="md:hidden mt-3 h-[38px] border border-border border-dashed flex items-center justify-center font-mono text-[10px] text-muted-foreground uppercase tracking-widest group-hover:border-primary/40 group-hover:text-primary transition-colors">
                        Go to shop
                      </div>
                      <div className="pt-4 h-14" />
                    </Link>
                  </CarouselItem>
                )}
              </CarouselContent>
              <CarouselPrevious className="left-2 bg-background/90 border-border/60 size-8 shadow-md text-foreground cursor-pointer transition-opacity duration-300 disabled:opacity-0 disabled:pointer-events-none" />
              <CarouselNext className="right-2 bg-background/90 border-border/60 size-8 shadow-md text-foreground cursor-pointer transition-opacity duration-300 disabled:opacity-0 disabled:pointer-events-none" />
            </Carousel>
          </>
        )}
      </div>
    </section>
  );
}

const testimonials = [
  {
    quote: "The lightest lid I've ever worn. Zero fatigue after a full track day.",
    name: "Mia Castellanos",
    role: "Pro Racer, MotoEU",
  },
  {
    quote: "Wind noise is unreal — I can finally hear my comms at 240km/h.",
    name: "Jules Okafor",
    role: "ADV Touring",
  },
  {
    quote: "Fit is dialed. Took it from box to test track in ten minutes.",
    name: "Ren Tanaka",
    role: "Track Day Coach",
  },
  {
    quote: "Looks meaner than it weighs. The Carbon Zero is a statement.",
    name: "Aleks Voronov",
    role: "Time Attack",
  },
];
