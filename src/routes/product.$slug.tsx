import { createFileRoute, notFound } from "@tanstack/react-router";
import { productBySlugQuery, productsQuery, reviewsQuery } from "@/lib/catalog-queries";
import { resolveImage } from "@/lib/local-images";

export const Route = createFileRoute("/product/$slug")({
  loader: async ({ context, params }) => {
    const product = await context.queryClient.ensureQueryData(productBySlugQuery(params.slug));
    if (!product) throw notFound();
    context.queryClient.ensureQueryData(reviewsQuery(params.slug));
    context.queryClient.ensureQueryData(productsQuery({}));
    return { product };
  },
  head: ({ loaderData }) => {
    const p = loaderData?.product;
    const img = p ? resolveImage(p.primary_image) : "";
    return {
      meta: [
        { title: p ? `${p.name} — ${p.brand?.name ?? ""} | MotoHelm` : "Product — MotoHelm" },
        { name: "description", content: p?.description ?? "" },
        { property: "og:title", content: p ? `${p.name} — MotoHelm` : "MotoHelm" },
        { property: "og:description", content: p?.description ?? "" },
        { property: "og:image", content: img },
        { name: "twitter:image", content: img },
      ],
    };
  },
  errorComponent: ({ error }) => <div className="pt-40 text-center font-display text-2xl">{error.message}</div>,
  notFoundComponent: () => <div className="pt-40 text-center font-display text-3xl">Product not found.</div>,
});
