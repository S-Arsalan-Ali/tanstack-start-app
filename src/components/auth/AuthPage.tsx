import { Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { LogIn, UserPlus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { useShop } from "@/store/shop";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/layout/Logo";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { settingsQuery } from "@/lib/catalog-queries";
import hero1 from "@/assets/hero-1.jpg";
import hero2 from "@/assets/hero-2.jpg";

interface AuthPageProps {
  initialSignUp: boolean;
}

export function AuthPage({ initialSignUp }: AuthPageProps) {
  const signIn = useShop((s) => s.signIn);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: settingsData, isLoading } = useQuery(settingsQuery());
  const settings = settingsData || queryClient.getQueryData<any>(settingsQuery().queryKey);
  const [isSignUp, setIsSignUp] = useState(initialSignUp);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Sync state if initialSignUp changes (e.g. user navigates directly between routes)
  useEffect(() => {
    setIsSignUp(initialSignUp);
    setIsForgotPassword(false);
  }, [initialSignUp]);

  // Sync state on browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      setIsSignUp(window.location.pathname === "/signup");
      setIsForgotPassword(false);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const handleToggle = (signUp: boolean) => {
    setIsSignUp(signUp);
    setIsForgotPassword(false);
    const targetPath = signUp ? "/signup" : "/login";
    window.history.pushState(null, "", targetPath);
    document.title = signUp ? "Create Account — MotoHelm" : "Sign In — MotoHelm";
  };

  const handleLoginSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") || "");
    const password = String(fd.get("password") || "");

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    
    if (error) { 
      toast.error(error.message); 
      return; 
    }
    
    signIn({ email });
    toast.success("Welcome back, rider");
    const redirect = new URLSearchParams(window.location.search).get("redirect");
    if (redirect) { 
      window.location.href = redirect; 
      return; 
    }
    navigate({ to: "/account" });
  };

  const handleSignupSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get("name") || "");
    const email = String(fd.get("email") || "");
    const phone = String(fd.get("phone") || "");
    const password = String(fd.get("password") || "");
    const confirm = String(fd.get("confirm") || "");

    if (password.length < 6) { 
      toast.error("Password too short", { description: "Use at least 6 characters." }); 
      return; 
    }
    if (password !== confirm) { 
      toast.error("Passwords don't match"); 
      return; 
    }

    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { 
        emailRedirectTo: `${window.location.origin}/`, 
        data: { name, phone } 
      },
    });
    setLoading(false);
    
    if (error) { 
      toast.error(error.message); 
      return; 
    }
    
    signIn({ name, email, phone });
    toast.success("Account created successfully", { description: "Check your inbox for a confirmation email." });
    navigate({ to: "/account" });
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") || "");

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Recovery link dispatched", {
      description: "Check your email inbox for password recovery instructions.",
    });
    setIsForgotPassword(false);
  };

  return (
    <section className="pt-16 md:pt-20 min-h-screen grid lg:grid-cols-2 bg-background relative overflow-hidden">
      {/* Left Column: Hero Brand Side */}
      <div className="relative hidden lg:block overflow-hidden bg-carbon border-r border-border h-full">
        {/* Fading images background */}
        <div className="absolute inset-0 size-full">
          <motion.img
            src={hero1}
            alt="MotoHelm Rider"
            initial={false}
            animate={{ opacity: isSignUp && !isForgotPassword ? 0 : 0.8 }}
            transition={{ duration: 0.6, ease: "easeInOut" }}
            className="absolute inset-0 size-full object-cover"
          />
          <motion.img
            src={hero2}
            alt="MotoHelm Racing Track"
            initial={false}
            animate={{ opacity: isSignUp && !isForgotPassword ? 0.8 : 0 }}
            transition={{ duration: 0.6, ease: "easeInOut" }}
            className="absolute inset-0 size-full object-cover"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-br from-background/95 via-background/40 to-background/95" />
        
        {/* Neon Orange Pulse Indicator */}
        <div className="absolute top-8 left-8 flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.3em] text-primary">
          <span className="size-2 bg-primary animate-pulse-glow" /> 
          <AnimatePresence mode="wait">
            <motion.span
              key={isForgotPassword ? "recovery" : isSignUp ? "grid" : "system"}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.2 }}
            >
              {isForgotPassword ? "RECOVERY ACTIVE" : isSignUp ? "GRID ACTIVE" : "SYSTEM ACTIVE"}
            </motion.span>
          </AnimatePresence>
        </div>

        <div className="relative h-full flex flex-col justify-between p-16 z-10">
          <Link to="/" className="flex items-center gap-2 group font-display text-3xl tracking-wider hover:text-primary transition-colors">
            {isLoading && !settings ? (
              <div className="h-9 w-24 bg-zinc-800/40 animate-pulse rounded" />
            ) : settings?.logo_url ? (
              <img src={settings.logo_url} alt={settings.store_name || "Logo"} className="h-9 w-auto object-contain" />
            ) : (
              <Logo className="h-8 w-auto text-foreground" />
            )}
            {settings?.store_name && (
              <span className="text-primary">{settings.store_name}</span>
            )}
          </Link>
          
          <div className="relative min-h-[220px] flex flex-col justify-end">
            <AnimatePresence mode="wait">
              {isForgotPassword ? (
                <motion.div
                  key="forgot-hero"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.35, ease: "easeOut" }}
                  className="space-y-4 absolute bottom-0 left-0 right-0"
                >
                  <p className="font-mono text-xs uppercase tracking-[0.3em] text-primary">Rider recovery</p>
                  <h2 className="font-display text-6xl xl:text-7xl tracking-tight leading-[0.95] max-w-md">
                    RESET ACCESS.<br/>BACK TO <span className="text-primary text-stroke-primary">THE TRACK.</span>
                  </h2>
                  <p className="text-muted-foreground text-sm max-w-sm font-sans leading-relaxed">
                    Enter your registered email address to request a secure password recovery code. Recovery links are dispatched via automated channels.
                  </p>
                </motion.div>
              ) : !isSignUp ? (
                <motion.div
                  key="login-hero"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.35, ease: "easeOut" }}
                  className="space-y-4 absolute bottom-0 left-0 right-0"
                >
                  <p className="font-mono text-xs uppercase tracking-[0.3em] text-primary">Garage Access</p>
                  <h2 className="font-display text-6xl xl:text-7xl tracking-tight leading-[0.95] max-w-md">
                    YOUR GEAR.<br/>YOUR <span className="text-primary text-stroke-primary">PIT WALL.</span>
                  </h2>
                  <p className="text-muted-foreground text-sm max-w-sm font-sans leading-relaxed">
                    Log in to access your saved helmets, track orders in real-time, and unlock loyalty rider drops.
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  key="signup-hero"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.35, ease: "easeOut" }}
                  className="space-y-6 absolute bottom-0 left-0 right-0"
                >
                  <p className="font-mono text-xs uppercase tracking-[0.3em] text-primary">Join the Grid</p>
                  <h2 className="font-display text-6xl xl:text-7xl tracking-tight leading-[0.95] max-w-md">
                    EARN POINTS.<br/>UNLOCK <span className="text-primary text-stroke-primary">DROPS.</span>
                  </h2>
                  <ul className="space-y-3 font-mono text-xs text-muted-foreground uppercase tracking-wider">
                    <li className="flex items-center gap-2">
                      <span className="text-primary">→</span> Early access to limited-edition helmet drops
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-primary">→</span> Free shipping thresholds reduced dynamically
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-primary">→</span> Extended 2-year warranty registrations
                    </li>
                  </ul>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            ECE 22.06 CERTIFIED RACING GEAR
          </div>
        </div>
      </div>

      {/* Right Column: Form Card Side */}
      <div className="flex items-center justify-center p-4 sm:p-6 md:p-16 relative bg-zinc-950/20 bg-carbon/5">
        <motion.div
          layout
          transition={{ type: "spring", stiffness: 320, damping: 32 }}
          className="w-full max-w-md bg-surface/25 border border-border p-6 sm:p-8 md:p-12 relative overflow-hidden backdrop-blur-md"
        >
          {/* Top orange accent strip */}
          <div className="h-1 bg-fire absolute top-0 left-0 right-0" />

          {/* Cyberpunk/Racing corner brackets */}
          <div className="absolute top-2 left-2 size-2 border-t border-l border-primary/45" />
          <div className="absolute top-2 right-2 size-2 border-t border-r border-primary/45" />
          <div className="absolute bottom-2 left-2 size-2 border-b border-l border-primary/45" />
          <div className="absolute bottom-2 right-2 size-2 border-b border-r border-primary/45" />
          
          {/* Content Height Animator Wrapper */}
          <HeightBinder>
            <AnimatePresence mode="popLayout" initial={false}>
              {isForgotPassword ? (
                <motion.div
                  key="forgot-form-container"
                  initial={{ opacity: 0, x: -30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 30 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="space-y-8"
                >
                  <div>
                    <p className="font-mono text-xs uppercase tracking-[0.3em] text-primary font-bold">Rider recovery</p>
                    <h1 className="font-display text-5xl md:text-6xl tracking-tight mt-2 uppercase">RESET ACCESS</h1>
                  </div>

                  <form onSubmit={handleForgotPasswordSubmit} className="space-y-5">
                    <Field name="email" label="Email Address" type="email" placeholder="alex.rivera@test.com" required />

                    <button 
                      type="submit" 
                      disabled={loading}
                      className="w-full bg-fire text-primary-foreground py-4 font-mono text-xs uppercase tracking-[0.2em] font-bold hover:brightness-110 active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {loading ? (
                        <><Loader2 className="size-4 animate-spin" /> Dispatching Link...</>
                      ) : (
                        <>Send Recovery Link</>
                      )}
                    </button>
                  </form>

                  <p className="text-center text-sm text-muted-foreground border-t border-border/50 pt-6 font-mono text-xs uppercase tracking-wider">
                    Remembered credentials?{" "}
                    <button
                      onClick={() => setIsForgotPassword(false)}
                      className="text-primary font-bold hover:underline hover:text-primary-glow bg-transparent border-none p-0 cursor-pointer"
                    >
                      Sign In
                    </button>
                  </p>
                </motion.div>
              ) : !isSignUp ? (
                <motion.div
                  key="login-form-container"
                  initial={{ opacity: 0, x: -30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 30 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="space-y-8"
                >
                  <div>
                    <p className="font-mono text-xs uppercase tracking-[0.3em] text-primary font-bold">Rider login</p>
                    <h1 className="font-display text-5xl md:text-6xl tracking-tight mt-2 uppercase">SIGN IN</h1>
                  </div>

                  <form onSubmit={handleLoginSubmit} className="space-y-5">
                    <Field name="email" label="Email Address" type="email" placeholder="alex.rivera@test.com" required />
                    <Field name="password" label="Password" type="password" placeholder="••••••••" required />

                    <div className="flex items-center justify-between text-xs font-mono">
                      <label className="flex items-center gap-2 text-muted-foreground cursor-pointer select-none">
                        <input type="checkbox" className="accent-primary size-3.5 rounded-none" defaultChecked /> Remember me
                      </label>
                      <button 
                        type="button" 
                        onClick={() => setIsForgotPassword(true)} 
                        className="text-primary hover:underline hover:text-primary-glow text-left cursor-pointer"
                      >
                        Forgot Password?
                      </button>
                    </div>

                    <button 
                      type="submit" 
                      disabled={loading}
                      className="w-full bg-fire text-primary-foreground py-4 font-mono text-xs uppercase tracking-[0.2em] font-bold hover:brightness-110 active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {loading ? (
                        <><Loader2 className="size-4 animate-spin" /> Accessing Garage...</>
                      ) : (
                        <><LogIn className="size-4" /> Sign In to Garage</>
                      )}
                    </button>
                  </form>

                  <p className="text-center text-sm text-muted-foreground border-t border-border/50 pt-6 font-mono text-xs uppercase tracking-wider">
                    New rider?{" "}
                    <button
                      onClick={() => handleToggle(true)}
                      className="text-primary font-bold hover:underline hover:text-primary-glow bg-transparent border-none p-0 cursor-pointer"
                    >
                      Create account
                    </button>
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  key="signup-form-container"
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -30 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="space-y-6"
                >
                  <div>
                    <p className="font-mono text-xs uppercase tracking-[0.3em] text-primary font-bold">Rider registration</p>
                    <h1 className="font-display text-5xl md:text-6xl tracking-tight mt-2 uppercase">JOIN GRID</h1>
                  </div>

                  <form onSubmit={handleSignupSubmit} className="space-y-4">
                    <Field name="name" label="Full Name" placeholder="Alex Rivera" required />
                    <Field name="email" label="Email Address" type="email" placeholder="you@example.com" required />
                    <Field name="phone" label="Phone Number" type="tel" placeholder="+92 300 1234567" />
                    <div className="grid sm:grid-cols-2 gap-4">
                      <Field name="password" label="Password" type="password" placeholder="At least 6 chars" required />
                      <Field name="confirm" label="Confirm Password" type="password" placeholder="Repeat password" required />
                    </div>

                    <label className="flex items-start gap-2.5 text-[11px] font-mono text-muted-foreground cursor-pointer select-none py-1">
                      <input type="checkbox" required className="accent-primary mt-0.5 size-3.5 rounded-none" />
                      <span>I agree to the MotoHelm terms of service & rider privacy policies.</span>
                    </label>

                    <button 
                      type="submit" 
                      disabled={loading}
                      className="w-full bg-fire text-primary-foreground py-4 font-mono text-xs uppercase tracking-[0.2em] font-bold hover:brightness-110 active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {loading ? (
                        <><Loader2 className="size-4 animate-spin" /> Enrolling Rider...</>
                      ) : (
                        <><UserPlus className="size-4" /> Create Account</>
                      )}
                    </button>
                  </form>

                  <p className="text-center text-sm text-muted-foreground border-t border-border/50 pt-5 font-mono text-xs uppercase tracking-wider">
                    Already registered?{" "}
                    <button
                      onClick={() => handleToggle(false)}
                      className="text-primary font-bold hover:underline hover:text-primary-glow bg-transparent border-none p-0 cursor-pointer"
                    >
                      Sign In
                    </button>
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </HeightBinder>
        </motion.div>
      </div>
    </section>
  );
}

// Inner helper component to measure and bind element height smoothly
function HeightBinder({ children }: { children: React.ReactNode }) {
  const [height, setHeight] = useState<number | "auto">("auto");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setHeight(entry.contentRect.height);
      }
    });
    
    resizeObserver.observe(ref.current);
    return () => resizeObserver.disconnect();
  }, []);

  return (
    <motion.div
      animate={{ height }}
      transition={{ type: "spring", stiffness: 350, damping: 35 }}
      style={{ position: "relative" }}
      className="overflow-visible"
    >
      <div ref={ref}>
        {children}
      </div>
    </motion.div>
  );
}

function Field({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground block mb-2 font-bold">{label}</span>
      <input 
        {...props} 
        className="w-full bg-background border border-border px-4 py-3 font-mono text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary rounded-none transition-all placeholder:text-zinc-700" 
      />
    </label>
  );
}
