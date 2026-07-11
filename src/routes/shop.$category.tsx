import { createFileRoute, notFound } from "@tanstack/react-router";
import { categoriesQuery } from "@/lib/catalog-queries";

export const Route = createFileRoute("/shop/$category")({
  loader: async ({ context, params }) => {
    const cats = await context.queryClient.ensureQueryData(categoriesQuery());
    const cat = cats.find((c) => c.slug === params.category);
    if (!cat) throw notFound();
    return { cat };
  },
  head: ({ loaderData }) => {
    const name = loaderData?.cat?.name ?? "Helmets";
    return {
      meta: [
        { title: `${name} Helmets — MotoHelm` },
        { name: "description", content: `Shop ${name.toLowerCase()} motorcycle helmets at MotoHelm. ${loaderData?.cat?.description ?? ""}` },
        { property: "og:title", content: `${name} Helmets — MotoHelm` },
      ],
    };
  },
  errorComponent: ({ error }) => <div className="pt-40 text-center font-display text-2xl">{error.message}</div>,
  notFoundComponent: () => (
    <div className="pt-40 text-center font-display text-3xl">Category not found.</div>
  ),
});
