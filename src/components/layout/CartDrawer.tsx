import { Link } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Minus, ShoppingBag } from "lucide-react";
import { useShop } from "@/store/shop";
import { useQuery } from "@tanstack/react-query";
import { settingsQuery } from "@/lib/catalog-queries";

export function CartDrawer() {
  const open = useShop((s) => s.cartOpen);
  const setOpen = useShop((s) => s.setCartOpen);
  const cart = useShop((s) => s.cart);
  const update = useShop((s) => s.updateQty);
  const remove = useShop((s) => s.removeFromCart);

  const { data: settings } = useQuery(settingsQuery());
  const symbol = settings?.currency_symbol ?? "Rs.";

  const subtotal = cart.reduce((a, c) => a + c.price * c.qty, 0);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-background/70 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "tween", duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
            className="fixed top-0 right-0 bottom-0 z-[61] w-full max-w-md bg-background border-l border-border flex flex-col"
          >
            <div className="flex items-center justify-between p-6 border-b border-border">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-1">Your Garage</div>
                <h2 className="font-display text-2xl">CART · {cart.length}</h2>
              </div>
              <button onClick={() => setOpen(false)} className="size-10 grid place-items-center hover:bg-surface" aria-label="Close cart">
                <X className="size-5" />
              </button>
            </div>

            {cart.length === 0 ? (
              <div className="flex-1 grid place-items-center text-center p-8">
                <div>
                  <ShoppingBag className="size-12 mx-auto text-muted-foreground mb-4" />
                  <p className="font-display text-xl mb-2">YOUR CART IS EMPTY</p>
                  <p className="text-sm text-muted-foreground mb-6">Time to gear up.</p>
                  <Link
                    to="/shop"
                    onClick={() => setOpen(false)}
                    className="inline-flex items-center justify-center px-6 py-3 bg-primary text-primary-foreground font-mono text-xs uppercase tracking-[0.2em] hover:bg-primary-glow transition-colors"
                  >
                    Shop Helmets
                  </Link>
                </div>
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  {cart.map((item) => (
                    <div key={`${item.id}-${item.color}-${item.size}`} className="flex gap-4 pb-4 border-b border-border">
                      <Link to="/product/$slug" params={{ slug: item.slug }} onClick={() => setOpen(false)} className="size-24 bg-surface shrink-0 grid place-items-center overflow-hidden">
                        <img src={item.image} alt={item.name} className="size-full object-cover" />
                      </Link>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between gap-2">
                          <h3 className="font-display text-base leading-tight">{item.name}</h3>
                          <button onClick={() => remove(item.id, item.color, item.size)} className="text-muted-foreground hover:text-destructive shrink-0" aria-label="Remove">
                            <X className="size-4" />
                          </button>
                        </div>
                        <p className="text-xs text-muted-foreground font-mono mt-1">{item.color} · {item.size}</p>
                        <div className="flex justify-between items-center mt-3">
                          <div className="flex items-center border border-border">
                            <button onClick={() => update(item.id, item.color, item.size, item.qty - 1)} className="size-8 grid place-items-center hover:bg-surface" aria-label="Decrease">
                              <Minus className="size-3" />
                            </button>
                            <span className="w-8 text-center font-mono text-sm">{item.qty}</span>
                            <button onClick={() => update(item.id, item.color, item.size, item.qty + 1)} className="size-8 grid place-items-center hover:bg-surface" aria-label="Increase">
                              <Plus className="size-3" />
                            </button>
                          </div>
                          <p className="font-mono font-bold">{symbol}{(item.price * item.qty).toFixed(0)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t border-border p-6 space-y-4 bg-surface/30">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-mono font-bold">{symbol}{subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Shipping</span>
                    <span className="font-mono">Calculated at checkout</span>
                  </div>
                  <Link
                    to="/checkout"
                    onClick={() => setOpen(false)}
                    className="block w-full py-4 bg-primary text-primary-foreground text-center font-mono text-xs uppercase tracking-[0.2em] font-bold hover:bg-primary-glow transition-colors"
                  >
                    Checkout · {symbol}{subtotal.toFixed(0)}
                  </Link>
                  <Link
                    to="/cart"
                    onClick={() => setOpen(false)}
                    className="block w-full py-3 border border-border text-center font-mono text-xs uppercase tracking-[0.2em] hover:border-primary transition-colors"
                  >
                    View Cart
                  </Link>
                </div>
              </>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
