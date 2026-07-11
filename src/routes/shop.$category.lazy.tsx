import { createLazyFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ShopGrid } from "@/components/shop/ShopGrid";
import { categoriesQuery } from "@/lib/catalog-queries";

export const Route = createLazyFileRoute("/shop/$category")({
  component: CategoryPage,
});

function CategoryPage() {
  const { data: cats } = useSuspenseQuery(categoriesQuery());
  const { cat: { slug } } = Route.useLoaderData();
  const cat = cats.find((c) => c.slug === slug)!;
  return <ShopGrid initialCategory={cat.slug} title={cat.name.toUpperCase()} kicker={cat.description ?? ""} />;
}
