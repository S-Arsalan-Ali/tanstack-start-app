import type { CatalogBrand } from "@/types/catalog";

interface BrandSliderProps {
  brands: CatalogBrand[];
  isLoading?: boolean;
}

export function BrandSlider({ brands, isLoading = false }: BrandSliderProps) {
  if (isLoading) {
    return (
      <section className="py-10 bg-surface/20 border-b border-border overflow-hidden relative">
        <div className="mx-auto max-w-[1600px] px-4 md:px-8 mb-6 flex items-center gap-2">
          <span className="size-1.5 bg-primary" />
          <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground font-bold">
            OFFICIAL GRID PARTNERS
          </span>
        </div>
        <div className="mx-auto max-w-[1600px] px-4 md:px-8">
          <div className="flex gap-4 overflow-hidden">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div
                key={idx}
                className="shrink-0 w-[180px] md:w-[220px] h-16 md:h-20 border border-border/40 bg-zinc-950 animate-pulse relative flex items-center justify-center overflow-hidden"
              >
                {/* Premium corner brackets */}
                <div className="absolute top-1 left-1 size-1.5 border-t border-l border-border/10" />
                <div className="absolute bottom-1 right-1 size-1.5 border-b border-r border-border/10" />
                <div className="h-6 w-24 bg-zinc-900 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  // Only display brands configured with show_in_slider = true
  const filteredBrands = brands.filter((b) => b.show_in_slider);

  if (filteredBrands.length === 0) return null;

  return (
    <section className="py-10 bg-surface/20 border-b border-border overflow-hidden relative">
      <div className="mx-auto max-w-[1600px] px-4 md:px-8 mb-6 flex items-center gap-2">
        <span className="size-1.5 bg-primary" />
        <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground font-bold">
          OFFICIAL GRID PARTNERS
        </span>
      </div>

      {/* Marquee Wrapper with side fading mask */}
      <div className="relative [mask-image:linear-gradient(to_right,transparent,white_15%,white_85%,transparent)] select-none">
        <div className="flex animate-marquee hover:[animation-play-state:paused] whitespace-nowrap gap-6 py-2 cursor-pointer">
          {/* Loop multiple times to ensure seamless infinite scrolling on wider displays */}
          {Array.from({ length: 4 }).map((_, loopIdx) => (
            <div key={loopIdx} className="flex shrink-0 gap-6">
              {filteredBrands.map((b) => (
                <div
                  key={`${loopIdx}-${b.id}`}
                  className="shrink-0 w-[180px] md:w-[220px] h-16 md:h-20 border border-border/40 hover:border-primary/60 bg-surface/10 hover:bg-surface/20 relative transition-all duration-300 group flex items-center justify-center overflow-hidden"
                >
                  {/* Premium top-right orange cyberpunk accent notch */}
                  <div className="absolute top-0 right-0 w-0 h-0 border-t-[6px] border-r-[6px] border-t-primary border-r-primary opacity-30 group-hover:opacity-100 transition-opacity duration-300" />
                  
                  {/* Cyberpunk corner brackets */}
                  <div className="absolute top-1 left-1 size-1.5 border-t border-l border-primary/20 group-hover:border-primary/60 transition-colors duration-300" />
                  <div className="absolute bottom-1 right-1 size-1.5 border-b border-r border-primary/20 group-hover:border-primary/60 transition-colors duration-300" />

                  {b.logo_url ? (
                    <img
                      src={b.logo_url}
                      alt={b.name}
                      loading="lazy"
                      className="h-8 md:h-10 w-auto max-w-[80%] object-contain grayscale opacity-50 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-300"
                    />
                  ) : (
                    <span className="font-display text-2xl md:text-3xl tracking-wider text-muted-foreground group-hover:text-primary transition-colors duration-300 uppercase">
                      {b.name}
                    </span>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
