import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

export type AppRole = "admin" | "staff" | "customer";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const loadRoles = async (uid: string | null) => {
      if (!uid) {
        if (active) setRoles([]);
        return;
      }
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", uid);
      if (active) setRoles(((data ?? []) as { role: AppRole }[]).map((r) => r.role));
    };

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setUser(data.session?.user ?? null);
      loadRoles(data.session?.user?.id ?? null).finally(() => active && setLoading(false));
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_evt, session) => {
      setUser(session?.user ?? null);
      loadRoles(session?.user?.id ?? null);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  return {
    user,
    roles,
    loading,
    isAdmin: roles.includes("admin"),
    isStaff: roles.includes("staff"),
    isAdminOrStaff: roles.includes("admin") || roles.includes("staff"),
  };
}
