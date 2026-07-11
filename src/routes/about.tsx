import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — MotoHelm" },
      { name: "description", content: "We build race-bred motorcycle helmets engineered for the apex and certified for the street." },
      { property: "og:title", content: "About MotoHelm — Race-Bred Engineering" },
    ],
  }),
});
