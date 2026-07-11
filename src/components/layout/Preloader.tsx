import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { settingsQuery } from "@/lib/catalog-queries";
import { Key, Cpu } from "lucide-react";

interface PreloaderProps {
  onComplete: () => void;
  configOverride?: {
    enabled?: boolean;
    theme?: "dashboard" | "ignition" | "minimalist";
    behavior?: "once_per_session" | "every_visit";
  };
}

export function Preloader({ onComplete, configOverride }: PreloaderProps) {
  const queryClient = useQueryClient();
  const { data: settingsData, isLoading } = useQuery(settingsQuery());
  const settings = settingsData || queryClient.getQueryData<any>(settingsQuery().queryKey);
  const config = configOverride || settings?.theme?.preloader || { enabled: true, theme: "dashboard", behavior: "once_per_session" };

  const [ready, setReady] = useState(false);
  const [speed, setSpeed] = useState(0);
  const [percent, setPercent] = useState(0);
  const [preloaderState, setPreloaderState] = useState<"ignition" | "system_check" | "launching" | "done">("launching");

  useEffect(() => {
    if (settings || configOverride) {
      const activeTheme = configOverride?.theme || settings?.theme?.preloader?.theme || "dashboard";
      setPreloaderState(activeTheme === "ignition" ? "ignition" : "launching");
      setReady(true);
    } else {
      const safetyTimer = setTimeout(() => {
        setReady(true);
      }, 4000);
      return () => clearTimeout(safetyTimer);
    }
  }, [settings, configOverride]);

  // Prevent background scrolling while preloader is active
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  // Time sequence for ignition theme
  useEffect(() => {
    if (!ready || config.theme !== "ignition") return;

    if (preloaderState === "ignition") {
      const t = setTimeout(() => {
        setPreloaderState("system_check");
      }, 600);
      return () => clearTimeout(t);
    }

    if (preloaderState === "system_check") {
      const t = setTimeout(() => {
        setPreloaderState("launching");
      }, 600);
      return () => clearTimeout(t);
    }
  }, [preloaderState, config.theme, ready]);

  // Percentage animation for minimalist theme
  useEffect(() => {
    if (!ready || config.theme !== "minimalist") return;

    const start = 0;
    const end = 100;
    const duration = 1000; // Snappy 1s loading
    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Custom easing
      const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      const current = Math.floor(start + ease * (end - start));

      setPercent(current);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        const timer = setTimeout(() => {
          onComplete();
        }, 150);
        return () => clearTimeout(timer);
      }
    };

    const animFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animFrame);
  }, [config.theme, ready, onComplete]);

  // Speedometer and RPM simulation
  useEffect(() => {
    if (!ready || preloaderState !== "launching") return;

    const start = 0;
    const end = 299;
    const duration = 1000; // Snappy 1s speedometer climb
    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Custom acceleration curve: slow start, massive torque in mid-range, slow taper as top speed is reached
      const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      const current = Math.floor(start + ease * (end - start));

      setSpeed(current);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        // Hold at peak speed (299 km/h) for a short duration for maximum impact
        const timer = setTimeout(() => {
          setPreloaderState("done");
          onComplete();
        }, 200);
        return () => clearTimeout(timer);
      }
    };

    const animFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animFrame);
  }, [preloaderState, ready, onComplete]);

  // Framer Motion drawing configurations for SVG Logo paths
  const pathDraw = {
    hidden: { pathLength: 0, opacity: 0 },
    visible: (i: number) => ({
      pathLength: 1,
      opacity: 1,
      transition: {
        pathLength: { delay: 0.06 + i * 0.06, type: "spring" as const, duration: 0.7, bounce: 0 },
        opacity: { delay: 0.06 + i * 0.06, duration: 0.05 },
      },
    }),
  };

  const fillIn = {
    hidden: { scale: 0, opacity: 0 },
    visible: {
      scale: 1,
      opacity: 1,
      transition: { delay: 0.8, duration: 0.2, type: "spring" as const },
    },
  };

  const formattedSpeed = String(speed).padStart(3, "0");
  const numRPMBlocks = 15;
  const activeRPMBlocks = Math.floor((speed / 299) * numRPMBlocks);

  // LOGO SVG RENDER COMPONENT (Reused in themes)
  const renderLogoSVG = (className = "w-full h-auto") => (
    <svg
      viewBox="0 0 155 50"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Letter 'm' */}
      <motion.path
        d="M 9 39 L 9 20 C 9 15, 13 11, 19 11 C 24 11, 28 15, 28 20 L 28 39 L 28 20 C 28 15, 32 11, 38 11 C 43 11, 47 20, 47 20 L 47 39"
        stroke="currentColor"
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        custom={0}
        variants={pathDraw}
        initial="hidden"
        animate="visible"
      />

      {/* Letter 'o' (Orange Wheel) */}
      <g>
        {/* Spokes */}
        <g stroke="var(--primary)" strokeWidth="1.5" strokeLinecap="round">
          <motion.line x1="66" y1="12" x2="66" y2="38" custom={4} variants={pathDraw} initial="hidden" animate="visible" />
          <motion.line x1="53" y1="25" x2="79" y2="25" custom={5} variants={pathDraw} initial="hidden" animate="visible" />
          <motion.line x1="57" y1="16" x2="75" y2="34" custom={6} variants={pathDraw} initial="hidden" animate="visible" />
          <motion.line x1="75" y1="16" x2="57" y2="34" custom={7} variants={pathDraw} initial="hidden" animate="visible" />
        </g>
        {/* Outer Tire */}
        <motion.circle
          cx="66"
          cy="25"
          r="16"
          stroke="var(--primary)"
          strokeWidth="3.5"
          fill="none"
          custom={2}
          variants={pathDraw}
          initial="hidden"
          animate="visible"
        />
        {/* Inner Rim */}
        <motion.circle
          cx="66"
          cy="25"
          r="12.5"
          stroke="var(--primary)"
          strokeWidth="1.2"
          fill="none"
          custom={3}
          variants={pathDraw}
          initial="hidden"
          animate="visible"
        />
        {/* Hub Cover */}
        <motion.circle
          cx="66"
          cy="25"
          r="3.5"
          fill="var(--primary)"
          variants={fillIn}
          initial="hidden"
          animate="visible"
        />
      </g>

      {/* Letter 't' */}
      <motion.path
        d="M 98 10 L 98 35 C 98 38, 100 40, 104 40 M 90 20 L 105 20"
        stroke="currentColor"
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        custom={1}
        variants={pathDraw}
        initial="hidden"
        animate="visible"
      />

      {/* Letter 'o' (Orange Helmet) */}
      <g transform="translate(108, 8)">
        {/* Outer Shell */}
        <motion.path
          d="M 6 32 C 2 32, 0 27, 0 20 C 0 8, 9 2, 21 2 C 32 2, 38 8, 40 16 C 41 20, 41 24, 40 27 C 38 31, 32 30, 27 30 C 22 30, 8 32, 6 32 Z"
          stroke="var(--primary)"
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          custom={2}
          variants={pathDraw}
          initial="hidden"
          animate="visible"
        />
        {/* Visor */}
        <motion.path
          d="M 19 11 C 26 11, 32 13, 35 16 C 37 18, 36 21, 35 23 C 32 25, 26 25, 20 24 C 18 23.5, 17 20, 17 18 C 17 14, 18 12, 19 11 Z"
          stroke="var(--primary)"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          custom={3}
          variants={pathDraw}
          initial="hidden"
          animate="visible"
        />
        {/* Pivot mechanism */}
        <motion.circle
          cx="15"
          cy="18"
          r="1.2"
          fill="var(--primary)"
          variants={fillIn}
          initial="hidden"
          animate="visible"
        />
        {/* Vent details */}
        <motion.path
          d="M 33 26 L 35 26"
          stroke="var(--primary)"
          strokeWidth="1.5"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          custom={4}
          variants={pathDraw}
          initial="hidden"
          animate="visible"
        />
        <motion.path
          d="M 23 5 C 25 5, 27 6, 28 7"
          stroke="var(--primary)"
          strokeWidth="1.5"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          custom={5}
          variants={pathDraw}
          initial="hidden"
          animate="visible"
        />
      </g>
    </svg>
  );

  // MINIMALIST THEME RENDERING
  if (!ready) {
    return (
      <div 
        id="preloader-container" 
        className="fixed inset-0 bg-[#060606] z-[100] flex items-center justify-center"
      >
        <div className="size-1.5 bg-primary/40 rounded-full animate-ping" />
      </div>
    );
  }

  if (config.theme === "minimalist") {
    return (
      <motion.div
        id="preloader-container"
        key="preloader"
        initial={{ opacity: 1 }}
        exit={{
          opacity: 0,
          scale: 1.05,
          filter: "blur(15px)",
          transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
        }}
        className="fixed inset-0 bg-[#060606] z-[100] flex flex-col items-center justify-center select-none overflow-hidden"
      >
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:40px_40px] bg-center opacity-50 pointer-events-none" />

        <div className="flex flex-col items-center max-w-sm w-full px-6 z-10 text-center">
          <div className="mb-10 text-foreground flex items-center justify-center min-h-[64px] w-full">
            {isLoading && !settings ? (
              <div className="h-14 w-40 bg-zinc-800/40 animate-pulse rounded" />
            ) : settings?.logo_url ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-3 justify-center"
              >
                <img
                  src={settings.logo_url}
                  alt={settings.store_name || "Logo"}
                  className="h-14 w-auto object-contain"
                />
              </motion.div>
            ) : (
              <div className="w-56 md:w-64">{renderLogoSVG("w-full h-auto text-white")}</div>
            )}
          </div>

          <div className="w-full space-y-4">
            <div className="flex justify-between items-center font-mono text-[9px] tracking-wider text-zinc-500 uppercase">
              <span className="text-primary font-bold">Initializing telemetry</span>
              <span>{percent}%</span>
            </div>

            <div className="h-[2px] w-full bg-zinc-900 overflow-hidden relative">
              <div
                className="h-full bg-primary shadow-[0_0_8px_rgba(255,87,34,0.6)] transition-all duration-75"
                style={{ width: `${percent}%` }}
              />
            </div>

            <div className="font-mono text-[8px] text-zinc-600 uppercase tracking-widest text-left space-y-1 h-12 overflow-hidden">
              {percent > 5 && <div className="animate-in fade-in slide-in-from-bottom-1 duration-150">🚀 LOAD: BOOT_ROM_LOADED</div>}
              {percent > 30 && <div className="animate-in fade-in slide-in-from-bottom-1 duration-150">📦 SYNC: CATALOG_CACHED</div>}
              {percent > 65 && <div className="animate-in fade-in slide-in-from-bottom-1 duration-150">⚙️ CHECK: ENGINE_STABLE</div>}
              {percent > 85 && <div className="animate-in fade-in slide-in-from-bottom-1 duration-150">🔥 GO: SYSTEM_ARMED</div>}
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  // DASHBOARD OR IGNITION THEME RENDERING
  return (
    <motion.div
      id="preloader-container"
      key="preloader"
      initial={{ opacity: 1 }}
      exit={{
        opacity: 0,
        scale: 1.1,
        filter: "blur(20px)",
        transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
      }}
      className="fixed inset-0 bg-[#060606] z-[100] flex flex-col items-center justify-center select-none overflow-hidden"
    >
      {/* 1. Cyber Racing Grid Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:40px_40px] bg-center opacity-70 pointer-events-none" />

      {/* 2. Speed Lines / Warp Effect */}
      {preloaderState === "launching" &&
        Array.from({ length: 8 }).map((_, i) => (
          <motion.div
            key={i}
            initial={{ x: "100vw", opacity: 0.05 }}
            animate={{ x: "-100vw", opacity: [0.05, 0.35, 0.05] }}
            transition={{
              duration: 0.5 + Math.random() * 0.6,
              repeat: Infinity,
              ease: "linear",
              delay: Math.random() * 1.5,
            }}
            style={{
              top: `${10 + Math.random() * 80}%`,
              height: `${1 + Math.random() * 1.5}px`,
              width: `${100 + Math.random() * 200}px`,
            }}
            className="absolute bg-gradient-to-r from-transparent via-primary/25 to-transparent pointer-events-none"
          />
        ))}

      {/* 3. Preloader Main Interface Wrapper */}
      <div className="flex flex-col items-center max-w-lg w-full px-8 z-10">
        {/* Animated Logo */}
        <div className="mb-12 text-foreground flex items-center justify-center min-h-[64px] w-full">
          {isLoading && !settings ? (
            <div className="h-14 w-40 bg-zinc-800/40 animate-pulse rounded" />
          ) : settings?.logo_url ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1.0, ease: "easeOut" }}
              className="flex items-center gap-3 justify-center"
            >
              <img
                src={settings.logo_url}
                alt={settings.store_name || "Logo"}
                className="h-12 md:h-14 w-auto object-contain"
              />
              {settings?.store_name && (
                <span className="font-display text-3xl md:text-4xl tracking-wide text-primary">
                  {settings.store_name}
                </span>
              )}
            </motion.div>
          ) : (
            <div className="w-56 md:w-64">{renderLogoSVG("w-full h-auto")}</div>
          )}
        </div>

        {/* Dynamic Panels */}
        <div className="w-full min-h-[220px] flex items-center justify-center">
          {preloaderState === "ignition" && (
            <motion.div
              initial={{ rotate: -45, scale: 0.95, opacity: 0 }}
              animate={{ rotate: 0, scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="flex flex-col items-center justify-center p-8 border border-zinc-800 bg-[#070707] relative rounded shadow-[0_0_30px_rgba(255,87,34,0.02)] w-full max-w-sm text-center"
            >
              <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-zinc-700" />
              <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-zinc-700" />
              <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-zinc-700" />
              <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-zinc-700" />

              <Key className="size-10 text-primary animate-pulse mb-4" />
              <span className="font-mono text-[9px] text-zinc-300 tracking-[0.2em] uppercase">IGNITION KEY INSERTED</span>
              <span className="font-mono text-[8px] text-zinc-600 mt-1 uppercase">BOOTING DIGITAL ELECTRONICS...</span>
            </motion.div>
          )}

          {preloaderState === "system_check" && (
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="flex flex-col items-center justify-center p-6 border border-zinc-800 bg-[#070707] relative rounded w-full max-w-sm text-center"
            >
              <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-zinc-700" />
              <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-zinc-700" />
              <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-zinc-700" />
              <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-zinc-700" />

              <Cpu className="size-8 text-emerald-500 animate-spin mb-4" style={{ animationDuration: "3s" }} />
              <span className="font-mono text-[9px] text-emerald-400 tracking-[0.15em] uppercase">DIAGNOSTICS SEQUENCE</span>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1 font-mono text-[8px] text-zinc-500 mt-4 uppercase text-left w-full max-w-[180px] mx-auto">
                <span>ENGINE: OK</span><span className="text-emerald-500 text-right">PASS</span>
                <span>FUEL: OK</span><span className="text-emerald-500 text-right">PASS</span>
                <span>TC: ACTIVE</span><span className="text-emerald-500 text-right">PASS</span>
              </div>
            </motion.div>
          )}

          {preloaderState === "launching" && (
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-full bg-[#0a0a0a]/85 border border-zinc-800 p-6 shadow-[0_0_40px_rgba(255,87,34,0.05)] rounded-none relative"
            >
              {/* Neon Corner Accents */}
              <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-primary" />
              <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-primary" />
              <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-primary" />
              <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-primary" />

              {/* Instrument Grid */}
              <div className="flex justify-between items-center w-full">
                {/* Speed Telemetry */}
                <div className="flex flex-col items-start">
                  <span className="font-mono text-[9px] text-muted-foreground uppercase tracking-widest">VELOCITY</span>
                  <div className="font-display text-5xl md:text-6xl tracking-tight text-foreground flex items-baseline gap-1.5 mt-1">
                    <span className="font-mono text-primary font-bold">{formattedSpeed}</span>
                    <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">KM/H</span>
                  </div>
                </div>

                {/* Gear Indicator */}
                <div className="flex flex-col items-end pr-2">
                  <span className="font-mono text-[9px] text-muted-foreground uppercase tracking-widest">GEAR</span>
                  <span className="font-display text-4xl md:text-5xl font-black text-foreground mt-1 select-none">
                    {speed === 0 ? "N" : Math.min(6, Math.floor(speed / 50) + 1)}
                  </span>
                </div>
              </div>

              {/* LED RPM Rev Counter */}
              <div className="mt-6">
                <div className="flex justify-between items-center mb-1.5 font-mono text-[8px] tracking-wider text-muted-foreground">
                  <span>0 RPM</span>
                  <span className="text-primary font-bold">14,000 REDLINE</span>
                </div>
                <div className="flex gap-[3px] md:gap-1 w-full justify-between">
                  {Array.from({ length: numRPMBlocks }).map((_, i) => {
                    const isActive = i < activeRPMBlocks;
                    let colorClass = "bg-zinc-900";
                    if (isActive) {
                      if (i < 8) colorClass = "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]";
                      else if (i < 12) colorClass = "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]";
                      else colorClass = "bg-primary shadow-[0_0_12px_rgba(255,87,34,0.7)] animate-pulse";
                    }
                    return <div key={i} className={`h-2.5 flex-1 transition-all duration-75 ${colorClass}`} />;
                  })}
                </div>
                <div className="flex justify-between items-center mt-3 font-mono text-[9px] tracking-wider text-muted-foreground uppercase">
                  <span>RPM: {((speed / 299) * 13000 + 1000).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                  <span>MAP: RACE-1</span>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* Sub-telemetry Systems */}
        {preloaderState === "launching" && (
          <div className="w-full flex justify-between mt-4 px-2">
            <div className="flex flex-col gap-0.5 font-mono text-[8px] text-muted-foreground uppercase tracking-widest text-left">
              <span className="flex items-center gap-1">
                <span className={`size-1 rounded-full ${speed > 0 ? "bg-emerald-500 animate-ping" : "bg-zinc-600"}`} />
                SYS CHECK: OK
              </span>
              <span>LAUNCH: ACTIVE</span>
              <span>ABS/TC: ACTIVE</span>
            </div>
            <div className="flex flex-col gap-0.5 font-mono text-[8px] text-muted-foreground uppercase tracking-widest text-right">
              <span>TEMP: {Math.floor(75 + (speed / 299) * 23)}°C</span>
              <span className="text-primary font-semibold">MOTO Orange</span>
              <span>2026 VER. 1.0.8</span>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
