import { createFileRoute } from "@tanstack/react-router";
import { categoriesQuery, featuredQuery, newArrivalsQuery, productsQuery, heroSlidesQuery, settingsQuery, brandsQuery } from "@/lib/catalog-queries";
import hero1 from "@/assets/hero-1.webp";
import { getOptimizedImageUrl } from "@/lib/local-images";

export const Route = createFileRoute("/")({
  loader: async ({ context }) => {
    const [slides, settings] = await Promise.all([
      context.queryClient.ensureQueryData(heroSlidesQuery()),
      context.queryClient.ensureQueryData(settingsQuery()),
    ]);
    return { slides, settings };
  },
  head: ({ loaderData }) => {
    const slides = loaderData?.slides ?? [];
    const active = slides.filter((s: any) => s.is_active);
    let lcpUrl = "";
    let mobileLcpUrl = "";
    if (active.length > 0) {
      lcpUrl = active[0].image_url;
      mobileLcpUrl = active[0].mobile_image_url || "";
    } else {
      lcpUrl = hero1;
    }

    const desktopLcpOptimized = getOptimizedImageUrl(lcpUrl, 1600);
    const mobileLcpOptimized = getOptimizedImageUrl(mobileLcpUrl || lcpUrl, 800);

    return {
      meta: [
        { title: "MotoHelm — Race-Bred Motorcycle Helmets, ECE 22.06 Certified" },
        { name: "description", content: "Premium motorcycle helmets engineered for the track and the street. Full-face, modular, off-road, urban. Free shipping over Rs. 20,000." },
      ],
      links: [
        // Preload desktop hero image only on large screens
        { rel: "preload", as: "image", href: desktopLcpOptimized, fetchPriority: "high", media: "(min-width: 1024px)" },
        // Preload mobile hero image only on small/tablet screens
        { rel: "preload", as: "image", href: mobileLcpOptimized, fetchPriority: "high", media: "(max-width: 1023px)" },
      ]
    };
  },
  errorComponent: ({ error }) => <div className="pt-40 text-center font-display text-2xl">{error.message}</div>,
  notFoundComponent: () => <div className="pt-40 text-center font-display text-2xl">Not found.</div>,
});
