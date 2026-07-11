import { createFileRoute } from "@tanstack/react-router";
import { brandsQuery, categoriesQuery, productsQuery } from "@/lib/catalog-queries";

type ShopSearch = {
  badge?: "BESTSELLER" | "NEW" | "LIMITED" | "SALE";
  sort?: "featured" | "price-asc" | "price-desc" | "rating";
};

export const Route = createFileRoute("/shop/")({
  validateSearch: (search: Record<string, unknown>): ShopSearch => {
    return {
      badge: (search.badge as any) || undefined,
      sort: (search.sort as any) || undefined,
    };
  },
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(productsQuery({}));
    context.queryClient.ensureQueryData(categoriesQuery());
    context.queryClient.ensureQueryData(brandsQuery());
  },
  head: () => ({
    meta: [
      { title: "Shop All Helmets — MotoHelm" },
      { name: "description", content: "Browse the full MotoHelm catalog: full-face, modular, off-road, and urban helmets. ECE 22.06 certified." },
    ],
  }),
  errorComponent: ({ error }) => <div className="pt-40 text-center font-display text-2xl">{error.message}</div>,
  notFoundComponent: () => <div className="pt-40 text-center font-display text-2xl">Not found.</div>,
});
