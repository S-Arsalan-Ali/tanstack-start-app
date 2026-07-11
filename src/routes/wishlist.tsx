import { createFileRoute } from "@tanstack/react-router";
import { productsQuery } from "@/lib/catalog-queries";

export const Route = createFileRoute("/wishlist")({
  loader: ({ context }) => context.queryClient.ensureQueryData(productsQuery({})),
  head: () => ({ meta: [{ title: "Wishlist — MotoHelm" }, { name: "description", content: "Helmets you've saved for later." }] }),
  errorComponent: ({ error }) => <div className="pt-40 text-center font-display text-2xl">{error.message}</div>,
  notFoundComponent: () => <div className="pt-40 text-center font-display text-2xl">Wishlist not found.</div>,
});
