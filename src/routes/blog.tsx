import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/blog")({
  head: () => ({
    meta: [
      { title: "Journal — MotoHelm" },
      { name: "description", content: "Riding stories, tech deep-dives, and gear reviews from the MotoHelm team." },
    ],
  }),
});
