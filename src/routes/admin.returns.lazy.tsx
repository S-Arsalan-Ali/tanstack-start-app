import { createLazyFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { EntityDrawer, Field, AdminInput, AdminSelect, AdminTextarea, PrimaryBtn, GhostBtn } from "@/components/admin/EntityDrawer";
import { fmtMoney, fmtDateTime, statusColor } from "@/lib/admin-utils";
import { toast } from "sonner";
import { useConfirm } from "@/components/admin/ConfirmDialog";

export const Route = createLazyFileRoute("/admin/returns")({
  component: Returns,
});

const RET_ST = ["requested", "approved", "received", "refunded", "rejected"];

function Returns() {
  const [rows, setRows] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<any | null>(null);
  const [original, setOriginal] = useState<any | null>(null);
  const confirm = useConfirm();

  const load = async () => {
    setLoading(true);
    const [{ data: r }, { data: o }] = await Promise.all([
      supabase.from("returns").select("*, orders(number, customer_name, total)").order("created_at", { ascending: false }),
      supabase.from("orders").select("id, number, customer_name, total").order("created_at", { ascending: false }).limit(200),
    ]);
    setRows(r ?? []); setOrders(o ?? []); setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!edit?.order_id) return toast.error("Order required");
    const payload = {
      order_id: edit.order_id,
      reason: edit.reason ?? null,
      notes: edit.notes ?? null,
      status: edit.status ?? "requested",
      refund_amount: edit.refund_amount ? Number(edit.refund_amount) : null,
    };
    const { error } = edit.id
      ? await supabase.from("returns").update(payload).eq("id", edit.id)
      : await supabase.from("returns").insert(payload);
    if (error) return toast.error(error.message);

    // When marked refunded, update related order payment_status
    if (payload.status === "refunded") {
      await supabase.from("orders").update({ payment_status: "refunded", status: "returned" }).eq("id", payload.order_id);
    }

    toast.success("Saved");
    setOriginal(null); // Bypass isDirty check on close
    setOpen(false);
    load();
  };

  const isDirty = () => {
    if (!edit || !original) return false;
    return (
      edit.order_id !== original.order_id ||
      edit.reason !== original.reason ||
      edit.notes !== original.notes ||
      edit.status !== original.status ||
      edit.refund_amount !== original.refund_amount
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

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-zinc-500">{rows.length} returns</p>
        <PrimaryBtn onClick={() => {
          const fresh = { status: "requested", order_id: "", reason: "", notes: "", refund_amount: "" };
          setEdit(fresh);
          setOriginal(fresh);
          setOpen(true);
        }}><Plus className="size-4 inline mr-1" /> New return</PrimaryBtn>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded overflow-hidden">
        {loading ? <div className="p-12 text-center"><Loader2 className="size-6 animate-spin text-orange-500 mx-auto" /></div>
        : rows.length === 0 ? <div className="p-12 text-center text-zinc-500">No returns.</div>
        : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead className="text-xs uppercase text-zinc-500 border-b border-zinc-800">
                <tr>
                  <th className="text-left p-3">Order</th>
                  <th className="text-left p-3">Customer</th>
                  <th className="text-left p-3">Reason</th>
                  <th className="text-left p-3">Status</th>
                  <th className="text-right p-3">Refund</th>
                  <th className="text-right p-3">Date</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 cursor-pointer" onClick={() => { setEdit({ ...r }); setOriginal({ ...r }); setOpen(true); }}>
                    <td className="p-3 font-mono text-xs">{r.orders?.number ?? "—"}</td>
                    <td className="p-3">{r.orders?.customer_name ?? "—"}</td>
                    <td className="p-3 text-zinc-400 truncate max-w-[200px]">{r.reason ?? "—"}</td>
                    <td className="p-3"><span className={`inline-block px-2 py-0.5 rounded text-[10px] uppercase border ${statusColor(r.status)}`}>{r.status}</span></td>
                    <td className="p-3 text-right">{r.refund_amount ? fmtMoney(r.refund_amount) : "—"}</td>
                    <td className="p-3 text-right text-xs text-zinc-500">{fmtDateTime(r.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <EntityDrawer
        open={open} onOpenChange={handleClose}
        title={edit?.id ? "Edit return" : "New return"}
        footer={<><GhostBtn onClick={() => handleClose(false)}>Cancel</GhostBtn><PrimaryBtn onClick={save}>Save</PrimaryBtn></>}
      >
        {edit && (
          <div className="space-y-4">
            <Field label="Order">
              <AdminSelect value={edit.order_id ?? ""} onChange={(e) => setEdit({ ...edit, order_id: e.target.value })}>
                <option value="">— select order —</option>
                {orders.map((o) => <option key={o.id} value={o.id}>{o.number} — {o.customer_name ?? "—"} ({fmtMoney(o.total)})</option>)}
              </AdminSelect>
            </Field>
            <Field label="Reason"><AdminTextarea rows={3} value={edit.reason ?? ""} onChange={(e) => setEdit({ ...edit, reason: e.target.value })} /></Field>
            <Field label="Internal notes"><AdminTextarea rows={3} value={edit.notes ?? ""} onChange={(e) => setEdit({ ...edit, notes: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Status">
                <AdminSelect value={edit.status ?? "requested"} onChange={(e) => setEdit({ ...edit, status: e.target.value })}>
                  {RET_ST.map((s) => <option key={s} value={s}>{s}</option>)}
                </AdminSelect>
              </Field>
              <Field label="Refund amount"><AdminInput type="number" step="0.01" value={String(edit.refund_amount ?? "")} onChange={(e) => setEdit({ ...edit, refund_amount: e.target.value })} /></Field>
            </div>
            {edit.status === "refunded" && (
              <p className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded p-3">
                Saving with status "refunded" will mark the linked order as refunded/returned.
              </p>
            )}
          </div>
        )}
      </EntityDrawer>
    </div>
  );
}
