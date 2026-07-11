import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/checkout")({
  head: () => ({ meta: [{ title: "Checkout — MotoHelm" }, { name: "description", content: "Securely complete your order." }] }),
});
