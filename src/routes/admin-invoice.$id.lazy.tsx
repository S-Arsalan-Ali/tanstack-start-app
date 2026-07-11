import { createLazyFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Printer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createLazyFileRoute("/admin-invoice/$id")({
  component: InvoicePage,
});

function InvoicePage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [store, setStore] = useState<any>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      // 1. Verify Authentication & Role
      const { data: { session } } = await supabase.auth.getSession();
      if (cancelled) return;

      if (!session?.user) {
        toastError("Session expired or missing. Please sign in.");
        navigate({ to: "/login", search: { redirect: `/admin-invoice/${id}` } });
        return;
      }

      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id);

      if (cancelled) return;

      const roleList = (roles ?? []).map((r) => r.role);
      if (!roleList.includes("admin") && !roleList.includes("staff")) {
        setErrorMsg("Access Denied: You do not have permissions to view this invoice.");
        setAuthChecking(false);
        return;
      }

      setAuthChecking(false);

      // 2. Fetch Invoice Data
      try {
        const [oRes, itRes, sRes] = await Promise.all([
          supabase.from("orders").select("*").eq("id", id).maybeSingle(),
          supabase.from("order_items").select("*").eq("order_id", id),
          supabase.from("settings").select("*").limit(1).maybeSingle(),
        ]);

        if (cancelled) return;

        if (oRes.error) throw new Error(`Orders fetch error: ${oRes.error.message}`);
        if (!oRes.data) throw new Error("Order not found");

        setOrder(oRes.data);
        setItems(itRes.data ?? []);
        setStore(sRes.data ?? {
          store_name: "MotoHelm",
          store_address: "Karachi, Pakistan",
          store_email: "support@motohelm.com",
          store_phone: "0300-1234567",
          currency_symbol: "Rs"
        });
        
        setTimeout(() => {
          if (!cancelled) window.print();
        }, 500);
      } catch (err: any) {
        console.error(err);
        setErrorMsg(err.message || "Failed to load invoice details");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id, navigate]);

  function toastError(msg: string) {
    console.error(msg);
  }

  if (authChecking) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center gap-4">
        <Loader2 className="size-8 animate-spin text-orange-500" />
        <p className="text-xs text-zinc-500 font-mono">Verifying admin access…</p>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4 text-red-500 font-mono text-sm">
        Error: {errorMsg}
      </div>
    );
  }

  if (!order || !store) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="size-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  const sym = store.currency_symbol ?? "Rs.";
  const m = (n: number) => `${sym}${Number(n).toFixed(2)}`;
  const addr = (a: any) => {
    if (!a) return "—";
    const streetStr = a.line1 || a.street || "";
    const street2Str = a.line2 || "";
    const zipStr = a.postal_code || a.zip || "";
    return [streetStr, street2Str, a.city, a.state, zipStr, a.country].filter(Boolean).join(", ");
  };

  const fmtDate = (dStr: string) => {
    const d = new Date(dStr);
    const date = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${date}/${month}/${year}`;
  };

  return (
    <div className="min-h-screen bg-white text-zinc-900 p-8 print:p-0">
      <style>{`@media print { .no-print { display: none } body { background: white } }`}</style>
      <div className="max-w-3xl mx-auto flex flex-col min-h-[25cm] justify-between">
        <div>
          <div className="no-print mb-4 flex gap-2">
            <button onClick={() => window.print()} className="px-4 py-2 bg-zinc-900 text-white text-sm rounded inline-flex items-center gap-2">
              <Printer className="size-4" /> Print
            </button>
            <button onClick={() => window.close()} className="px-4 py-2 border border-zinc-300 text-sm rounded">
              Close
            </button>
          </div>

          <div className="flex flex-col items-center text-center border-b pb-6 mb-6">
            {store.logo_url ? (
              <img src={store.logo_url} alt={store.store_name} className="h-16 object-contain mb-3" />
            ) : (
              <h1 className="text-3xl font-extrabold tracking-wider uppercase text-zinc-900 mb-2">{store.store_name}</h1>
            )}
            {store.logo_url && (
              <h1 className="text-xl font-bold tracking-tight text-zinc-800 mb-1">{store.store_name}</h1>
            )}
            <p className="text-xs text-zinc-500 max-w-md leading-relaxed">{store.store_address}</p>
            <p className="text-xs text-zinc-500 mt-1 font-mono">
              {store.store_email} {store.store_phone && `· ${store.store_phone}`}
            </p>
          </div>

          <div className="text-center pb-4 mb-6 border-b border-zinc-200">
            <h2 className="text-2xl font-extrabold tracking-widest uppercase text-zinc-900">INVOICE</h2>
          </div>

          {/* Invoice Metadata & Addresses Grid */}
          <div className="grid grid-cols-3 gap-0 border-b pb-6 mb-6 text-sm">
            <div className="pr-6 border-r border-zinc-200">
              <h3 className="text-xs uppercase tracking-wider text-zinc-400 font-extrabold font-mono mb-2">Invoice Info</h3>
              <div className="space-y-1">
                <p className="font-mono text-zinc-900 font-bold">No: #{order.number}</p>
                <p className="text-zinc-650 text-xs">Date: {fmtDate(order.created_at)}</p>
                <div className="pt-1.5">
                  <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 border rounded-sm ${
                    order.payment_status === "paid"
                      ? "bg-green-50 border-green-200 text-green-700"
                      : order.payment_status === "failed"
                      ? "bg-red-50 border-red-200 text-red-700"
                      : "bg-zinc-100 border-zinc-200 text-zinc-700"
                  }`}>
                    {order.payment_status} · {order.payment_mode}
                  </span>
                </div>
              </div>
            </div>
            <div className="px-6 border-r border-zinc-200">
              <h3 className="text-xs uppercase tracking-wider text-zinc-400 font-extrabold font-mono mb-2">Bill To</h3>
              <p className="font-semibold text-zinc-800">{order.customer_name}</p>
              <p className="text-xs text-zinc-500 font-mono mt-0.5">{order.customer_email}</p>
              {order.shipping_address?.phone && (
                <p className="text-xs text-zinc-500 font-mono mt-0.5">{order.shipping_address.phone}</p>
              )}
              <p className="text-xs text-zinc-500 mt-1.5 leading-relaxed">{addr(order.billing_address)}</p>
            </div>
            <div className="pl-6">
              <h3 className="text-xs uppercase tracking-wider text-zinc-400 font-extrabold font-mono mb-2">Ship To</h3>
              <p className="text-xs text-zinc-550 leading-relaxed">{addr(order.shipping_address)}</p>
              {(order.tracking || order.courier_name || order.tracking_url) && (
                <div className="mt-2 text-xs space-y-0.5">
                  {order.courier_name && <p className="text-zinc-500 font-semibold font-mono text-[10px]">Courier: <span className="text-zinc-800 font-sans text-xs">{order.courier_name}</span></p>}
                  {order.tracking && <p className="text-zinc-500 font-semibold font-mono text-[10px]">Tracking: <span className="font-mono text-zinc-800 text-xs">{order.tracking}</span></p>}
                  {order.tracking_url && (
                    <p className="text-zinc-500 font-semibold font-mono text-[10px] break-all">
                      Link:{" "}
                      <a href={order.tracking_url} target="_blank" rel="noopener noreferrer" className="text-zinc-800 hover:text-orange-600 underline font-sans text-xs break-all">
                        {order.tracking_url}
                      </a>
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          <table className="w-full mb-6 text-sm" style={{ tableLayout: "fixed" }}>
            <thead className="bg-zinc-900 text-white text-xs uppercase font-mono">
              <tr>
                <th className="text-left p-3" style={{ width: "45%", textAlign: "left" }}>Item</th>
                <th className="text-center p-3" style={{ width: "15%", textAlign: "center" }}>Qty</th>
                <th className="text-center p-3" style={{ width: "20%", textAlign: "center" }}>Unit</th>
                <th className="text-right p-3" style={{ width: "20%", textAlign: "right" }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.id} className="border-b">
                  <td className="p-3" style={{ width: "45%", textAlign: "left" }}>
                    <div className="font-medium text-zinc-800">{it.name_snapshot}</div>
                    {(it.size || it.color) && <div className="text-xs text-zinc-500 mt-0.5">{[it.size, it.color].filter(Boolean).join(" / ")}</div>}
                  </td>
                  <td className="p-3 text-center text-zinc-700 font-mono" style={{ width: "15%", textAlign: "center" }}>{it.qty}</td>
                  <td className="p-3 text-center text-zinc-700 font-mono" style={{ width: "20%", textAlign: "center" }}>{m(it.unit_price)}</td>
                  <td className="p-3 text-right text-zinc-800 font-bold font-mono" style={{ width: "20%", textAlign: "right" }}>{m(it.line_total)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex justify-end">
            <div className="w-72 space-y-1 text-sm">
              <Row label="Subtotal" value={m(order.subtotal)} />
              {order.discount > 0 && <Row label="Discount" value={`-${m(order.discount)}`} />}
              {order.tax > 0 && <Row label="Tax" value={m(order.tax)} />}
              <Row label="Shipping" value={m(order.shipping)} />
              <div className="border-t border-zinc-900 pt-2 mt-2">
                <Row label="TOTAL" value={m(order.total)} bold />
              </div>
            </div>
          </div>
        </div>

        {/* Invoice Terms & Conditions and Signature Section */}
        <div className="mt-16 border-t pt-6 space-y-8 print:break-inside-avoid">
          <div className="space-y-2">
            <h4 className="text-[10px] uppercase tracking-wider text-zinc-400 font-extrabold font-mono">Terms & Conditions</h4>
            {store.invoice_terms ? (
              <p className="text-[10px] text-zinc-500 whitespace-pre-line leading-relaxed font-mono">
                {store.invoice_terms}
              </p>
            ) : (
              <p className="text-[10px] text-zinc-400 font-mono">Thank you for your purchase!</p>
            )}
          </div>
          
          <div className="flex flex-col items-center justify-center gap-2 text-center border-t border-dashed border-zinc-100 pt-6">
            {store.stamp_url && (
              <img 
                src={store.stamp_url} 
                alt="Store Stamp" 
                className="h-20 w-20 object-contain opacity-85 print:opacity-100 mb-2" 
              />
            )}
            <div className="font-mono text-[9px] text-zinc-500 uppercase tracking-wider text-center">
              <p className="font-extrabold text-zinc-700">Computer Generated Invoice</p>
              <p className="mt-0.5 text-zinc-500">No physical signature required.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? "text-lg font-bold" : ""}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
