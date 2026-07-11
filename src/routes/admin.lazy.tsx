import { createLazyFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import type { User } from "@supabase/supabase-js";

export const Route = createLazyFileRoute("/admin")({
  component: AdminGate,
});

function AdminGate() {
  const [state, setState] = useState<"checking" | "ok" | "denied">("checking");
  const [email, setEmail] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let safetyTimer: ReturnType<typeof setTimeout>;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event !== "INITIAL_SESSION" && event !== "SIGNED_IN") return;

        clearTimeout(safetyTimer);
        console.log("[AdminGate] Auth event:", event, "| User:", session?.user?.email ?? "none");

        if (cancelled) return;

        const user = session?.user;
        if (!user) {
          console.log("[AdminGate] No session. Redirecting to login...");
          window.location.href = "/login?redirect=/admin/dashboard";
          return;
        }

        setEmail(user.email ?? null);
        await checkAdminAccess(user);
      }
    );

    async function checkAdminAccess(user: User) {
      try {
        console.log("[AdminGate] Checking roles for:", user.email, `(${user.id})`);

        const { data: roles, error: rolesErr } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id);

        if (cancelled) return;

        if (rolesErr) {
          console.error("[AdminGate] Roles query error:", rolesErr);
          setErrorMsg(
            `Failed to query user roles: ${rolesErr.message} (Code: ${rolesErr.code}). ` +
            `Make sure the database schema has been set up (run supabase_master_setup.sql).`
          );
          setState("denied");
          return;
        }

        console.log("[AdminGate] Roles from DB:", roles);
        const roleList = ((roles ?? []) as { role: string }[]).map((r) => r.role);

        if (roleList.includes("admin") || roleList.includes("staff")) {
          console.log("[AdminGate] ✅ Access granted.");
          setState("ok");
          return;
        }

        console.log("[AdminGate] User lacks admin/staff role.");
        const isLocal =
          typeof window !== "undefined" &&
          (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");

        if (isLocal) {
          console.log("[AdminGate] Localhost detected — checking if any admin exists...");
          const { count } = await supabase
            .from("user_roles")
            .select("*", { count: "exact", head: true })
            .eq("role", "admin");

          if ((count ?? 0) === 0) {
            console.log("[AdminGate] No admins exist. Attempting auto-promotion...");
            const { error: insertErr } = await supabase
              .from("user_roles")
              .insert({ user_id: user.id, role: "admin" });

            if (!insertErr) {
              console.log("[AdminGate] ✅ Auto-promoted to admin!");
              if (!cancelled) setState("ok");
              return;
            }
            console.error("[AdminGate] Auto-promotion failed:", insertErr.message);
          }
        }

        if (!cancelled) {
          setErrorMsg("Your account does not have admin or staff privileges.");
          setState("denied");
        }
      } catch (err: any) {
        if (cancelled) return;
        console.error("[AdminGate] Error:", err);
        setErrorMsg(`Admin check failed: ${err.message || err}`);
        setState("denied");
      }
    }

    safetyTimer = setTimeout(() => {
      if (!cancelled && state === "checking") {
        console.error("[AdminGate] Safety timeout reached (10s). Auth state never resolved.");
        setErrorMsg(
          "Authentication timed out. This usually means the Supabase client failed to initialize. " +
          "Check your browser console for errors and verify your .env configuration."
        );
        setState("denied");
      }
    }, 10000);

    return () => {
      cancelled = true;
      subscription.unsubscribe();
      clearTimeout(safetyTimer);
    };
  }, []);

  if (state === "checking") {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center gap-4">
        <Loader2 className="size-8 animate-spin text-orange-500" />
        <p className="text-xs text-zinc-500 font-mono">Verifying admin access…</p>
      </div>
    );
  }

  if (state === "denied") {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center bg-zinc-900 border border-zinc-800 p-8 rounded">
          <h1 className="font-display text-3xl text-orange-500 tracking-wider">ACCESS DENIED</h1>
          <p className="mt-4 text-sm text-zinc-400">
            {errorMsg || "You do not have administrative access."}
          </p>
          <div className="mt-6 p-4 bg-orange-950/20 border border-orange-900/40 rounded text-left text-xs text-orange-400 leading-relaxed font-mono">
            <strong>Need Admin Access?</strong>
            <p className="mt-2 text-zinc-300">Run this SQL in Supabase SQL Editor:</p>
            <pre className="mt-2 p-2 bg-zinc-950 rounded border border-zinc-800 overflow-x-auto select-all text-[11px] text-zinc-100 font-mono">
{`INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role
FROM auth.users
WHERE email = '${email || "YOUR_EMAIL"}';`}
            </pre>
          </div>
          <div className="mt-4 p-3 bg-zinc-800/50 border border-zinc-700 rounded text-left text-xs text-zinc-300">
            <strong>Session stuck?</strong>
            <button
              onClick={() => {
                for (let i = localStorage.length - 1; i >= 0; i--) {
                  const key = localStorage.key(i);
                  if (key && (key.startsWith("sb-") || key.includes("supabase"))) {
                    localStorage.removeItem(key);
                  }
                }
                window.location.href = "/login?redirect=/admin/dashboard";
              }}
              className="ml-2 underline text-orange-400 hover:text-orange-300"
            >
              Clear session & re-login
            </button>
          </div>
          <div className="mt-6 flex justify-center gap-4">
            <Link to="/" className="inline-block px-5 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs uppercase tracking-wider transition-colors">
              Storefront
            </Link>
            <Link to="/login" className="inline-block px-5 py-2 bg-orange-500 hover:bg-orange-600 text-black text-xs font-bold uppercase tracking-wider transition-colors">
              Sign In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <AdminLayout userEmail={email} />;
}
