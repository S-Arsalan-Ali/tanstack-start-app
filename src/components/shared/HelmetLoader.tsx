import { motion } from "framer-motion";

export function HelmetLoader({ label = "LOADING", fullScreen = true }: { label?: string; fullScreen?: boolean }) {
  const content = (
    <div className="flex flex-col items-center gap-5">
      <div className="relative size-24">
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-primary/30"
          animate={{ scale: [1, 1.15, 1], opacity: [0.6, 0, 0.6] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
        />
        <motion.div
          className="absolute inset-1 rounded-full border-2 border-transparent border-t-primary border-r-primary"
          animate={{ rotate: 360 }}
          transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
        />
        <svg viewBox="0 0 64 64" className="absolute inset-0 m-auto size-14 text-foreground" fill="currentColor">
          <path d="M32 8c-12 0-22 9-22 22v14a4 4 0 004 4h8v-6h20v6h8a4 4 0 004-4V30c0-13-10-22-22-22zm-15 24c0-9 7-16 15-16s15 7 15 16v3H17v-3zm3 8h24v3H20v-3z" opacity="0.85"/>
          <motion.rect
            x="18" y="22" width="28" height="10" rx="2"
            fill="url(#visorGrad)"
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
          <defs>
            <linearGradient id="visorGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="oklch(0.7 0.23 35)" />
              <stop offset="100%" stopColor="oklch(0.78 0.22 55)" />
            </linearGradient>
          </defs>
        </svg>
      </div>
      <div className="flex items-center gap-2">
        <span className="size-1.5 bg-primary animate-pulse" />
        <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
          {label}
        </span>
      </div>
    </div>
  );

  if (!fullScreen) {
    return <div className="min-h-[60vh] grid place-items-center py-20">{content}</div>;
  }
  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-background/90 backdrop-blur-sm">
      {content}
    </div>
  );
}
