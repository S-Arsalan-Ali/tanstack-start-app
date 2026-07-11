import { createLazyFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Loader2, Eye, FileText, Download, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { EntityDrawer, Field, AdminInput, AdminSelect, PrimaryBtn, GhostBtn } from "@/components/admin/EntityDrawer";
import { fmtMoney, fmtDateTime, statusColor, logActivity } from "@/lib/admin-utils";
import { toast } from "sonner";
import { useConfirm } from "@/components/admin/ConfirmDialog";

export const Route = createLazyFileRoute("/admin/orders")({ component: Orders });

const ORDER_ST = ["pending", "processing", "packed", "shipped", "delivered", "cancelled", "returned"];
const PAY_ST = ["pending", "paid", "refunded", "failed"];
const PAY_MODE = ["cod", "easypaisa", "jazzcash", "bank"];
const SHIP_ST = ["pending", "label_created", "in_transit", "delivered"];

function Orders() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [detail, setDetail] = useState<any | null>(null);
  const [items, setItems] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const confirm = useConfirm();

  // Manual customer notifications state
  const [notifyChannel, setNotifyChannel] = useState<"both" | "email" | "whatsapp">("both");
  const [notifyTemplate, setNotifyTemplate] = useState("");
  const [notifyMessage, setNotifyMessage] = useState("");
  const [sendingNotification, setSendingNotification] = useState(false);

  const load = async () => {
    setLoading(true);
    const [{ data }, { data: sess }] = await Promise.all([
      supabase.from("orders").select("*").order("created_at", { ascending: false }),
      supabase.auth.getSession(),
    ]);
    setRows(data ?? []);
    
    const uid = sess.session?.user.id;
    if (uid) {
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", uid);
      const roleList = (roles ?? []).map(r => r.role);
      setIsAdmin(roleList.includes("admin"));
    }
    
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!openId) {
      setDetail(null);
      setItems([]);
      setNotifyTemplate("");
      setNotifyMessage("");
      return;
    }
    (async () => {
      const [{ data: o }, { data: it }] = await Promise.all([
        supabase.from("orders").select("*").eq("id", openId).single(),
        supabase.from("order_items").select("*").eq("order_id", openId),
      ]);
      setDetail(o); setItems(it ?? []);
      setNotifyTemplate("");
      setNotifyMessage("");
    })();
  }, [openId]);

  const filtered = useMemo(() => rows.filter((r) =>
    (!q || r.number.toLowerCase().includes(q.toLowerCase()) || (r.customer_name ?? "").toLowerCase().includes(q.toLowerCase())) &&
    (!statusFilter || r.status === statusFilter)
  ), [rows, q, statusFilter]);

  const updateOrder = async (patch: any) => {
    if (!detail) return;
    const { data, error } = await supabase
      .from("orders")
      .update(patch)
      .eq("id", detail.id)
      .select()
      .single();
      
    if (error) return toast.error(error.message);
    setDetail(data);
    setRows((prev) => prev.map((r) => r.id === detail.id ? data : r));
    toast.success("Updated");
    logActivity("UPDATE_ORDER", detail.id, { patch });
  };

  const declinePayment = async () => {
    if (!detail) return;
    const reason = window.prompt("Enter payment decline reason (sent to customer):", "Transaction Reference not found in bank statement.");
    if (reason === null) return;
    const finalReason = reason.trim() || "Invalid transaction reference or receipt screenshot.";

    const { data, error } = await supabase
      .from("orders")
      .update({ payment_status: "failed" })
      .eq("id", detail.id)
      .select()
      .single();

    if (error) return toast.error(error.message);

    const { data: { session } } = await supabase.auth.getSession();
    await supabase.from("order_status_history").insert({
      order_id: detail.id,
      status: data.status,
      notes: `Payment Declined: ${finalReason} (Email/WhatsApp notifications sent to customer)`,
      changed_by: session?.user?.id || null
    });

    setDetail(data);
    setRows((prev) => prev.map((r) => r.id === detail.id ? data : r));
    toast.success("Payment declined and customer notified");
    logActivity("DECLINE_PAYMENT", detail.id, { reason: finalReason });
  };

  const cancelOrderAction = async () => {
    if (!detail) return;
    const ok = await confirm({
      title: "Cancel Order",
      message: `Are you sure you want to cancel order #${detail.number}? This will notify the customer.`,
      confirmText: "Cancel Order",
      variant: "destructive",
    });
    if (!ok) return;

    const { data, error } = await supabase
      .from("orders")
      .update({ status: "cancelled", payment_status: detail.payment_status === "paid" ? "refunded" : "failed" })
      .eq("id", detail.id)
      .select()
      .single();

    if (error) return toast.error(error.message);

    const { data: { session } } = await supabase.auth.getSession();
    await supabase.from("order_status_history").insert({
      order_id: detail.id,
      status: "cancelled",
      notes: "Order cancelled by admin. Alert dispatched to customer.",
      changed_by: session?.user?.id || null
    });

    setDetail(data);
    setRows((prev) => prev.map((r) => r.id === detail.id ? data : r));
    toast.success("Order cancelled");
    logActivity("CANCEL_ORDER", detail.id, {});
  };

  const deleteOrderAction = async () => {
    if (!detail) return;
    const ok = await confirm({
      title: "Delete Order",
      message: `Are you sure you want to PERMANENTLY delete order #${detail.number}? This action cannot be undone.`,
      confirmText: "Delete",
      variant: "destructive",
    });
    if (!ok) return;

    const { error } = await supabase
      .from("orders")
      .delete()
      .eq("id", detail.id);

    if (error) return toast.error(error.message);

    setRows((prev) => prev.filter((r) => r.id !== detail.id));
    setOpenId(null);
    toast.success("Order deleted permanently");
    logActivity("DELETE_ORDER", detail.id, { order_number: detail.number });
  };

  const handleTemplateChange = (val: string) => {
    setNotifyTemplate(val);
    if (!detail) return;
    
    if (val === "order_confirm") {
      setNotifyMessage(`Thank you for your order #${detail.number}! It has been successfully logged and is currently pending verification.`);
    } else if (val === "payment_confirm") {
      setNotifyMessage(`We have successfully received and verified your payment of Rs.${Number(detail.total).toLocaleString()} for order #${detail.number}. Your order is now processing and being packed.`);
    } else if (val === "payment_fail") {
      setNotifyMessage(`We were unable to verify your payment transaction for order #${detail.number}. Please check your reference ID or re-submit a clear screenshot of the transfer proof.`);
    } else if (val === "shipping_track") {
      const courierStr = detail.courier_name ? ` via ${detail.courier_name}` : "";
      const trackingStr = detail.tracking ? `Your tracking number is ${detail.tracking}.` : "Your tracking number is MH-TRK-PENDING.";
      const linkStr = detail.tracking_url ? ` Track your package here: ${detail.tracking_url}` : "";
      setNotifyMessage(`Great news! Your MotoHelm order #${detail.number} has been shipped${courierStr}. ${trackingStr}${linkStr} You can track it inside your account profile page.`);
    } else if (val === "custom") {
      setNotifyMessage("");
    }
  };

  const cleanPhoneNumber = (phone: string | null | undefined): string => {
    if (!phone) return "";
    let cleaned = phone.replace(/\D/g, "");
    if (cleaned.startsWith("0") && cleaned.length === 11) {
      cleaned = "92" + cleaned.substring(1);
    } else if (cleaned.length === 10 && cleaned.startsWith("3")) {
      cleaned = "92" + cleaned;
    }
    return cleaned;
  };

  const sendManualNotification = async () => {
    if (!detail) return;
    if (!notifyMessage.trim()) {
      return toast.error("Please enter a message to send.");
    }

    const email = detail.customer_email || "";
    const rawPhone = detail.shipping_address?.phone || "";
    const phone = cleanPhoneNumber(rawPhone);

    if ((notifyChannel === "whatsapp" || notifyChannel === "both") && !phone) {
      return toast.error("Customer phone number is missing. Cannot open WhatsApp.");
    }
    if ((notifyChannel === "email" || notifyChannel === "both") && !email) {
      return toast.error("Customer email is missing. Cannot open Email.");
    }

    setSendingNotification(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const channelLabel = notifyChannel === "both" ? "Email & WhatsApp" : notifyChannel === "email" ? "Email" : "WhatsApp";
      const notesMsg = notifyMessage.trim();

      const { error } = await supabase.from("order_status_history").insert({
        order_id: detail.id,
        status: detail.status,
        notes: notesMsg,
        changed_by: session?.user?.id || null
      });

      if (error) throw error;

      const encodedMsg = encodeURIComponent(notifyMessage.trim());
      const encodedSubject = encodeURIComponent(`Order #${detail.number} Update - MotoHelm`);

      if (notifyChannel === "whatsapp") {
        window.open(`https://wa.me/${phone}?text=${encodedMsg}`, "_blank");
      } else if (notifyChannel === "email") {
        window.open(`mailto:${email}?subject=${encodedSubject}&body=${encodedMsg}`, "_blank");
      } else if (notifyChannel === "both") {
        // Open WhatsApp in new tab
        window.open(`https://wa.me/${phone}?text=${encodedMsg}`, "_blank");
        // Open native mail app in current window context
        setTimeout(() => {
          window.location.href = `mailto:${email}?subject=${encodedSubject}&body=${encodedMsg}`;
        }, 300);
      }

      toast.success(`Message logged and client opened for ${channelLabel}!`);
      setNotifyTemplate("");
      setNotifyMessage("");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to log manual notification.");
    } finally {
      setSendingNotification(false);
    }
  };

  const downloadPdf = async () => {
    if (!detail) return;
    const { data: s } = await supabase.from("settings").select("*").limit(1).maybeSingle();
    const { buildInvoicePdf } = await import("@/lib/invoice");
    const doc = await buildInvoicePdf({
      store: {
        name: s?.store_name ?? "MotoHelm",
        email: s?.store_email ?? "support@motohelm.com",
        phone: s?.store_phone ?? "0300-1234567",
        address: s?.store_address ?? "Karachi, Pakistan",
        currencySymbol: s?.currency_symbol ?? "Rs",
        invoice_terms: s?.invoice_terms,
        logoUrl: s?.logo_url,
        stampUrl: s?.stamp_url,
      },
      order: detail,
      items,
    });
    doc.save(`invoice-${detail.number}.pdf`);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 max-w-xs">
          <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <AdminInput placeholder="Search order # or customer..." value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
        </div>
        <AdminSelect value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="max-w-[160px]">
          <option value="">All status</option>{ORDER_ST.map((s) => <option key={s} value={s}>{s}</option>)}
        </AdminSelect>
        <p className="text-sm text-zinc-500 ml-auto">{filtered.length} orders</p>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded overflow-hidden">
        {loading ? <div className="p-12 text-center"><Loader2 className="size-6 animate-spin text-orange-500 mx-auto" /></div>
        : filtered.length === 0 ? <div className="p-12 text-center text-zinc-500">No orders yet.</div>
        : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[800px]">
              <thead className="text-xs uppercase text-zinc-500 border-b border-zinc-800">
                <tr>
                  <th className="text-left p-3">Order</th>
                  <th className="text-left p-3">Customer</th>
                  <th className="text-left p-3">Status</th>
                  <th className="text-left p-3">Payment</th>
                  <th className="text-left p-3">Shipping</th>
                  <th className="text-right p-3">Total</th>
                  <th className="text-right p-3">Date</th>
                  <th className="p-3 w-12"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 cursor-pointer" onClick={() => setOpenId(r.id)}>
                    <td className="p-3 font-mono text-xs">{r.number}</td>
                    <td className="p-3">
                      <div>{r.customer_name ?? "—"}</div>
                      <div className="text-xs text-zinc-500">{r.customer_email}</div>
                      {r.shipping_address?.phone && (
                        <div className="text-[10px] text-zinc-400 font-mono mt-0.5">{r.shipping_address.phone}</div>
                      )}
                    </td>
                    <td className="p-3"><span className={`inline-block px-2 py-0.5 rounded text-[10px] uppercase border ${statusColor(r.status)}`}>{r.status}</span></td>
                    <td className="p-3"><span className={`inline-block px-2 py-0.5 rounded text-[10px] uppercase border ${statusColor(r.payment_status)}`}>{r.payment_status}</span></td>
                    <td className="p-3">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] uppercase border ${statusColor(r.shipping_status)}`}>
                        {r.shipping_status}
                      </span>
                      {r.tracking && (
                        <div className="text-xs font-mono text-orange-400 mt-1">
                          {r.courier_name ? `${r.courier_name}: ` : ""}{r.tracking}
                        </div>
                      )}
                    </td>
                    <td className="p-3 text-right">{fmtMoney(r.total)}</td>
                    <td className="p-3 text-right text-xs text-zinc-500">{fmtDateTime(r.created_at)}</td>
                    <td className="p-3"><Eye className="size-4 text-zinc-500" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <EntityDrawer
        open={!!openId} onOpenChange={(o) => !o && setOpenId(null)}
        title={detail ? `Order ${detail.number}` : "Order"}
        width="md:max-w-3xl"
        footer={detail ? (
          <>
            <Link to="/admin-invoice/$id" params={{ id: detail.id }} target="_blank" className="border border-zinc-700 hover:bg-zinc-800 text-zinc-300 px-4 py-2 text-xs uppercase tracking-wider rounded inline-flex items-center gap-1.5">
              <FileText className="size-4" /> Print invoice
            </Link>
            <GhostBtn onClick={downloadPdf}><Download className="size-4 inline mr-1.5" />PDF</GhostBtn>
            <PrimaryBtn onClick={() => setOpenId(null)}>Close</PrimaryBtn>
          </>
        ) : null}
      >
        {!detail ? <Loader2 className="size-6 animate-spin text-orange-500 mx-auto mt-12" /> : (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-zinc-900 border border-zinc-800 rounded p-4">
                <h4 className="text-[10px] uppercase tracking-wider text-zinc-400 mb-2">Customer</h4>
                <p className="text-sm">{detail.customer_name ?? "—"}</p>
                <p className="text-xs text-zinc-500">{detail.customer_email}</p>
                {detail.shipping_address?.phone && (
                  <p className="text-xs text-zinc-400 mt-1.5 font-mono">{detail.shipping_address.phone}</p>
                )}
              </div>
              <div className="bg-zinc-900 border border-zinc-800 rounded p-4">
                <h4 className="text-[10px] uppercase tracking-wider text-zinc-400 mb-2">Ship to</h4>
                <p className="text-xs text-zinc-400 whitespace-pre-line">{formatAddr(detail.shipping_address)}</p>
              </div>
            </div>

            {detail.payment_reference && (
              <div className="bg-zinc-900 border border-zinc-800 rounded p-4 space-y-2">
                <h4 className="text-[10px] uppercase tracking-wider text-orange-400 font-bold">Manual Payment Submission</h4>
                <div className="flex flex-col gap-3 md:flex-row md:items-center justify-between">
                  <div>
                    <span className="text-[10px] text-zinc-500 font-mono block">Transaction ID / Reference:</span>
                    <span className="text-sm font-mono font-bold text-foreground bg-zinc-950 px-2 py-1 border border-zinc-800">{detail.payment_reference}</span>
                  </div>
                  {detail.payment_receipt_url && (
                    <a
                      href={detail.payment_receipt_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-black text-xs font-mono font-bold uppercase tracking-wider rounded transition-colors"
                    >
                      View Receipt Screenshot
                    </a>
                  )}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Field label="Payment">
                <AdminSelect value={detail.payment_status} onChange={(e) => updateOrder({ payment_status: e.target.value })}>
                  {PAY_ST.map((s) => <option key={s} value={s}>{s}</option>)}
                </AdminSelect>
              </Field>
              <Field label="Pay mode">
                <AdminSelect value={detail.payment_mode} onChange={(e) => updateOrder({ payment_mode: e.target.value })}>
                  {PAY_MODE.map((s) => <option key={s} value={s}>{s}</option>)}
                </AdminSelect>
              </Field>
              <Field label="Order status">
                <AdminSelect value={detail.status} onChange={(e) => updateOrder({ status: e.target.value })}>
                  {ORDER_ST.map((s) => <option key={s} value={s}>{s}</option>)}
                </AdminSelect>
              </Field>
              <Field label="Shipping">
                <AdminSelect value={detail.shipping_status} onChange={(e) => updateOrder({ shipping_status: e.target.value })}>
                  {SHIP_ST.map((s) => <option key={s} value={s}>{s}</option>)}
                </AdminSelect>
              </Field>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Courier provider">
                <AdminInput
                  key={detail.id + "-" + (detail.courier_name ?? "")}
                  defaultValue={detail.courier_name ?? ""}
                  placeholder="e.g. Leopard, TCS, M&P"
                  onBlur={(e) => e.target.value !== (detail.courier_name ?? "") && updateOrder({ courier_name: e.target.value || null })}
                />
              </Field>
              <Field label="Tracking number">
                <div className="flex gap-2">
                  <AdminInput
                    key={detail.id + "-" + (detail.tracking ?? "")}
                    defaultValue={detail.tracking ?? ""}
                    placeholder="Enter tracking number"
                    onBlur={(e) => e.target.value !== (detail.tracking ?? "") && updateOrder({ tracking: e.target.value || null })}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const randomTrk = `MH-${Math.floor(100000 + Math.random() * 900000)}`;
                      updateOrder({ tracking: randomTrk });
                    }}
                    className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 rounded text-xs font-mono uppercase tracking-wider transition-colors whitespace-nowrap"
                  >
                    Generate
                  </button>
                </div>
              </Field>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <Field label="Tracking link">
                <AdminInput
                  key={detail.id + "-" + (detail.tracking_url ?? "")}
                  defaultValue={detail.tracking_url ?? ""}
                  placeholder="Enter tracking link (e.g. https://track.tcs.com.pk/tracking/mh-12345)"
                  onBlur={(e) => e.target.value !== (detail.tracking_url ?? "") && updateOrder({ tracking_url: e.target.value || null })}
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Applied Tax">
                <AdminInput
                  key={detail.id + "-tax-" + (detail.tax ?? 0)}
                  type="number"
                  defaultValue={detail.tax ?? 0}
                  onBlur={(e) => {
                    const val = Number(e.target.value) || 0;
                    if (val !== detail.tax) {
                      updateOrder({ 
                        tax: val,
                        total: detail.subtotal - detail.discount + val + detail.shipping
                      });
                    }
                  }}
                />
              </Field>
              <Field label="Shipping Fee">
                <AdminInput
                  key={detail.id + "-shipping-" + (detail.shipping ?? 0)}
                  type="number"
                  defaultValue={detail.shipping ?? 0}
                  onBlur={(e) => {
                    const val = Number(e.target.value) || 0;
                    if (val !== detail.shipping) {
                      updateOrder({ 
                        shipping: val,
                        total: detail.subtotal - detail.discount + detail.tax + val
                      });
                    }
                  }}
                />
              </Field>
            </div>

            <div className="bg-zinc-950/40 border border-zinc-800 rounded p-4 space-y-3">
              <h4 className="text-[10px] uppercase tracking-wider text-zinc-400 font-mono">Order Management Actions</h4>
              <div className="flex flex-wrap gap-2">
                {detail.payment_status === "pending" && (
                  <button
                    onClick={declinePayment}
                    className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded text-xs font-mono uppercase tracking-wider transition-colors"
                  >
                    Decline Payment
                  </button>
                )}
                {detail.status !== "cancelled" && (
                  <button
                    onClick={cancelOrderAction}
                    className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 rounded text-xs font-mono uppercase tracking-wider transition-colors"
                  >
                    Cancel Order
                  </button>
                )}
                {isAdmin && (
                  <button
                    onClick={deleteOrderAction}
                    className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-mono uppercase tracking-wider ml-auto transition-colors"
                  >
                    Delete Order
                  </button>
                )}
              </div>
            </div>

            <div className="bg-zinc-950/45 border border-zinc-850 rounded p-4 space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                <h4 className="text-xs uppercase tracking-wider text-orange-400 font-bold font-mono">Send Customer Alert (Manual)</h4>
                <div className="flex gap-2">
                  {(["both", "email", "whatsapp"] as const).map((ch) => (
                    <button
                      key={ch}
                      type="button"
                      onClick={() => setNotifyChannel(ch)}
                      className={`px-2 py-0.5 text-[9px] uppercase font-mono tracking-wider border transition-colors ${
                        notifyChannel === ch
                          ? "bg-orange-500/20 text-orange-400 border-orange-500/40"
                          : "bg-zinc-900 text-zinc-500 border-zinc-800 hover:text-zinc-300"
                      }`}
                    >
                      {ch}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <Field label="Message Template">
                  <AdminSelect value={notifyTemplate} onChange={(e) => handleTemplateChange(e.target.value)}>
                    <option value="">-- Choose Template --</option>
                    <option value="order_confirm">Order Placement Confirmation</option>
                    <option value="payment_confirm">Payment Verified Confirmation</option>
                    <option value="payment_fail">Failed Transaction / Payment Decline</option>
                    <option value="shipping_track">Shipping Update with Tracking #</option>
                    <option value="custom">Custom Message (Blank)</option>
                  </AdminSelect>
                </Field>

                <Field label="Custom Notification Message">
                  <textarea
                    value={notifyMessage}
                    onChange={(e) => setNotifyMessage(e.target.value)}
                    placeholder="Type your notification message here to send to customer profile..."
                    className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-xs font-mono min-h-[85px] focus:outline-none focus:border-orange-500 text-zinc-200"
                  />
                </Field>

                <button
                  type="button"
                  onClick={sendManualNotification}
                  disabled={sendingNotification || !notifyMessage.trim()}
                  className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-zinc-800 disabled:text-zinc-600 text-black py-2 text-xs font-mono uppercase tracking-wider font-bold transition-colors flex items-center justify-center gap-1.5"
                >
                  {sendingNotification ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" /> Dispatched...
                    </>
                  ) : (
                    "Send Notification Alert"
                  )}
                </button>
              </div>
            </div>

            <div>
              <h4 className="text-[10px] uppercase tracking-wider text-zinc-400 mb-2">Line items</h4>
              <div className="bg-zinc-900 border border-zinc-800 rounded overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="text-xs uppercase text-zinc-500 border-b border-zinc-800">
                    <tr><th className="text-left p-2">Item</th><th className="text-right p-2">Qty</th><th className="text-right p-2">Unit</th><th className="text-right p-2">Total</th></tr>
                  </thead>
                  <tbody>
                    {items.map((it) => (
                      <tr key={it.id} className="border-b border-zinc-800/50">
                        <td className="p-2 flex items-center gap-2">
                          {it.image_snapshot && <img src={it.image_snapshot} alt="" className="size-8 rounded object-cover" />}
                          <div>
                            <div>{it.name_snapshot}</div>
                            {(it.size || it.color) && <div className="text-xs text-zinc-500">{[it.size, it.color].filter(Boolean).join(" / ")}</div>}
                          </div>
                        </td>
                        <td className="p-2 text-right">{it.qty}</td>
                        <td className="p-2 text-right">{fmtMoney(it.unit_price)}</td>
                        <td className="p-2 text-right">{fmtMoney(it.line_total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end">
              <div className="w-full md:w-1/2 space-y-1 text-sm">
                <Total label="Subtotal" value={fmtMoney(detail.subtotal)} />
                {detail.discount > 0 && <Total label="Discount" value={`-${fmtMoney(detail.discount)}`} />}
                <Total label="Tax" value={fmtMoney(detail.tax)} />
                <Total label="Shipping" value={fmtMoney(detail.shipping)} />
                <div className="border-t border-zinc-800 pt-2 mt-2"><Total label="Total" value={fmtMoney(detail.total)} bold /></div>
              </div>
            </div>
          </div>
        )}
      </EntityDrawer>
    </div>
  );
}

function Total({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return <div className={`flex justify-between ${bold ? "font-display text-lg text-orange-400" : "text-zinc-400"}`}><span>{label}</span><span>{value}</span></div>;
}

function formatAddr(a: any): string {
  if (!a) return "—";
  return [a.line1, a.line2, a.city, a.state, a.postal_code, a.country].filter(Boolean).join("\n");
}
