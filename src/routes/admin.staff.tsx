import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/staff")({
  beforeLoad: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw redirect({ to: "/login?redirect=/admin/staff" });
    }
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id);
    const roleList = (roles ?? []).map(r => r.role);
    if (!roleList.includes("admin")) {
      throw redirect({ to: "/admin/dashboard" });
    }
  }
});
