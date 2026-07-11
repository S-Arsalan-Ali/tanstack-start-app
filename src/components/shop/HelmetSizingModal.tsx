import * as React from "react";
import { useState, useMemo, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Ruler, CheckCircle2, AlertTriangle, Info, HelpCircle, X, ChevronDown } from "lucide-react";
import measureGuide from "@/assets/helmet_measure_guide.png";
import { motion, AnimatePresence } from "framer-motion";

interface SizeRange {
  size: string;
  minCm: number;
  maxCm: number;
  minInch: number;
  maxInch: number;
}

const HELMET_SIZES: SizeRange[] = [
  { size: "XS", minCm: 53, maxCm: 54, minInch: 20.8, maxInch: 21.2 },
  { size: "S", minCm: 55, maxCm: 56, minInch: 21.6, maxInch: 22.0 },
  { size: "M", minCm: 57, maxCm: 58, minInch: 22.4, maxInch: 22.8 },
  { size: "L", minCm: 59, maxCm: 60, minInch: 23.2, maxInch: 23.6 },
  { size: "XL", minCm: 61, maxCm: 62, minInch: 24.0, maxInch: 24.4 },
  { size: "XXL", minCm: 63, maxCm: 64, minInch: 24.8, maxInch: 25.2 },
];

function getRecommendedSize(cm: number) {
  if (cm < 52.5) {
    return {
      size: "Too Small",
      notes: "Your measurement is below our standard range. You may need a specialized youth helmet.",
      color: "text-muted-foreground",
      badge: "UNDERSIZE",
      sizesToHighlight: [] as string[],
    };
  }
  if (cm > 64.5) {
    return {
      size: "Too Large",
      notes: "Your measurement is above our standard range. You may require a custom shell size (3XL+).",
      color: "text-muted-foreground",
      badge: "OVERSIZE",
      sizesToHighlight: [] as string[],
    };
  }

  // Exact matches
  for (const s of HELMET_SIZES) {
    if (cm >= s.minCm && cm <= s.maxCm) {
      return {
        size: s.size,
        notes: `Ideal fit for standard size ${s.size}. Recommended shell matches standard proportions.`,
        color: "text-primary",
        badge: "EXCELLENT FIT",
        sizesToHighlight: [s.size],
      };
    }
  }

  // Borderline checks
  if (cm > 54 && cm < 55) {
    return {
      size: "XS / S Borderline",
      notes: "You are between XS and S. Select XS for a snug track fit, or S for a comfortable street fit.",
      color: "text-primary-glow",
      badge: "BORDERLINE",
      sizesToHighlight: ["XS", "S"],
    };
  }
  if (cm > 56 && cm < 57) {
    return {
      size: "S / M Borderline",
      notes: "You fall between S and M. Select S for a snug track fit, or M for a comfortable street fit.",
      color: "text-primary-glow",
      badge: "BORDERLINE",
      sizesToHighlight: ["S", "M"],
    };
  }
  if (cm > 58 && cm < 59) {
    return {
      size: "M / L Borderline",
      notes: "You fall between M and L. Select M for a snug track fit, or L for a comfortable street fit.",
      color: "text-primary-glow",
      badge: "BORDERLINE",
      sizesToHighlight: ["M", "L"],
    };
  }
  if (cm > 60 && cm < 61) {
    return {
      size: "L / XL Borderline",
      notes: "You fall between L and XL. Select L for a snug track fit, or XL for a comfortable street fit.",
      color: "text-primary-glow",
      badge: "BORDERLINE",
      sizesToHighlight: ["L", "XL"],
    };
  }
  if (cm > 62 && cm < 63) {
    return {
      size: "XL / XXL Borderline",
      notes: "You fall between XL and XXL. Select XL for a snug track fit, or XXL for a comfortable street fit.",
      color: "text-primary-glow",
      badge: "BORDERLINE",
      sizesToHighlight: ["XL", "XXL"],
    };
  }

  // Borderline low edge
  if (cm >= 52.5 && cm < 53) {
    return {
      size: "XS Borderline",
      notes: "You are on the lower limit of XS. A tight fit is expected, consider checking cheek pad thickness.",
      color: "text-primary-glow",
      badge: "BORDERLINE",
      sizesToHighlight: ["XS"],
    };
  }

  // Borderline high edge
  if (cm > 64 && cm <= 64.5) {
    return {
      size: "XXL Borderline",
      notes: "You are on the upper limit of XXL. If you have a rounder head shape, consider checking XXXL options.",
      color: "text-primary-glow",
      badge: "BORDERLINE",
      sizesToHighlight: ["XXL"],
    };
  }

  return {
    size: "Unknown",
    notes: "Enter your head circumference to calculate size.",
    color: "text-muted-foreground",
    badge: "INPUT NEEDED",
    sizesToHighlight: [] as string[],
  };
}

