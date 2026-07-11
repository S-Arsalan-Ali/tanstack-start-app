// Resolves the "local:<key>" image URLs seeded into Supabase to the bundled
// asset imports. When an admin uploads to storage (full https URL), it's used
// directly. This bridge keeps the original art available without re-uploading.
import p1 from "@/assets/products/p1.jpg";
import p2 from "@/assets/products/p2.jpg";
import p3 from "@/assets/products/p3.jpg";
import p4 from "@/assets/products/p4.jpg";
import p5 from "@/assets/products/p5.jpg";
import p6 from "@/assets/products/p6.jpg";
import p7 from "@/assets/products/p7.jpg";
import p8 from "@/assets/products/p8.jpg";
import p9 from "@/assets/products/p9.jpg";
import p10 from "@/assets/products/p10.jpg";
import p11 from "@/assets/products/p11.jpg";
import p12 from "@/assets/products/p12.jpg";
import a1 from "@/assets/products/a1.jpg";
import a2 from "@/assets/products/a2.jpg";
import a3 from "@/assets/products/a3.jpg";
import a4 from "@/assets/products/a4.jpg";
import a5 from "@/assets/products/a5.jpg";
import a6 from "@/assets/products/a6.jpg";

const map: Record<string, string> = {
  p1, p2, p3, p4, p5, p6, p7, p8, p9, p10, p11, p12,
  a1, a2, a3, a4, a5, a6,
};

export function resolveImage(url: string | null | undefined): string {
  if (!url) return p1;
  if (url.startsWith("local:")) return map[url.slice(6)] ?? p1;
  return url;
}

export function getOptimizedImageUrl(url: string | null | undefined, width = 600): string {
  const resolved = resolveImage(url);
  if (!resolved) return "";
  
  // Intercept Supabase Storage URLs and route through CDN image resizing
  if (resolved.includes("/storage/v1/object/public/")) {
    return resolved.replace("/storage/v1/object/public/", "/storage/v1/render/image/public/") + `?width=${width}&quality=75`;
  }
  
  return resolved;
}
