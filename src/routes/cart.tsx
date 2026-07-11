import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/cart")({
  head: () => ({ meta: [{ title: "Cart — MotoHelm" }, { name: "description", content: "Review your cart and proceed to checkout." }] }),
});