export function HelmetSizingModal({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [unit, setUnit] = useState<"cm" | "inch">("cm");
  const [cmValue, setCmValue] = useState<number>(57.5);
  const [zoomOpen, setZoomOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("calculator");
  const [showScrollIndicator, setShowScrollIndicator] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const recommendation = useMemo(() => getRecommendedSize(cmValue), [cmValue]);

  const displayVal = useMemo(() => {
    if (unit === "cm") {
      return cmValue.toFixed(1);
    } else {
      return (cmValue / 2.54).toFixed(1);
    }
  }, [cmValue, unit]);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (unit === "cm") {
      setCmValue(val);
    } else {
      setCmValue(val * 2.54);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (isNaN(val)) return;

    if (unit === "cm") {
      setCmValue(Math.min(70, Math.max(40, val)));
    } else {
      setCmValue(Math.min(70, Math.max(40, val * 2.54)));
    }
  };

  const handleUnitToggle = (newUnit: "cm" | "inch") => {
    setUnit(newUnit);
  };

  const checkScroll = () => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const { scrollTop, scrollHeight, clientHeight } = container;
    const hasMore = scrollHeight - scrollTop - clientHeight > 15;
    setShowScrollIndicator(hasMore);
  };

  const scrollToBottom = () => {
    const container = scrollContainerRef.current;
    if (!container) return;
    container.scrollTo({
      top: container.scrollTop + 150,
      behavior: "smooth"
    });
  };

  useEffect(() => {
    if (open) {
      const timer = setTimeout(checkScroll, 200);

      let resizeObserver: ResizeObserver | null = null;
      if (scrollContainerRef.current && typeof ResizeObserver !== "undefined") {
        resizeObserver = new ResizeObserver(() => {
          checkScroll();
        });
        resizeObserver.observe(scrollContainerRef.current);
      }

      window.addEventListener("resize", checkScroll);

      return () => {
        clearTimeout(timer);
        window.removeEventListener("resize", checkScroll);
        if (resizeObserver) {
          resizeObserver.disconnect();
        }
      };
    } else {
      setShowScrollIndicator(false);
    }
  }, [open, activeTab]);

  const meterSizes = ["XS", "S", "M", "L", "XL", "XXL"];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-2xl bg-background border border-border p-0 overflow-hidden rounded-none flex flex-col max-h-[90vh] fixed top-4 sm:top-6 md:top-8 translate-y-0">
        <div className="p-6 pb-2 border-b border-border bg-surface/20">
          <DialogHeader className="text-left">
            <div className="flex items-center gap-2 font-mono text-xs text-primary tracking-widest uppercase mb-1">
              <Ruler className="size-4 animate-pulse" /> Sizing Station
            </div>
            <DialogTitle className="font-display text-3xl md:text-4xl tracking-wide uppercase">
              Helmet Fit & Sizing Guide
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground uppercase font-mono tracking-wider">
              Find your racing fitment. Get zero buffeting, max protection.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div ref={scrollContainerRef} onScroll={checkScroll} className="flex-1 overflow-y-auto p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4 bg-muted/60 border border-border/80 rounded-none h-11 p-1 mb-6">
              <TabsTrigger
                value="calculator"
                className="font-mono text-[10px] md:text-xs uppercase tracking-wider rounded-none data-[state=active]:bg-primary data-[state=active]:text-primary-foreground h-full transition-all cursor-pointer px-1.5"
              >
                <span className="hidden md:inline">Calculator</span>
                <span className="md:hidden">Calc</span>
              </TabsTrigger>
              <TabsTrigger
                value="chart"
                className="font-mono text-[10px] md:text-xs uppercase tracking-wider rounded-none data-[state=active]:bg-primary data-[state=active]:text-primary-foreground h-full transition-all cursor-pointer px-1.5"
              >
                <span className="hidden md:inline">Size Chart</span>
                <span className="md:hidden">Chart</span>
              </TabsTrigger>
              <TabsTrigger
                value="measure"
                className="font-mono text-[10px] md:text-xs uppercase tracking-wider rounded-none data-[state=active]:bg-primary data-[state=active]:text-primary-foreground h-full transition-all cursor-pointer px-1.5"
              >
                <span className="hidden md:inline">How to Measure</span>
                <span className="md:hidden">Measure</span>
              </TabsTrigger>
              <TabsTrigger
                value="tips"
                className="font-mono text-[10px] md:text-xs uppercase tracking-wider rounded-none data-[state=active]:bg-primary data-[state=active]:text-primary-foreground h-full transition-all cursor-pointer px-1.5"
              >
                <span className="hidden md:inline">Fit Tips</span>
                <span className="md:hidden">Tips</span>
              </TabsTrigger>
            </TabsList>

            {/* TAB CONTENT: CALCULATOR */}
            <TabsContent value="calculator" className="space-y-6 focus:outline-none">
              <div className="grid md:grid-cols-[5fr_4fr] gap-6 items-center">
                <div className="space-y-6">
                  {/* Unit Selector & Value */}
                  <div className="flex justify-between items-center">
                    <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Head Circumference</span>
                    <div className="flex border border-border font-mono text-[10px]">
                      <button
                        type="button"
                        onClick={() => handleUnitToggle("cm")}
                        className={`px-3 py-1 uppercase tracking-wider transition-colors ${unit === "cm" ? "bg-primary text-primary-foreground font-bold" : "hover:text-primary"}`}
                      >
                        Metric (cm)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUnitToggle("inch")}
                        className={`px-3 py-1 border-l border-border uppercase tracking-wider transition-colors ${unit === "inch" ? "bg-primary text-primary-foreground font-bold" : "hover:text-primary"}`}
                      >
                        Imperial (in)
                      </button>
                    </div>
                  </div>

                  {/* Slider & Number Box */}
                  <div className="flex items-center gap-4 bg-surface/30 border border-border/60 p-4">
                    <input
                      type="range"
                      min={unit === "cm" ? 50.0 : 19.7}
                      max={unit === "cm" ? 66.0 : 26.0}
                      step="0.1"
                      value={unit === "cm" ? cmValue : Number((cmValue / 2.54).toFixed(1))}
                      onChange={handleSliderChange}
                      className="flex-1 accent-primary h-1.5 bg-border rounded-none cursor-pointer"
                    />
                    <div className="flex items-center gap-1.5 bg-background border border-border px-3 py-1.5 w-24 justify-between font-mono">
                      <input
                        type="number"
                        step="0.1"
                        value={displayVal}
                        onChange={handleInputChange}
                        className="w-full text-center bg-transparent border-none text-sm font-bold text-foreground focus:outline-none focus:ring-0 p-0"
                      />
                      <span className="text-[10px] text-muted-foreground uppercase">{unit}</span>
                    </div>
                  </div>

                  {/* Visual Size Meter */}
                  <div className="space-y-2">
                    <div className="flex justify-between font-mono text-[10px] uppercase text-muted-foreground tracking-wider">
                      <span>XS (53-54)</span>
                      <span>M (57-58)</span>
                      <span>XXL (63-64)</span>
                    </div>
                    <div className="grid grid-cols-6 gap-1 h-3.5 bg-surface border border-border">
                      {meterSizes.map((sz) => {
                        const isHighlighted = recommendation.sizesToHighlight.includes(sz);
                        return (
                          <div
                            key={sz}
                            className={`transition-colors duration-300 ${isHighlighted ? "bg-primary" : "bg-transparent"}`}
                          />
                        );
                      })}
                    </div>
                    <div className="grid grid-cols-6 gap-1 font-mono text-[9px] text-center text-zinc-500 uppercase tracking-widest mt-1">
                      {meterSizes.map((sz) => {
                        const isHighlighted = recommendation.sizesToHighlight.includes(sz);
                        return (
                          <span key={sz} className={isHighlighted ? "text-primary font-bold" : ""}>
                            {sz}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Calculator Results */}
                <div className="border border-border/80 bg-surface/10 p-5 relative overflow-hidden flex flex-col justify-between min-h-[190px]">
                  {/* Decorative corner tag */}
                  <div className="absolute top-0 right-0 w-0 h-0 border-t-[8px] border-r-[8px] border-t-primary border-r-primary" />
                  
                  <div>
                    <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">RECOMMENDED SIZE</span>
                    <h4 className={`font-display text-4xl leading-tight mt-1 uppercase ${recommendation.color}`}>
                      {recommendation.size}
                    </h4>
                    <span className="inline-flex items-center gap-1 mt-2 px-2 py-0.5 border border-primary/20 text-[9px] font-mono tracking-widest text-primary bg-primary/5 uppercase">
                      {recommendation.badge}
                    </span>
                    <p className="text-xs text-muted-foreground mt-4 leading-relaxed font-sans">
                      {recommendation.notes}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-border/30 flex items-center gap-2 text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
                    <Info className="size-3.5 text-primary shrink-0" />
                    Size tolerance: ±0.5 cm
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* TAB CONTENT: SIZE CHART */}
            <TabsContent value="chart" className="space-y-4 focus:outline-none">
              <div className="border border-border overflow-x-auto scrollbar-hide">
                <table className="w-full text-left border-collapse min-w-[500px] sm:min-w-0">
                  <thead>
                    <tr className="bg-surface/50 border-b border-border font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      <th className="p-3">Helmet Size</th>
                      <th className="p-3">Metric (cm)</th>
                      <th className="p-3">Imperial (inches)</th>
                      <th className="p-3">Shell Size</th>
                    </tr>
                  </thead>
                  <tbody className="font-mono text-xs">
                    {HELMET_SIZES.map((row) => (
                      <tr
                        key={row.size}
                        className={`border-b border-border/50 last:border-0 hover:bg-surface/10 transition-colors ${recommendation.sizesToHighlight.includes(row.size) ? "bg-primary/5 text-primary font-bold" : ""}`}
                      >
                        <td className="p-3 font-display text-lg tracking-wider">{row.size}</td>
                        <td className="p-3">{row.minCm} - {row.maxCm} cm</td>
                        <td className="p-3">{row.minInch}" - {row.maxInch}"</td>
                        <td className="p-3 text-zinc-400">
                          {row.size === "XS" || row.size === "S" ? "Shell 1 (Compact)" : row.size === "M" || row.size === "L" ? "Shell 2 (Intermediate)" : "Shell 3 (Large)"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-[11px] text-muted-foreground italic font-sans">
                Note: Standard shells utilize EPS linings of different densities to tailor the fit. Removable cheek pads and liners are interchangeable within the same shell size to adjust sizing micro-fitment.
              </p>
            </TabsContent>

            <TabsContent value="measure" className="space-y-6 focus:outline-none">
              <div className="grid sm:grid-cols-[1fr_2fr] gap-6 items-center">
                <div className="bg-surface/10 border border-border p-4 flex items-center justify-center">
                  <button
                    type="button"
                    onClick={() => setZoomOpen(true)}
                    className="group relative cursor-zoom-in block outline-none border-none bg-transparent p-0"
                    aria-label="Zoom measurement diagram"
                  >
                    <img
                      src={measureGuide}
                      alt="Head measurement guide diagram"
                      className="w-full max-w-[180px] h-auto object-contain mx-auto border border-border/80 transition-transform group-hover:scale-[1.02]"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="font-mono text-[9px] uppercase tracking-widest text-primary bg-background border border-primary/20 px-2.5 py-1">
                        Click to Zoom
                      </span>
                    </div>
                  </button>
                </div>

                <div className="space-y-4">
                  <h4 className="font-mono text-xs uppercase tracking-widest text-primary font-bold">Measurement Instructions</h4>
                  <ul className="space-y-3 font-sans text-xs text-muted-foreground leading-relaxed">
                    <li className="flex gap-2.5 items-start">
                      <span className="size-5 shrink-0 bg-surface border border-border flex items-center justify-center font-mono text-[10px] text-primary font-bold">1</span>
                      <span>
                        Use a flexible cloth measuring tape. If you don't have one, use a piece of string and measure the string against a standard ruler.
                      </span>
                    </li>
                    <li className="flex gap-2.5 items-start">
                      <span className="size-5 shrink-0 bg-surface border border-border flex items-center justify-center font-mono text-[10px] text-primary font-bold">2</span>
                      <span>
                        Wrap the tape horizontally around your head, positioning it about <strong>1 inch (2.5 cm) above your eyebrows</strong> in the front and directly over the largest ridge at the back of your head.
                      </span>
                    </li>
                    <li className="flex gap-2.5 items-start">
                      <span className="size-5 shrink-0 bg-surface border border-border flex items-center justify-center font-mono text-[10px] text-primary font-bold">3</span>
                      <span>
                        Take 2 to 3 separate readings. The **largest** circumference measurement is the one you should use to calculate your helmet size.
                      </span>
                    </li>
                  </ul>
                </div>
              </div>
            </TabsContent>

            {/* TAB CONTENT: FIT TIPS */}
            <TabsContent value="tips" className="space-y-5 focus:outline-none">
              <h4 className="font-mono text-xs uppercase tracking-widest text-primary font-bold">The Snugness Checklist</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                A helmet is a piece of safety engineering, not a hat. It should fit snugly to prevent relative head-to-shell movement during an impact. Use this 4-step checklist to test the fit:
              </p>
              
              <div className="grid md:grid-cols-2 gap-4">
                {[
                  {
                    title: "The Cheek Test",
                    desc: "Cheek pads should touch your cheeks firmly without pain. Your mouth should shape slightly into a 'fish face' shape when speaking.",
                  },
                  {
                    title: "The Forehead Check",
                    desc: "Press the front of the helmet. There should be no gap between your forehead and the lining, and you shouldn't be able to fit a finger in.",
                  },
                  {
                    title: "The Roll Test",
                    desc: "Fasten the chinstrap securely. Try to roll the helmet off your head by pulling up from the back. A properly fitted helmet will not roll off.",
                  },
                  {
                    title: "The Wear Test",
                    desc: "Keep the helmet on for 10-15 minutes. If you experience headache points or red spots on your temple/forehead, the size is too small or the shape is too narrow.",
                  },
                ].map((tip, i) => (
                  <div key={i} className="border border-border p-4 bg-surface/10 hover:border-primary/50 transition-colors">
                    <div className="flex gap-2.5 items-center mb-2">
                      <CheckCircle2 className="size-4 text-primary shrink-0" />
                      <h5 className="font-display text-sm tracking-wider uppercase text-foreground">{tip.title}</h5>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">{tip.desc}</p>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <AnimatePresence>
          {showScrollIndicator && (
            <motion.div
              initial={{ opacity: 0, y: 10, x: "-50%" }}
              animate={{ opacity: 1, y: 0, x: "-50%" }}
              exit={{ opacity: 0, y: 10, x: "-50%" }}
              className="absolute bottom-[60px] left-1/2 flex justify-center pointer-events-none z-30"
            >
              <button
                type="button"
                onClick={scrollToBottom}
                className="bg-background/95 hover:bg-surface/90 border border-primary/40 text-primary font-mono text-[9px] tracking-widest uppercase px-3 py-1.5 flex items-center gap-1.5 shadow-[0_-4px_16px_rgba(0,0,0,0.6)] animate-bounce pointer-events-auto cursor-pointer rounded-none transition-colors"
              >
                <span>Scroll for More</span>
                <ChevronDown className="size-3.5" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="p-4 border-t border-border bg-surface/30 flex justify-end font-mono text-[10px] text-muted-foreground uppercase tracking-widest gap-4">
          <span>ECE 22.06 CERTIFIED FITMENT</span>
          <span>·</span>
          <span>MOTOHELM APEX LABS</span>
        </div>

        <AnimatePresence>
          {zoomOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setZoomOpen(false)}
              className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 cursor-zoom-out"
            >
              <button
                onClick={(e) => { e.stopPropagation(); setZoomOpen(false); }}
                className="absolute top-6 right-6 size-12 grid place-items-center border border-border bg-background/80 hover:bg-surface text-foreground transition-colors cursor-pointer z-[210]"
                aria-label="Close zoom"
              >
                <X className="size-5" />
              </button>
              <motion.img
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 28 }}
                src={measureGuide}
                alt="Head measurement guide diagram zoomed"
                className="max-w-[95vw] max-h-[85vh] object-contain select-none shadow-[0_0_50px_rgba(235,94,40,0.15)] border border-border/40"
                onClick={(e) => e.stopPropagation()}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
