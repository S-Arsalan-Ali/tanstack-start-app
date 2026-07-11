import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Heart, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import type { CatalogProduct } from "@/types/catalog";
import { resolveImage, getOptimizedImageUrl } from "@/lib/local-images";
import { useShop } from "@/store/shop";
import { settingsQuery } from "@/lib/catalog-queries";

export function ProductCard({ product, index = 0 }: { product: CatalogProduct; index?: number }) {
  const wishlist = useShop((s) => s.wishlist);
  const toggleWishlist = useShop((s) => s.toggleWishlist);
  const addToCart = useShop((s) => s.addToCart);
  const { data: settings } = useQuery(settingsQuery());
  const symbol = settings?.currency_symbol ?? "Rs.";
  const saved = wishlist.includes(product.slug);
  const img = resolveImage(product.primary_image);
  const thumbnailImg = getOptimizedImageUrl(product.primary_image, 400);
  const brandName = product.brand?.name ?? "";

  const quickAdd = () => {
    addToCart({
      id: product.id,
      slug: product.slug,
      name: product.name,
      price: product.price,
      image: img,
      color: "Default",
      size: "M",
    });
    toast.success("Added to cart", { description: product.name });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5, delay: Math.min(index * 0.05, 0.4) }}
      className="group relative"
    >
      <Link
        to="/product/$slug"
        params={{ slug: product.slug }}
        className="block relative aspect-square bg-surface overflow-hidden"
      >
        {product.badge && (
          <span className="absolute top-3 left-3 z-10 px-2 py-1 bg-primary text-primary-foreground text-[10px] font-mono font-bold tracking-wider">
            {product.badge}
          </span>
        )}
        <button
          onClick={(e) => {
            e.preventDefault();
            const nowSaved = toggleWishlist(product.slug);
            if (nowSaved) toast.success("Saved to wishlist", { description: product.name });
            else toast("Removed from wishlist");
          }}
          className={`absolute top-3 right-3 z-10 size-9 grid place-items-center backdrop-blur-md transition-all ${
            saved ? "bg-primary text-primary-foreground" : "bg-background/60 hover:bg-background"
          }`}
          aria-label="Save"
        >
          <Heart className={`size-4 ${saved ? "fill-current" : ""}`} />
        </button>

        <img
          src={thumbnailImg}
          alt={product.name}
          loading="lazy"
          className="size-full object-cover transition-transform duration-700 group-hover:scale-110"
        />

        <div className="hidden md:block absolute inset-x-0 bottom-0 p-3 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
          <button
            onClick={(e) => { e.preventDefault(); quickAdd(); }}
            className="w-full py-2.5 bg-primary text-primary-foreground font-mono text-[11px] uppercase tracking-[0.2em] font-bold flex items-center justify-center gap-2 hover:bg-primary-glow"
          >
            <ShoppingBag className="size-3.5" /> Quick Add
          </button>
        </div>
      </Link>

      <button
        onClick={quickAdd}
        className="md:hidden mt-3 w-full py-2.5 bg-primary text-primary-foreground font-mono text-[11px] uppercase tracking-[0.2em] font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
      >
        <ShoppingBag className="size-3.5" /> Add to Cart
      </button>

      <div className="pt-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{brandName}</p>
          <Link
            to="/product/$slug"
            params={{ slug: product.slug }}
            className="font-display text-lg tracking-wide hover:text-primary transition-colors block"
          >
            {product.name}
          </Link>
        </div>
        <div className="text-right shrink-0">
          {product.compare_price && (
            <p className="text-xs text-muted-foreground line-through font-mono">{symbol}{product.compare_price}</p>
          )}
          <p className="font-mono font-bold">{symbol}{product.price}</p>
        </div>
      </div>
    </motion.div>
  );
}
