// Public storefront catalog reads. Uses the server publishable client (anon
// key, RLS-respecting) — never `supabaseAdmin`. Safe to call from public
// SSR loaders.
import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";
import type {
  CatalogBrand,
  CatalogCategory,
  CatalogProduct,
  CatalogProductDetail,
  CatalogReview,
} from "@/types/catalog";

let cachedClient: ReturnType<typeof createClient<Database>> | null = null;

function client() {
  if (cachedClient) return cachedClient;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Supabase env not configured");
  cachedClient = createClient<Database>(url, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
  return cachedClient;
}

// Row shape used by listProducts -- shared select.
const LIST_SELECT = `
  id, slug, name, description, price, compare_price, stock, featured, badge,
  rating, reviews_count, specs, certifications,
  category:categories(slug, name),
  brand:brands(slug, name),
  images:product_images(url, alt, position)
`;

function mapList(rows: any[]): CatalogProduct[] {
  return (rows ?? []).map((r) => {
    const images = ((r.images ?? []) as any[])
      .slice()
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    return {
      id: r.id,
      slug: r.slug,
      name: r.name,
      description: r.description,
      price: Number(r.price),
      compare_price: r.compare_price != null ? Number(r.compare_price) : null,
      stock: r.stock ?? 0,
      featured: !!r.featured,
      badge: r.badge ?? null,
      rating: r.rating != null ? Number(r.rating) : null,
      reviews_count: r.reviews_count ?? 0,
      specs: r.specs ?? null,
      certifications: r.certifications ?? null,
      category: r.category ?? null,
      brand: r.brand ?? null,
      images,
      primary_image: images[0]?.url ?? "",
    };
  });
}

// ---------------------------------------------------------------------------
// listProducts
// ---------------------------------------------------------------------------
const ListInput = z.object({
  category: z.string().optional(),
  brand: z.string().optional(),
  search: z.string().optional(),
  sort: z.enum(["featured", "price-asc", "price-desc", "rating", "newest"]).optional(),
  limit: z.number().int().positive().max(200).optional(),
  offset: z.number().int().nonnegative().optional(),
});
export const listProducts = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => ListInput.parse(d ?? {}))
  .handler(async ({ data }) => {
    const sb = client();
    let q = sb.from("products").select(LIST_SELECT).eq("status", "active");

    if (data.category) {
      const { data: cat } = await sb
        .from("categories")
        .select("id")
        .eq("slug", data.category)
        .maybeSingle();
      if (cat) q = q.eq("category_id", cat.id);
      else return [];
    }
    if (data.brand) {
      const { data: br } = await sb
        .from("brands")
        .select("id")
        .eq("slug", data.brand)
        .maybeSingle();
      if (br) q = q.eq("brand_id", br.id);
      else return [];
    }
    if (data.search) q = q.ilike("name", `%${data.search}%`);

    switch (data.sort) {
      case "price-asc":
        q = q.order("price", { ascending: true });
        break;
      case "price-desc":
        q = q.order("price", { ascending: false });
        break;
      case "rating":
        q = q.order("rating", { ascending: false, nullsFirst: false });
        break;
      case "newest":
        q = q.order("created_at", { ascending: false });
        break;
      default:
        q = q.order("featured", { ascending: false }).order("created_at", { ascending: false });
    }

    if (data.limit) q = q.limit(data.limit);
    if (data.offset) q = q.range(data.offset, data.offset + (data.limit ?? 50) - 1);

    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return mapList(rows as any[]);
  });

// ---------------------------------------------------------------------------
// getProductBySlug
// ---------------------------------------------------------------------------
const SlugInput = z.object({ slug: z.string().min(1) });
export const getProductBySlug = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => SlugInput.parse(d))
  .handler(async ({ data }): Promise<CatalogProductDetail | null> => {
    const sb = client();
    const { data: row, error } = await sb
      .from("products")
      .select(
        `${LIST_SELECT}, variants:product_variants(id, color, color_hex, size, sku, stock, price_override, image_url)`,
      )
      .eq("slug", data.slug)
      .eq("status", "active")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return null;

    const [base] = mapList([row as any]);
    const variants = (((row as any).variants ?? []) as any[]).map((v) => ({
      id: v.id,
      color: v.color,
      color_hex: v.color_hex,
      size: v.size,
      sku: v.sku,
      stock: v.stock ?? 0,
      price_override: v.price_override != null ? Number(v.price_override) : null,
      image_url: v.image_url ?? null,
    }));

    // Derive unique colors/sizes in insertion order.
    const colorMap = new Map<string, string>();
    const sizeSet = new Set<string>();
    for (const v of variants) {
      if (!colorMap.has(v.color)) colorMap.set(v.color, v.color_hex ?? "#999");
      sizeSet.add(v.size);
    }

    return {
      ...base,
      variants,
      colors: Array.from(colorMap.entries()).map(([name, hex]) => ({ name, hex })),
      sizes: Array.from(sizeSet),
    };
  });

// ---------------------------------------------------------------------------
// listCategories / listBrands
// ---------------------------------------------------------------------------
export const listCategories = createServerFn({ method: "GET" }).handler(
  async (): Promise<CatalogCategory[]> => {
    const sb = client();
    const { data, error } = await sb
      .from("categories")
      .select("id, slug, name, description, image_url, position")
      .order("position", { ascending: true })
      .order("name", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as CatalogCategory[];
  },
);

export const listBrands = createServerFn({ method: "GET" }).handler(
  async (): Promise<CatalogBrand[]> => {
    const sb = client();
    const { data, error } = await sb
      .from("brands")
      .select("id, slug, name, description, logo_url, position, show_in_slider")
      .order("position", { ascending: true })
      .order("name", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as CatalogBrand[];
  },
);

// ---------------------------------------------------------------------------
// listFeatured / listNewArrivals
// ---------------------------------------------------------------------------
export const listFeaturedProducts = createServerFn({ method: "GET" }).handler(async () => {
  const sb = client();
  const { data, error } = await sb
    .from("products")
    .select(LIST_SELECT)
    .eq("status", "active")
    .eq("featured", true)
    .limit(8);
  if (error) throw new Error(error.message);
  return mapList(data as any[]);
});

export const listNewArrivals = createServerFn({ method: "GET" }).handler(async () => {
  const sb = client();
  const { data, error } = await sb
    .from("products")
    .select(LIST_SELECT)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(8);
  if (error) throw new Error(error.message);
  return mapList(data as any[]);
});

// ---------------------------------------------------------------------------
// listReviews
// ---------------------------------------------------------------------------
const ReviewsInput = z.object({ productSlug: z.string().min(1) });
export const listReviews = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => ReviewsInput.parse(d))
  .handler(async ({ data }): Promise<CatalogReview[]> => {
    const sb = client();
    const { data: prod } = await sb
      .from("products")
      .select("id")
      .eq("slug", data.productSlug)
      .maybeSingle();
    if (!prod) return [];
    const { data: rows, error } = await sb
      .from("product_reviews")
      .select(
        "id, author_name, rating, title, body, verified, helpful, helmet_size, created_at, user_id",
      )
      .eq("product_id", prod.id)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (rows ?? []) as CatalogReview[];
  });
