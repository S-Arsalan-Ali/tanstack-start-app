import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign In — MotoHelm" },
      { name: "description", content: "Sign in to your MotoHelm rider account." },
    ],
  }),
});
