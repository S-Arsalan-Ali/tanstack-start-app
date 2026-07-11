import { Link } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { X, Heart, ShoppingBag, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useShop } from "@/store/shop";
import { productsQuery, productBySlugQuery, settingsQuery } from "@/lib/catalog-queries";

export function WishlistDrawer() {
  const open = useShop((s) => s.wishlistOpen);
  const setOpen = useShop((s) => s.setWishlistOpen);
  const wishlist = useShop((s) => s.wishlist);
  const toggleWishlist = useShop((s) => s.toggleWishlist);
  const addToCart = useShop((s) => s.addToCart);

  const qc = useQueryClient();
  const { data: products = [] } = useQuery({ ...productsQuery({}), enabled: open });
  const { data: settings } = useQuery({ ...settingsQuery(), enabled: open });
  const symbol = settings?.currency_symbol ?? "Rs.";
  const items = products.filter((p) => wishlist.includes(p.slug));

  const moveToCart = async (slug: string) => {
    const detail = await qc.fetchQuery(productBySlugQuery(slug));
    if (!detail) return;
    const color = detail.colors[0]?.name ?? "Default";
    const size = detail.sizes[Math.floor(detail.sizes.length / 2)] ?? "M";
    addToCart({
      id: detail.id, slug: detail.slug, name: detail.name, price: detail.price,
      image: detail.primary_image, color, size,
    });
    toggleWishlist(slug);
    toast.success("Moved to cart", { description: detail.name });
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-background/70 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <motion.aside
            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
            transition={{ type: "tween", duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
            className="fixed top-0 right-0 bottom-0 z-[61] w-full max-w-md bg-background border-l border-border flex flex-col"
          >
            <div className="flex items-center justify-between p-6 border-b border-border">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-1">Saved for later</div>
                <h2 className="font-display text-2xl">WISHLIST · {items.length}</h2>
              </div>
              <button onClick={() => setOpen(false)} className="size-10 grid place-items-center hover:bg-surface" aria-label="Close">
                <X className="size-5" />
              </button>
            </div>

            {items.length === 0 ? (
              <div className="flex-1 grid place-items-center text-center p-8">
                <div>
                  <Heart className="size-12 mx-auto text-muted-foreground mb-4" />
                  <p className="font-display text-xl mb-2">NOTHING SAVED YET</p>
                  <p className="text-sm text-muted-foreground mb-6">Tap the heart on any product to save it.</p>
                  <Link to="/shop" onClick={() => setOpen(false)}
                    className="inline-flex items-center justify-center px-6 py-3 bg-primary text-primary-foreground font-mono text-xs uppercase tracking-[0.2em] hover:bg-primary-glow transition-colors">
                    Browse Shop
                  </Link>
                </div>
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  {items.map((p) => (
                    <div key={p.id} className="flex gap-4 pb-4 border-b border-border">
                      <Link to="/product/$slug" params={{ slug: p.slug }} onClick={() => setOpen(false)}
                        className="size-24 bg-surface shrink-0 overflow-hidden">
                        <img src={p.primary_image} alt={p.name} className="size-full object-cover" />
                      </Link>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between gap-2">
                          <h3 className="font-display text-base leading-tight truncate">{p.name}</h3>
                          <button onClick={() => { toggleWishlist(p.slug); toast("Removed from wishlist"); }}
                            className="text-muted-foreground hover:text-destructive shrink-0" aria-label="Remove">
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                        <p className="text-xs text-muted-foreground font-mono mt-1 uppercase">{p.brand?.name ?? ""}</p>
                        <div className="flex justify-between items-center mt-3 gap-3">
                          <p className="font-mono font-bold text-primary">{symbol}{p.price}</p>
                          <button onClick={() => moveToCart(p.slug)}
                            className="inline-flex items-center gap-1.5 bg-primary text-primary-foreground px-3 py-2 font-mono text-[10px] uppercase tracking-[0.2em] font-bold hover:bg-primary-glow">
                            <ShoppingBag className="size-3" /> Add
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="border-t border-border p-6 bg-surface/30">
                  <Link to="/wishlist" onClick={() => setOpen(false)}
                    className="block w-full py-3 border border-border text-center font-mono text-xs uppercase tracking-[0.2em] hover:border-primary transition-colors">
                    View Full Wishlist
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
