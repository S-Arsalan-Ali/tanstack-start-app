import { createLazyFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Mail, Shield, User, KeyRound } from "lucide-react";
import { logActivity } from "@/lib/admin-utils";

export const Route = createLazyFileRoute("/admin/staff")({ component: StaffManagement });

function StaffManagement() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingReset, setSendingReset] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    // Fetch profiles and user_roles
    const { data: profiles, error: pErr } = await supabase.from("profiles").select("*");
    const { data: roles, error: rErr } = await supabase.from("user_roles").select("*");
    
    if (pErr) toast.error("Error fetching profiles: " + pErr.message);
    if (rErr) toast.error("Error fetching roles: " + rErr.message);

    if (profiles && roles) {
      const combined = profiles.map(p => {
        const userRoles = roles.filter(r => r.user_id === p.user_id).map(r => r.role);
        return {
          ...p,
          roles: userRoles,
          primaryRole: userRoles.includes("admin") ? "Admin" : userRoles.includes("staff") ? "Staff" : "User",
        };
      }).filter(u => u.primaryRole !== "User"); // Only show admin and staff
      
      setUsers(combined);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const sendPasswordReset = async (email: string, userId: string, name: string) => {
    if (!email) {
      toast.error("User does not have an email address set.");
      return;
    }
    setSendingReset(userId);
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    setSendingReset(null);
    if (error) {
      toast.error("Error sending reset email: " + error.message);
    } else {
      toast.success("Password reset email sent to " + email);
      logActivity("SEND_PASSWORD_RESET", userId, { target_user: name, target_email: email });
    }
  };

  if (loading) {
    return <div className="p-8 flex justify-center"><Loader2 className="size-6 animate-spin text-orange-500" /></div>;
  }

  return (
    <div className="space-y-6 pb-20 max-w-5xl">
      <div className="border-b border-zinc-800 pb-4">
        <h2 className="font-display text-2xl tracking-wide uppercase text-white">Staff Management</h2>
        <p className="text-sm text-zinc-500 mt-1 font-mono">
          Manage administrator and staff accounts, send password reset emails.
        </p>
      </div>

      <div className="grid gap-4">
        {users.map(user => (
          <div key={user.user_id} className="bg-zinc-900/40 border border-zinc-800/80 rounded-lg p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="size-12 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400">
                {user.avatar_url ? (
                  <img src={user.avatar_url} alt={user.name} className="size-12 rounded-full object-cover" />
                ) : (
                  <User className="size-6" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-display text-lg tracking-tight uppercase text-zinc-100">{user.name || "Unnamed"}</h3>
                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full uppercase ${
                    user.primaryRole === "Admin" ? "bg-orange-500/10 text-orange-400 border border-orange-500/20" : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                  }`}>
                    {user.primaryRole}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-4 mt-1">
                  <div className="flex items-center gap-1.5 text-xs text-zinc-400 font-mono">
                    <Mail className="size-3.5" /> {user.email || "No email"}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => sendPasswordReset(user.email, user.user_id, user.name)}
                disabled={sendingReset === user.user_id || !user.email}
                className="bg-zinc-950 border border-zinc-800 hover:border-orange-500 hover:text-orange-400 text-zinc-300 px-4 py-2 text-[10px] uppercase tracking-wider font-mono font-bold rounded flex items-center gap-2 transition-all disabled:opacity-50"
              >
                {sendingReset === user.user_id ? <Loader2 className="size-4 animate-spin" /> : <KeyRound className="size-4" />}
                Send Reset Email
              </button>
            </div>
          </div>
        ))}
        {users.length === 0 && (
          <div className="p-8 text-center text-zinc-500 font-mono text-sm border border-dashed border-zinc-800 rounded-lg">
            No staff members found.
          </div>
        )}
      </div>
    </div>
  );
}
