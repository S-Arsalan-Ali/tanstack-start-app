// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
// @cloudflare/vite-plugin builds from this — wrangler.jsonc main alone is insufficient.
export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  vite: {
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes("node_modules")) {
              if (id.includes("@supabase")) {
                return "vendor-supabase";
              }
              if (id.includes("framer-motion")) {
                return "vendor-framer";
              }
              if (id.includes("recharts")) {
                return "vendor-recharts";
              }
              if (id.includes("jspdf") || id.includes("jspdf-autotable") || id.includes("html2canvas")) {
                return "vendor-pdf";
              }
              if (id.includes("lucide-react") || id.includes("lucide")) {
                return "vendor-icons";
              }
            }
          }
        }
      }
    }
  }
});
