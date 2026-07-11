import { createLazyFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Loader2, Ticket, Copy, Check } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { EntityDrawer, Field, AdminInput, AdminSelect, PrimaryBtn, GhostBtn } from "@/components/admin/EntityDrawer";
import { toast } from "sonner";
import { useConfirm } from "@/components/admin/ConfirmDialog";

export const Route = createLazyFileRoute("/admin/coupons")({ component: Coupons });

type Coupon = {
  id: string;
  code: string;
  discount_type: "percent" | "fixed";
  discount_value: number;
  min_order_subtotal: number;
  max_discount: number | null;
  expires_at: string | null;
  usage_limit: number | null;
  usage_count: number;
  is_active: boolean;
  created_at: string;
};

function Coupons() {
  const qc = useQueryClient();
  const [rows, setRows] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<Partial<Coupon> | null>(null);
  const [original, setOriginal] = useState<Partial<Coupon> | null>(null);
  const [saving, setSaving] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const confirm = useConfirm();

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("coupons").select("*").order("created_at", { ascending: false });
    setRows((data ?? []) as Coupon[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const startNew = () => {
    const fresh = {
      code: "",
      discount_type: "percent" as const,
      discount_value: 10,
      min_order_subtotal: 0,
      max_discount: null,
      expires_at: null,
      usage_limit: null,
      usage_count: 0,
      is_active: true,
    };
    setEdit(fresh);
    setOriginal(fresh);
    setOpen(true);
  };

  const save = async () => {
    if (!edit?.code?.trim()) return toast.error("Promo code is required");
    if (!edit.discount_value || edit.discount_value <= 0) return toast.error("Discount value must be greater than 0");

    setSaving(true);
    try {
      const payload = {
        code: edit.code.trim().toUpperCase(),
        discount_type: edit.discount_type ?? "percent",
        discount_value: Number(edit.discount_value),
        min_order_subtotal: Number(edit.min_order_subtotal) || 0,
        max_discount: edit.max_discount != null ? Number(edit.max_discount) : null,
        expires_at: edit.expires_at || null,
        usage_limit: edit.usage_limit != null ? Number(edit.usage_limit) : null,
        is_active: edit.is_active !== false,
      };

      const { error } = edit.id
        ? await supabase.from("coupons").update(payload).eq("id", edit.id)
        : await supabase.from("coupons").insert(payload);
      if (error) return toast.error(error.message);
      toast.success("Promo code saved");
      setOriginal(null); // Bypass isDirty check on close
      setOpen(false);
      load();
    } catch (err: any) {
      toast.error(err?.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (c: Coupon) => {
    const ok = await confirm({
      title: "Delete Promo Code",
      message: `Delete promo code "${c.code}"? This action cannot be undone.`,
      confirmText: "Delete",
      variant: "destructive",
    });
    if (!ok) return;
    const { error } = await supabase.from("coupons").delete().eq("id", c.id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    load();
  };

  const isDirty = () => {
    if (!edit || !original) return false;
    return (
      edit.code !== original.code ||
      edit.discount_type !== original.discount_type ||
      edit.discount_value !== original.discount_value ||
      edit.min_order_subtotal !== original.min_order_subtotal ||
      edit.max_discount !== original.max_discount ||
      edit.expires_at !== original.expires_at ||
      edit.usage_limit !== original.usage_limit ||
      edit.is_active !== original.is_active
    );
  };

  const handleClose = async (newOpen: boolean) => {
    if (!newOpen) {
      if (isDirty()) {
        const ok = await confirm({
          title: "Discard Changes?",
          message: "You have unsaved changes. Are you sure you want to discard them?",
          confirmText: "Discard",
          cancelText: "Keep Editing",
          variant: "destructive",
        });
        if (!ok) return;
      }
      setOpen(false);
      setEdit(null);
      setOriginal(null);
    } else {
      setOpen(true);
    }
  };

  const toggleActive = async (c: Coupon) => {
    const { error } = await supabase.from("coupons").update({ is_active: !c.is_active }).eq("id", c.id);
    if (error) return toast.error(error.message);
    toast.success(c.is_active ? "Deactivated" : "Activated");
    load();
  };

  const copyCode = (c: Coupon) => {
    navigator.clipboard.writeText(c.code);
    setCopiedId(c.id);
    setTimeout(() => setCopiedId(null), 2000);
    toast.success("Code copied to clipboard");
  };

  const isExpired = (c: Coupon) => c.expires_at && new Date(c.expires_at) < new Date();
  const isUsedUp = (c: Coupon) => c.usage_limit != null && c.usage_count >= c.usage_limit;

  const fmtDate = (d: string) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-zinc-500">{rows.length} promo codes</p>
        <PrimaryBtn onClick={startNew}><Plus className="size-4 inline mr-1" /> New promo code</PrimaryBtn>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded overflow-hidden">
        {loading ? <div className="p-12 text-center"><Loader2 className="size-6 animate-spin text-orange-500 mx-auto" /></div>
        : rows.length === 0 ? <div className="p-12 text-center text-zinc-500">No promo codes yet. Create one to get started.</div>
        : (
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-zinc-500 border-b border-zinc-800">
              <tr>
                <th className="text-left p-3">Code</th>
                <th className="text-left p-3">Discount</th>
                <th className="text-right p-3">Min Order</th>
                <th className="text-right p-3">Usage</th>
                <th className="text-left p-3">Expires</th>
                <th className="text-center p-3">Status</th>
                <th className="text-right p-3 w-32">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const expired = isExpired(r);
                const usedUp = isUsedUp(r);
                return (
                  <tr key={r.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <Ticket className="size-4 text-orange-400 shrink-0" />
                        <span className="font-mono font-bold text-orange-300 tracking-wider">{r.code}</span>
                        <button
                          onClick={() => copyCode(r)}
                          className="p-1 hover:bg-zinc-800 rounded text-zinc-500 hover:text-zinc-300"
                          title="Copy code"
                        >
                          {copiedId === r.id ? <Check className="size-3 text-green-400" /> : <Copy className="size-3" />}
                        </button>
                      </div>
                    </td>
                    <td className="p-3">
                      <span className="bg-orange-500/10 text-orange-400 border border-orange-500/20 px-2 py-0.5 rounded text-xs font-mono font-bold">
                        {r.discount_type === "percent" ? `${r.discount_value}%` : `Rs ${r.discount_value}`}
                      </span>
                      {r.max_discount != null && r.discount_type === "percent" && (
                        <span className="text-zinc-500 text-[10px] ml-1">(max Rs {r.max_discount})</span>
                      )}
                    </td>
                    <td className="p-3 text-right font-mono text-zinc-400">
                      {Number(r.min_order_subtotal) > 0 ? `Rs ${r.min_order_subtotal}` : "—"}
                    </td>
                    <td className="p-3 text-right">
                      <span className={`font-mono ${usedUp ? "text-red-400 font-bold" : "text-zinc-300"}`}>
                        {r.usage_count}
                      </span>
                      <span className="text-zinc-600">/{r.usage_limit ?? "∞"}</span>
                    </td>
                    <td className="p-3 text-xs text-zinc-500">
                      {r.expires_at ? (
                        <span className={expired ? "text-red-400" : "text-zinc-400"}>{fmtDate(r.expires_at)}</span>
                      ) : "Never"}
                    </td>
                    <td className="p-3 text-center">
                      {expired ? (
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] uppercase border border-red-500/30 text-red-400 bg-red-500/10">Expired</span>
                      ) : usedUp ? (
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] uppercase border border-amber-500/30 text-amber-400 bg-amber-500/10">Used Up</span>
                      ) : r.is_active ? (
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] uppercase border border-green-500/30 text-green-400 bg-green-500/10">Active</span>
                      ) : (
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] uppercase border border-zinc-600 text-zinc-500">Inactive</span>
                      )}
                    </td>
                    <td className="p-3 text-right whitespace-nowrap">
                      <button onClick={() => toggleActive(r)} className="p-1.5 hover:bg-zinc-800 rounded mr-1" title={r.is_active ? "Deactivate" : "Activate"}>
                        <span className={`text-xs font-mono ${r.is_active ? "text-zinc-400" : "text-green-400"}`}>{r.is_active ? "OFF" : "ON"}</span>
                      </button>
                      <button onClick={() => { setEdit({ ...r }); setOriginal({ ...r }); setOpen(true); }} className="p-1.5 hover:bg-zinc-800 rounded mr-1"><Pencil className="size-4" /></button>
                      <button onClick={() => remove(r)} className="p-1.5 hover:bg-red-500/20 text-red-400 rounded"><Trash2 className="size-4" /></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <EntityDrawer
        open={open} onOpenChange={handleClose}
        title={edit?.id ? "Edit Promo Code" : "New Promo Code"}
        footer={<><GhostBtn onClick={() => handleClose(false)} disabled={saving}>Cancel</GhostBtn><PrimaryBtn onClick={save} disabled={saving}>{saving ? <><Loader2 className="size-4 animate-spin inline mr-1" />Saving...</> : "Save"}</PrimaryBtn></>}
      >
        {edit && (
          <div className="space-y-5">
            <Field label="Promo Code">
              <AdminInput
                value={edit.code ?? ""}
                placeholder="e.g. SAVE20, RIDER10"
                onChange={(e) => setEdit({ ...edit, code: e.target.value.toUpperCase() })}
                className="font-mono tracking-wider uppercase"
              />
              <p className="text-[10px] text-zinc-500 mt-1">Code will be automatically uppercased</p>
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Discount Type">
                <AdminSelect value={edit.discount_type ?? "percent"} onChange={(e) => setEdit({ ...edit, discount_type: e.target.value as any })}>
                  <option value="percent">Percentage (%)</option>
                  <option value="fixed">Fixed Amount (Rs)</option>
                </AdminSelect>
              </Field>
              <Field label={edit.discount_type === "percent" ? "Discount (%)" : "Discount Amount (Rs)"}>
                <AdminInput
                  type="number"
                  step="0.01"
                  min="0"
                  value={String(edit.discount_value ?? "")}
                  onChange={(e) => setEdit({ ...edit, discount_value: Number(e.target.value) })}
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Min Order Subtotal (Rs)">
                <AdminInput
                  type="number"
                  step="0.01"
                  min="0"
                  value={String(edit.min_order_subtotal ?? 0)}
                  placeholder="0 for no minimum"
                  onChange={(e) => setEdit({ ...edit, min_order_subtotal: Number(e.target.value) })}
                />
              </Field>
              {edit.discount_type === "percent" && (
                <Field label="Max Discount Cap (Rs)">
                  <AdminInput
                    type="number"
                    step="0.01"
                    min="0"
                    value={edit.max_discount != null ? String(edit.max_discount) : ""}
                    placeholder="No cap"
                    onChange={(e) => setEdit({ ...edit, max_discount: e.target.value ? Number(e.target.value) : null })}
                  />
                </Field>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Usage Limit">
                <AdminInput
                  type="number"
                  min="0"
                  value={edit.usage_limit != null ? String(edit.usage_limit) : ""}
                  placeholder="Unlimited"
                  onChange={(e) => setEdit({ ...edit, usage_limit: e.target.value ? Number(e.target.value) : null })}
                />
                <p className="text-[10px] text-zinc-500 mt-1">Leave empty for unlimited uses</p>
              </Field>
              <Field label="Expires At">
                <AdminInput
                  type="datetime-local"
                  value={edit.expires_at ? new Date(edit.expires_at).toISOString().slice(0, 16) : ""}
                  onChange={(e) => setEdit({ ...edit, expires_at: e.target.value ? new Date(e.target.value).toISOString() : null })}
                />
                <p className="text-[10px] text-zinc-500 mt-1">Leave empty for no expiry</p>
              </Field>
            </div>

            {edit.id && (
              <div className="bg-zinc-900 border border-zinc-800 rounded p-3">
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-500">Times used</span>
                  <span className="font-mono text-zinc-300 font-bold">{edit.usage_count ?? 0}</span>
                </div>
              </div>
            )}

            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={edit.is_active !== false} onChange={(e) => setEdit({ ...edit, is_active: e.target.checked })} className="accent-orange-500" />
              Active
            </label>
          </div>
        )}
      </EntityDrawer>
    </div>
  );
}
