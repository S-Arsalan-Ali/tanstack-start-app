export const slugify = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

export const fmtMoney = (n: number | null | undefined, symbol = "Rs.") =>
  `${symbol}${(Number(n ?? 0)).toFixed(2)}`;

export const fmtDate = (d: string | Date | null | undefined) =>
  d ? new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "—";

export const fmtDateTime = (d: string | Date | null | undefined) =>
  d ? new Date(d).toLocaleString(undefined, { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

export const statusColor = (status: string): string => {
  const map: Record<string, string> = {
    processing: "bg-blue-500/20 text-blue-300 border-blue-500/40",
    packed: "bg-purple-500/20 text-purple-300 border-purple-500/40",
    shipped: "bg-amber-500/20 text-amber-300 border-amber-500/40",
    delivered: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
    cancelled: "bg-red-500/20 text-red-300 border-red-500/40",
    returned: "bg-orange-500/20 text-orange-300 border-orange-500/40",
    pending: "bg-zinc-500/20 text-zinc-300 border-zinc-500/40",
    paid: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
    refunded: "bg-orange-500/20 text-orange-300 border-orange-500/40",
    failed: "bg-red-500/20 text-red-300 border-red-500/40",
    label_created: "bg-blue-500/20 text-blue-300 border-blue-500/40",
    in_transit: "bg-amber-500/20 text-amber-300 border-amber-500/40",
    active: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
    draft: "bg-zinc-500/20 text-zinc-300 border-zinc-500/40",
    archived: "bg-red-500/20 text-red-300 border-red-500/40",
    requested: "bg-blue-500/20 text-blue-300 border-blue-500/40",
    approved: "bg-purple-500/20 text-purple-300 border-purple-500/40",
    received: "bg-amber-500/20 text-amber-300 border-amber-500/40",
    rejected: "bg-red-500/20 text-red-300 border-red-500/40",
  };
  return map[status] ?? "bg-muted text-muted-foreground border-border";
};

import { supabase } from "@/integrations/supabase/client";

export async function logActivity(
  action_type: string,
  entity_id: string | null = null,
  details: Record<string, any> = {}
) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    await supabase.from("activity_logs").insert({
      user_id: user.id,
      action_type,
      entity_id,
      details,
    });
  } catch (err) {
    console.error("Failed to log activity:", err);
  }
}
