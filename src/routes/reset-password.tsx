import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset Password — MotoHelm" },
      { name: "description", content: "Reset your MotoHelm rider account password." },
    ],
  }),
});
