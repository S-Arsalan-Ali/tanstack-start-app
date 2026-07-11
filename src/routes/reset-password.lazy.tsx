import { createLazyFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { KeyRound, Loader2, ShieldCheck, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { useShop } from "@/store/shop";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/layout/Logo";
import { useQuery } from "@tanstack/react-query";
import { settingsQuery } from "@/lib/catalog-queries";
import hero1 from "@/assets/hero-1.webp";

export const Route = createLazyFileRoute("/reset-password")({
  component: ResetPasswordRoutePage,
});

function ResetPasswordRoutePage() {
  const signIn = useShop((s) => s.signIn);
  const navigate = useNavigate();
  const { data: settings } = useQuery(settingsQuery());
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setHasSession(true);
      } else {
        setHasSession(false);
      }
      setCheckingSession(false);
    };

    checkSession();
  }, []);

  const handleResetSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const password = String(fd.get("password") || "");
    const confirm = String(fd.get("confirm") || "");

    if (password.length < 6) {
      toast.error("Password too short", { description: "Use at least 6 characters." });
      return;
    }
    if (!/[A-Z]/.test(password)) {
      toast.error("Password invalid", { description: "Must contain at least one uppercase letter." });
      return;
    }
    if (!/[0-9]/.test(password)) {
      toast.error("Password invalid", { description: "Must contain at least one number." });
      return;
    }
    if (!/[^A-Za-z0-9]/.test(password)) {
      toast.error("Password invalid", { description: "Must contain at least one special character." });
      return;
    }
    if (password !== confirm) {
      toast.error("Passwords don't match");
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    if (data.user) {
      signIn({
        name: data.user.user_metadata?.name || "Rider",
        email: data.user.email || "",
        phone: data.user.user_metadata?.phone || "",
      });
    }
    
    toast.success("Password updated", { description: "Your new password has been applied. Welcome back." });
    navigate({ to: "/account" });
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center font-mono text-xs uppercase tracking-widest text-muted-foreground gap-3">
        <Loader2 className="size-6 animate-spin text-primary" />
        Authenticating Secure Session...
      </div>
    );
  }

  return (
    <section className="pt-16 md:pt-20 min-h-screen grid lg:grid-cols-2 bg-background relative overflow-hidden">
      {/* Left Column: Hero Brand Side */}
      <div className="relative hidden lg:block overflow-hidden bg-carbon border-r border-border h-full">
        <div className="absolute inset-0 size-full">
          <img
            src={hero1}
            alt="MotoHelm Rider"
            className="absolute inset-0 size-full object-cover opacity-80"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-br from-background/95 via-background/40 to-background/95" />
        
        {/* Neon Orange Pulse Indicator */}
        <div className="absolute top-8 left-8 flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.3em] text-primary">
          <span className="size-2 bg-primary animate-pulse-glow" /> 
          <span>RECOVERY ACTIVE</span>
        </div>

        <div className="relative h-full flex flex-col justify-between p-16 z-10">
          <Link to="/" className="flex items-center gap-2 group font-display text-3xl tracking-wider hover:text-primary transition-colors">
            {settings?.logo_url ? (
              <img src={settings.logo_url} alt={settings.store_name || "Logo"} className="h-9 w-auto object-contain" />
            ) : (
              <Logo className="h-8 w-auto text-foreground" />
            )}
            {settings?.store_name && (
              <span className="text-primary">{settings.store_name}</span>
            )}
          </Link>
          
          <div className="relative min-h-[220px] flex flex-col justify-end">
            <div className="space-y-4 absolute bottom-0 left-0 right-0">
              <p className="font-mono text-xs uppercase tracking-[0.3em] text-primary">New Passphrase</p>
              <h2 className="font-display text-6xl xl:text-7xl tracking-tight leading-[0.95] max-w-md">
                RESTORE<br/>YOUR <span className="text-primary text-stroke-primary">ACCESS.</span>
              </h2>
              <p className="text-muted-foreground text-sm max-w-sm font-sans leading-relaxed">
                Secure your rider profile with a new password. Enforce a secure phrase containing uppercase, numbers, and special characters.
              </p>
            </div>
          </div>
          
          <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            ECE 22.06 CERTIFIED RACING GEAR
          </div>
        </div>
      </div>

      {/* Right Column: Form Card Side */}
      <div className="flex items-center justify-center p-4 sm:p-6 md:p-16 relative bg-zinc-950/20 bg-carbon/5">
        <div className="w-full max-w-md bg-surface/25 border border-border p-6 sm:p-8 md:p-12 relative overflow-hidden backdrop-blur-md">
          {/* Top orange accent strip */}
          <div className="h-1 bg-fire absolute top-0 left-0 right-0" />

          {/* Cyberpunk/Racing corner brackets */}
          <div className="absolute top-2 left-2 size-2 border-t border-l border-primary/45" />
          <div className="absolute top-2 right-2 size-2 border-t border-r border-primary/45" />
          <div className="absolute bottom-2 left-2 size-2 border-b border-l border-primary/45" />
          <div className="absolute bottom-2 right-2 size-2 border-b border-r border-primary/45" />
          
          {!hasSession ? (
            <div className="space-y-6 text-center py-6">
              <div className="size-16 bg-destructive/10 border border-destructive/30 mx-auto flex items-center justify-center text-destructive">
                <ShieldCheck className="size-8 rotate-180" />
              </div>
              <div>
                <h1 className="font-display text-3xl uppercase tracking-tight">ACCESS DENIED</h1>
                <p className="text-muted-foreground text-sm font-sans mt-3 leading-relaxed">
                  A valid recovery session is required to reset your password. Please request a new recovery link from the login page.
                </p>
              </div>
              <div className="pt-4 border-t border-border/50">
                <Link
                  to="/login"
                  className="inline-block bg-fire text-primary-foreground px-6 py-3 font-mono text-xs uppercase tracking-[0.2em] font-bold"
                >
                  Back to Sign In
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.3em] text-primary font-bold">Security vault</p>
                <h1 className="font-display text-5xl md:text-6xl tracking-tight mt-2 uppercase">NEW PASSWORD</h1>
              </div>

              <form onSubmit={handleResetSubmit} className="space-y-5">
                <div className="relative">
                  <Field 
                    name="password" 
                    label="New Password" 
                    type={showPassword ? "text" : "password"} 
                    placeholder="••••••••" 
                    required 
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 bottom-3 text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>

                <div className="relative">
                  <Field 
                    name="confirm" 
                    label="Confirm New Password" 
                    type={showConfirm ? "text" : "password"} 
                    placeholder="••••••••" 
                    required 
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-4 bottom-3 text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    {showConfirm ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>

                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full bg-fire text-primary-foreground py-4 font-mono text-xs uppercase tracking-[0.2em] font-bold hover:brightness-110 active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                >
                  {loading ? (
                    <><Loader2 className="size-4 animate-spin" /> Saving password...</>
                  ) : (
                    <><KeyRound className="size-4" /> Update & Access Garage</>
                  )}
                </button>
              </form>

              <div className="text-xs font-mono text-muted-foreground border-t border-border/50 pt-5 space-y-2 uppercase tracking-wide">
                <p className="text-primary font-bold">Complexity Requirements:</p>
                <ul className="list-disc pl-4 space-y-1 text-[10px]">
                  <li>Minimum 6 characters long</li>
                  <li>At least one uppercase letter (A-Z)</li>
                  <li>At least one numeric digit (0-9)</li>
                  <li>At least one special character (!@#$ etc.)</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
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
