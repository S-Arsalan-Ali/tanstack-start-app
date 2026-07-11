import { createLazyFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useShop } from "@/store/shop";
import { productsQuery } from "@/lib/catalog-queries";
import { ProductCard } from "@/components/shop/ProductCard";
import { Heart } from "lucide-react";

export const Route = createLazyFileRoute("/wishlist")({
  component: WishlistPage,
});

function WishlistPage() {
  const slugs = useShop((s) => s.wishlist);
  const { data: products } = useSuspenseQuery(productsQuery({}));
  const saved = products.filter((p) => slugs.includes(p.slug));

  return (
    <section className="pt-24 md:pt-28 pb-24 mx-auto max-w-[1600px] px-4 md:px-8">
      <p className="font-mono text-xs uppercase tracking-[0.3em] text-primary">Saved for the next ride</p>
      <h1 className="font-display text-5xl md:text-7xl tracking-tight mt-2">WISHLIST</h1>

      {saved.length === 0 ? (
        <div className="mt-16 text-center py-20 border border-border">
          <Heart className="size-12 mx-auto text-muted-foreground mb-4" />
          <p className="font-display text-2xl">NOTHING SAVED YET</p>
          <Link to="/shop" className="mt-6 inline-flex px-6 py-3 bg-primary text-primary-foreground font-mono text-xs uppercase tracking-[0.2em]">Browse Helmets</Link>
        </div>
      ) : (
        <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
          {saved.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
        </div>
      )}
    </section>
  );
}
