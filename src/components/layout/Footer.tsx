import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Instagram, Youtube, Twitter, Facebook } from "lucide-react";
import { Logo } from "@/components/layout/Logo";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { settingsQuery } from "@/lib/catalog-queries";

export function Footer() {
  const queryClient = useQueryClient();
  const { data: settingsData, isLoading } = useQuery(settingsQuery());
  const settings = settingsData || queryClient.getQueryData<any>(settingsQuery().queryKey);
  
  const footerRef = useRef<HTMLDivElement>(null);
  const [footerHeight, setFooterHeight] = useState(0);
  const [isRevealActive, setIsRevealActive] = useState(false);
  const [isMobileVisible, setIsMobileVisible] = useState(false);
  const [hasMobileAnimated, setHasMobileAnimated] = useState(false);

  // ResizeObserver to track dynamic footer height and decide animation mode
  useEffect(() => {
    if (!footerRef.current) return;

    const handleResize = () => {
      const el = footerRef.current;
      if (!el) return;
      const height = el.getBoundingClientRect().height;
      setFooterHeight(height);

      const desktop = window.innerWidth >= 1024;
      const fitsViewport = height < window.innerHeight;
      
      const active = desktop && fitsViewport;
      setIsRevealActive(active);
    };

    const observer = new ResizeObserver(() => {
      handleResize();
    });
    observer.observe(footerRef.current);

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  // Desktop Scroll Animation (Direct DOM manipulation for max performance)
  useEffect(() => {
    if (!isRevealActive || !footerRef.current) {
      // Clear inline styles when reveal is inactive (mobile/non-reveal mode)
      if (footerRef.current) {
        footerRef.current.style.transform = "";
        footerRef.current.style.opacity = "";
      }
      return;
    }

    const updateParallax = () => {
      const el = footerRef.current;
      if (!el) return;

      const docHeight = document.documentElement.scrollHeight;
      const winHeight = window.innerHeight;
      const maxScroll = docHeight - winHeight;
      const currentScroll = window.scrollY;

      const startScroll = maxScroll - footerHeight;
      if (startScroll <= 0) return;

      const progress = Math.max(0, Math.min(1, (currentScroll - startScroll) / footerHeight));

      const ty = (1 - progress) * 80; // Slide up from 80px
      const op = 0.6 + progress * 0.4;  // Fade from 0.6 to 1.0
      const sc = 0.95 + progress * 0.05; // Scale from 0.95 to 1.0

      el.style.transform = `translate3d(0, ${ty}px, 0) scale(${sc})`;
      el.style.opacity = `${op}`;
    };

    window.addEventListener("scroll", updateParallax, { passive: true });
    window.addEventListener("resize", updateParallax);
    updateParallax(); // Initial check

    return () => {
      window.removeEventListener("scroll", updateParallax);
      window.removeEventListener("resize", updateParallax);
    };
  }, [isRevealActive, footerHeight]);

  // Mobile Viewport Entrance Intersection Observer
  useEffect(() => {
    // Only run intersection observer if reveal mode is inactive (mobile/tablet/fits viewport check false)
    if (isRevealActive || !footerRef.current || hasMobileAnimated) return;

    const el = footerRef.current;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsMobileVisible(true);
          setHasMobileAnimated(true);
          observer.unobserve(el);
        }
      },
      {
        threshold: 0.05, // Trigger when 5% of footer is in view
      }
    );

    observer.observe(el);

    return () => {
      observer.disconnect();
    };
  }, [isRevealActive, hasMobileAnimated]);

  // Reset animations when reveal state changes
  useEffect(() => {
    if (isRevealActive) {
      setIsMobileVisible(false);
      setHasMobileAnimated(false);
    }
  }, [isRevealActive]);

  return (
    <>
      {/* Spacer in document flow to preserve scrolling range on desktop reveal mode */}
      {isRevealActive && (
        <div style={{ height: `${footerHeight}px` }} className="pointer-events-none mt-24" />
      )}

      <footer
        ref={footerRef}
        className={`border-t border-border bg-surface/30 pb-24 md:pb-12 ${
          isRevealActive
            ? "fixed bottom-0 left-0 right-0 z-0 origin-bottom"
            : `relative mt-24 transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                isMobileVisible || hasMobileAnimated
                  ? "translate-y-0 opacity-100 scale-100"
                  : "translate-y-5 opacity-0 scale-[0.98]"
              }`
        }`}
        style={isRevealActive ? { willChange: "transform, opacity" } : undefined}
      >
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent" />

        <div className="mx-auto max-w-[1600px] px-4 md:px-8 pt-16">
          <div className="grid lg:grid-cols-12 gap-12">
            <div className="lg:col-span-4">
              <div className="flex items-center gap-2.5 mb-4">
                {isLoading && !settings ? (
                  <div className="h-8 w-24 bg-zinc-800/40 animate-pulse rounded" />
                ) : settings?.logo_url ? (
                  <img src={settings.logo_url} alt={settings.store_name || "Logo"} className="h-8 w-auto object-contain" />
                ) : (
                  <Logo className="h-7 w-auto text-foreground" />
                )}
                {settings?.store_name && (
                  <span className="font-display text-2xl tracking-wide text-primary">
                    {settings.store_name}
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
                Race-bred helmets engineered for the street, the track, and everything in between. Built without compromise. Certified to the highest standards.
              </p>
              <div className="flex gap-2 mt-6">
                {[Instagram, Youtube, Twitter, Facebook].map((Icon, i) => (
                  <a key={i} href="#" aria-label="social" className="size-10 border border-border grid place-items-center hover:border-primary hover:text-primary transition-colors">
                    <Icon className="size-4" />
                  </a>
                ))}
              </div>
            </div>

            <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-8">
              <Col title="Shop" links={[
                { l: "All Helmets", to: "/shop" },
                { l: "Full-Face", to: "/shop/full-face" },
                { l: "Modular", to: "/shop/modular" },
                { l: "Off-Road", to: "/shop/off-road" },
                { l: "Urban", to: "/shop/urban" },
              ]} />
              <Col title="Support" links={[
                { l: "Contact", to: "/contact" },
                { l: "Shipping", to: "/contact" },
                { l: "Returns", to: "/contact" },
                { l: "Sizing Guide", to: "/contact" },
                { l: "Warranty", to: "/contact" },
              ]} />
              <Col title="Company" links={[
                { l: "About", to: "/about" },
                { l: "Journal", to: "/blog" },
                { l: "Riders", to: "/about" },
                { l: "Press", to: "/about" },
              ]} />
              <Col title="Account" links={[
                { l: "Sign In", to: "/account" },
                { l: "My Orders", to: "/account" },
                { l: "Wishlist", to: "/wishlist" },
              ]} />
            </div>
          </div>

          <div className="mt-16 pt-8 border-t border-border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-xs text-muted-foreground font-mono">
            <p>© 2026{settings?.store_name ? ` ${settings.store_name.toUpperCase()}` : ""}. ALL RIGHTS RESERVED.</p>
            <div className="flex gap-6">
              <span>ECE 22.06 CERTIFIED</span>
              <span>DOT APPROVED</span>
              <span>FIM HOMOLOGATED</span>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}

function Col({ title, links }: { title: string; links: { l: string; to: string }[] }) {
  return (
    <div>
      <h4 className="font-mono text-xs uppercase tracking-[0.2em] text-primary mb-4">{title}</h4>
      <ul className="space-y-3">
        {links.map((l) => (
          <li key={l.l}>
            <Link to={l.to} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              {l.l}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
