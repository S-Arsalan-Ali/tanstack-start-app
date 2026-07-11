import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronUp } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";

export function BackToTop() {
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const scrolled = window.scrollY;
      const total = document.documentElement.scrollHeight - window.innerHeight;
      
      // Calculate scroll progress percentage
      if (total > 0) {
        setProgress((scrolled / total) * 100);
      }

      // Show button once scrolled past 400px
      setVisible(scrolled > 400);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    // Run once on mount to capture initial scroll depth
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  // Circumference of a circle with radius 18: 2 * PI * 18 ≈ 113.1
  const circumference = 113.1;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <AnimatePresence>
      {visible && (
        <TooltipProvider delayDuration={150}>
          <Tooltip>
            <TooltipTrigger asChild>
              <motion.button
                onClick={scrollToTop}
                initial={{ opacity: 0, scale: 0.8, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: 10 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className="fixed z-40 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] md:bottom-8 right-4 md:right-8 size-12 rounded-full bg-zinc-950/90 border border-zinc-800/80 backdrop-blur-md flex items-center justify-center text-zinc-400 hover:text-primary hover:border-primary/50 shadow-[0_4px_24px_rgba(0,0,0,0.6)] cursor-pointer group transition-colors animate-in fade-in zoom-in duration-300"
                aria-label="Back to top"
              >
                {/* Radial progress svg border */}
                <svg className="absolute inset-0 size-full -rotate-90 pointer-events-none" viewBox="0 0 44 44">
                  {/* Background Circle */}
                  <circle
                    cx="22"
                    cy="22"
                    r="18"
                    className="stroke-zinc-850"
                    strokeWidth="1.5"
                    fill="transparent"
                  />
                  {/* Progress Stroke Circle */}
                  <motion.circle
                    cx="22"
                    cy="22"
                    r="18"
                    className="stroke-primary drop-shadow-[0_0_4px_rgba(249,115,22,0.3)]"
                    strokeWidth="2"
                    fill="transparent"
                    strokeDasharray={circumference}
                    animate={{ strokeDashoffset }}
                    transition={{ ease: "easeOut", duration: 0.1 }}
                  />
                </svg>

                {/* Glowing neon ring on hover */}
                <div className="absolute inset-0 rounded-full border border-primary/0 group-hover:border-primary/30 group-hover:shadow-[0_0_12px_rgba(249,115,22,0.15)] transition-all duration-300 pointer-events-none" />

                {/* Chevron Arrow */}
                <ChevronUp className="size-5 transition-transform duration-300 group-hover:-translate-y-0.5" />
              </motion.button>
            </TooltipTrigger>
            <TooltipContent 
              side="left" 
              sideOffset={12}
              className="bg-zinc-950 border border-primary/30 text-primary font-mono text-[9px] uppercase tracking-[0.15em] px-2.5 py-1.5 rounded-none shadow-[0_4px_12px_rgba(0,0,0,0.6)] z-[60]"
            >
              Pit Lane
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </AnimatePresence>
  );
}
