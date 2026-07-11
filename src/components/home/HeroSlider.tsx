import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "@tanstack/react-router";
import { ArrowUpRight, ChevronLeft, ChevronRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { heroSlidesQuery } from "@/lib/catalog-queries";
import { getOptimizedImageUrl } from "@/lib/local-images";
import hero1 from "@/assets/hero-1.webp";
import hero2 from "@/assets/hero-2.webp";
import hero3 from "@/assets/hero-3.webp";

const DEFAULT_SLIDES = [
  {
    img: hero1,
    mobileImg: null,
    kicker: "APEX RS1 / CARBON SERIES",
    titleA: "ENGINEERED",
    titleB: "FOR THE APEX",
    sub: "12K carbon composite. FIM-homologated. Built for the riders who don't lift off.",
    cta: { label: "Shop Carbon", to: "/product/apex-rs1-carbon" },
    altCta: { label: "Explore Tech", to: "/about" },
    stat: { num: "1,180g", label: "Shell Weight" },
  },
  {
    img: hero2,
    mobileImg: null,
    kicker: "TRACK SEASON / 2026",
    titleA: "PROTECT",
    titleB: "EVERY EDGE",
    sub: "Track-bred protection certified to the latest ECE 22.06 standard. Made for high-speed reality.",
    cta: { label: "Shop Full-Face", to: "/shop/full-face" },
    altCta: { label: "View Certifications", to: "/about" },
    stat: { num: "22.06", label: "ECE Certified" },
  },
  {
    img: hero3,
    mobileImg: null,
    kicker: "THE FULL LINEUP",
    titleA: "EVERY",
    titleB: "RIDE. EVERY ROAD.",
    sub: "From street circuits to gravel passes. Four categories, one obsession with safety.",
    cta: { label: "Shop All Helmets", to: "/shop" },
    altCta: { label: "Find Your Fit", to: "/contact" },
    stat: { num: "04", label: "Categories" },
  },
];

const DURATION = 6500;

export function HeroSlider() {
  const { data: dbSlides = [] } = useQuery(heroSlidesQuery());
  const activeSlides = dbSlides.filter((s: any) => s.is_active);

  const slides = activeSlides.length > 0
    ? activeSlides.map((s: any) => ({
        img: s.image_url,
        mobileImg: s.mobile_image_url || null,
        kicker: s.kicker || "",
        titleA: s.title_line1 || "",
        titleB: s.title_line2 || "",
        sub: s.subtitle || "",
        cta: s.cta_label ? { label: s.cta_label, to: s.cta_link || "/" } : null,
        altCta: s.alt_cta_label ? { label: s.alt_cta_label, to: s.alt_cta_link || "/" } : null,
        stat: s.stat_number ? { num: s.stat_number, label: s.stat_label || "" } : null,
      }))
    : DEFAULT_SLIDES;

  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);

  // Reset index if slides length changes to prevent out of bounds
  useEffect(() => {
    setI(0);
  }, [slides.length]);

  const next = useCallback(() => setI((v) => (v + 1) % slides.length), [slides.length]);
  const prev = () => setI((v) => (v - 1 + slides.length) % slides.length);

  useEffect(() => {
    if (paused) return;
    const t = setTimeout(next, DURATION);
    return () => clearTimeout(t);
  }, [i, paused, next]);

  const s = slides[i] || slides[0] || DEFAULT_SLIDES[0];

  return (
    <section
      className="relative h-[100svh] min-h-[640px] w-full overflow-hidden bg-background"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Slides */}
      <AnimatePresence mode="sync">
        <motion.div
          key={i}
          initial={{ opacity: 0, scale: 1.08 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.02 }}
          transition={{ duration: 1.2, ease: [0.32, 0.72, 0, 1] }}
          className="absolute inset-0"
        >
          <picture>
            {/* Desktop image — used at lg (1024px) and above */}
            <source media="(min-width: 1024px)" srcSet={getOptimizedImageUrl(s.img, 1600)} />
            {/* Mobile/tablet fallback — used below 1024px, falls back to desktop if no mobile image */}
            <img
              src={getOptimizedImageUrl(s.mobileImg || s.img, 800)}
              alt=""
              className="size-full object-cover"
              loading="eager"
              fetchPriority="high"
            />
          </picture>
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/70 to-background/20" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/40" />
        </motion.div>
      </AnimatePresence>

      {/* Side rail with slide counter */}
      <div className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 z-20 hidden md:flex flex-col items-center gap-6">
        <span className="font-mono text-xs tracking-[0.3em] text-muted-foreground writing-mode-vertical" style={{ writingMode: "vertical-rl" }}>
          SCROLL TO EXPLORE
        </span>
        <div className="w-px h-24 bg-gradient-to-b from-primary to-transparent" />
      </div>

      {/* Content */}
      <div className="relative z-10 h-full flex flex-col justify-center pt-24 md:pt-28 pb-28 md:pb-36">
        <div className="mx-auto max-w-[1600px] w-full pl-4 pr-4 md:pl-8 md:pr-24 lg:pl-8 lg:pr-28 grid lg:grid-cols-12 gap-8 items-end">
          <div className="lg:col-span-8">
            <AnimatePresence mode="wait">
              <motion.div key={i}>
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                  className="inline-flex items-center gap-3 mb-6"
                >
                  <span className="size-2 bg-primary animate-pulse-glow" />
                  <span className="font-mono text-xs tracking-[0.3em] text-primary">{s.kicker}</span>
                </motion.div>

                <h1 className="font-display text-[14vw] sm:text-[10vw] md:text-[8rem] lg:text-[7rem] xl:text-[8.5rem] leading-[0.85] tracking-tight">
                  <motion.span
                    initial={{ y: 60, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
                    className="block"
                  >
                    {s.titleA}
                  </motion.span>
                  <motion.span
                    initial={{ y: 60, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.7, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
                    className="block text-stroke-primary"
                  >
                    {s.titleB}
                  </motion.span>
                </h1>

                <motion.p
                  initial={{ y: 30, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.4 }}
                  className="mt-6 max-w-xl text-base md:text-lg text-muted-foreground leading-relaxed"
                >
                  {s.sub}
                </motion.p>

                {(s.cta || s.altCta) && (
                  <motion.div
                    initial={{ y: 30, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.5 }}
                    className="mt-8 flex flex-wrap gap-3"
                  >
                    {s.cta && (
                      <Link
                        to={s.cta.to}
                        className="group inline-flex items-center gap-3 bg-primary text-primary-foreground pl-6 pr-4 py-4 font-mono text-xs uppercase tracking-[0.2em] font-bold hover:bg-primary-glow transition-colors"
                      >
                        {s.cta.label}
                        <ArrowUpRight className="size-4 transition-transform group-hover:rotate-45" />
                      </Link>
                    )}
                    {s.altCta && (
                      <Link
                        to={s.altCta.to}
                        className="inline-flex items-center gap-3 border border-border pl-6 pr-4 py-4 font-mono text-xs uppercase tracking-[0.2em] hover:border-primary hover:text-primary transition-colors"
                      >
                        {s.altCta.label}
                      </Link>
                    )}
                  </motion.div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Stat card */}
          {s.stat && (
            <div className="lg:col-span-4 hidden lg:flex justify-end">
              <AnimatePresence mode="wait">
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: 40 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                  className="border border-border bg-surface/40 backdrop-blur-md p-6 w-64"
                >
                  <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">SPEC</p>
                  <p className="font-display text-5xl text-primary mt-2">{s.stat.num}</p>
                  <p className="font-mono text-xs uppercase tracking-wider mt-1">{s.stat.label}</p>
                </motion.div>
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Controls + indicators */}
        <div className="absolute bottom-[calc(4.5rem+env(safe-area-inset-bottom))] md:bottom-12 left-0 right-0 mx-auto max-w-[1600px] w-full px-4 md:px-8 flex items-center justify-between gap-6">
          <div className="flex gap-3 flex-1 max-w-md">
            {slides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setI(idx)}
                className="flex-1 relative h-px bg-border overflow-hidden"
                aria-label={`Slide ${idx + 1}`}
              >
                <motion.span
                  className="absolute inset-y-0 left-0 bg-primary"
                  initial={{ width: 0 }}
                  animate={{ width: idx === i ? "100%" : idx < i ? "100%" : "0%" }}
                  transition={{ duration: idx === i && !paused ? DURATION / 1000 : 0.3, ease: "linear" }}
                />
              </button>
            ))}
          </div>

          <div className="flex items-center gap-4">
            <span className="font-mono text-sm text-muted-foreground">
              <span className="text-foreground">{String(i + 1).padStart(2, "0")}</span>
              <span className="mx-2">/</span>
              {String(slides.length).padStart(2, "0")}
            </span>
            <div className="flex gap-1">
              <button onClick={prev} className="size-10 grid place-items-center border border-border hover:border-primary hover:text-primary" aria-label="Previous">
                <ChevronLeft className="size-4" />
              </button>
              <button onClick={next} className="size-10 grid place-items-center border border-border hover:border-primary hover:text-primary" aria-label="Next">
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
