import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — MotoHelm" },
      { name: "description", content: "Reach the MotoHelm pit crew for support, sizing, press, or warranty questions." },
      { property: "og:title", content: "Contact MotoHelm" },
      { property: "og:description", content: "Talk to the pit crew." },
    ],
  }),
});
