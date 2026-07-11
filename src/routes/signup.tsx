import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Create Account — MotoHelm" },
      { name: "description", content: "Join MotoHelm. Track orders, save helmets, unlock rider drops." },
    ],
  }),
});
