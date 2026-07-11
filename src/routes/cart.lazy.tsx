import { createLazyFileRoute, Link } from "@tanstack/react-router";
import { Plus, Minus, X, ShoppingBag } from "lucide-react";
import { useShop } from "@/store/shop";
import { useQuery } from "@tanstack/react-query";
import { settingsQuery } from "@/lib/catalog-queries";

export const Route = createLazyFileRoute("/cart")({
  component: CartPage,
});

function CartPage() {
  const cart = useShop((s) => s.cart);
  const update = useShop((s) => s.updateQty);
  const remove = useShop((s) => s.removeFromCart);

  const { data: settings } = useQuery(settingsQuery());
  const symbol = settings?.currency_symbol ?? "Rs.";
  const taxRate = settings?.tax_rate ? settings.tax_rate / 100 : 0.08;
  const threshold = settings?.free_shipping_threshold ?? 20000;
  const flatShipping = settings?.shipping_flat ?? 150;
  const isFreeShippingEnabled = settings?.free_shipping_enabled !== false;

  const subtotal = cart.reduce((a, c) => a + c.price * c.qty, 0);
  const shipping = (isFreeShippingEnabled && subtotal >= threshold) || subtotal === 0 ? 0 : flatShipping;
  const tax = subtotal * taxRate;
  const total = subtotal + shipping + tax;

  return (
    <section className="pt-24 md:pt-28 pb-24 mx-auto max-w-[1600px] px-4 md:px-8">
      <p className="font-mono text-xs uppercase tracking-[0.3em] text-primary">Your Garage</p>
      <h1 className="font-display text-5xl md:text-7xl tracking-tight mt-2">YOUR CART</h1>

      {cart.length === 0 ? (
        <div className="mt-20 text-center py-20 border border-border">
          <ShoppingBag className="size-12 mx-auto text-muted-foreground mb-4" />
          <p className="font-display text-2xl mb-2">YOUR CART IS EMPTY</p>
          <p className="text-muted-foreground mb-6">Time to gear up for the next ride.</p>
          <Link to="/shop" className="inline-flex px-6 py-3 bg-primary text-primary-foreground font-mono text-xs uppercase tracking-[0.2em]">Shop Helmets</Link>
        </div>
      ) : (
        <div className="mt-12 grid lg:grid-cols-[1fr_400px] gap-12">
          <div>
            {cart.map((item) => (
              <div key={`${item.id}-${item.color}-${item.size}`} className="flex gap-4 md:gap-6 py-6 border-b border-border">
                <Link to="/product/$slug" params={{ slug: item.slug }} className="size-24 md:size-32 bg-surface shrink-0 overflow-hidden">
                  <img src={item.image} alt={item.name} className="size-full object-cover" />
                </Link>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between gap-3">
                    <div>
                      <h3 className="font-display text-xl md:text-2xl">{item.name}</h3>
                      <p className="font-mono text-xs text-muted-foreground mt-1 uppercase tracking-wider">{item.color} · Size {item.size}</p>
                    </div>
                    <button onClick={() => remove(item.id, item.color, item.size)} className="text-muted-foreground hover:text-destructive shrink-0">
                      <X className="size-5" />
                    </button>
                  </div>
                  <div className="flex justify-between items-end mt-6">
                    <div className="flex items-center border border-border">
                      <button onClick={() => update(item.id, item.color, item.size, item.qty - 1)} className="size-9 grid place-items-center hover:bg-surface"><Minus className="size-3.5" /></button>
                      <span className="w-10 text-center font-mono text-sm">{item.qty}</span>
                      <button onClick={() => update(item.id, item.color, item.size, item.qty + 1)} className="size-9 grid place-items-center hover:bg-surface"><Plus className="size-3.5" /></button>
                    </div>
                    <p className="font-mono font-bold text-lg">{symbol}{(item.price * item.qty).toFixed(0)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <aside className="lg:sticky lg:top-24 self-start border border-border p-6 bg-surface/30 h-fit">
            <h2 className="font-display text-2xl mb-6">SUMMARY</h2>
            <div className="space-y-3 text-sm">
              <Row label="Subtotal" value={`${symbol}${subtotal.toFixed(2)}`} />
              <Row label="Shipping" value={shipping === 0 ? "FREE" : `${symbol}${shipping.toFixed(2)}`} />
              <Row label="Estimated tax" value={`${symbol}${tax.toFixed(2)}`} />
              <div className="h-px bg-border my-4" />
              <Row label="Total" value={`${symbol}${total.toFixed(2)}`} large />
            </div>
            <Link to="/checkout" className="block w-full mt-6 py-4 bg-primary text-primary-foreground text-center font-mono text-xs uppercase tracking-[0.2em] font-bold hover:bg-primary-glow transition-colors">
              Checkout
            </Link>
            <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider mt-4 text-center">Secure SSL encryption</p>
          </aside>
        </div>
      )}
    </section>
  );
}

function Row({ label, value, large }: { label: string; value: string; large?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className={large ? "font-mono uppercase tracking-wider" : "text-muted-foreground"}>{label}</span>
      <span className={`font-mono ${large ? "text-xl font-bold" : ""}`}>{value}</span>
    </div>
  );
}
