import { queryOptions } from "@tanstack/react-query";
import {
  getProductBySlug,
  listBrands,
  listCategories,
  listFeaturedProducts,
  listNewArrivals,
  listProducts,
  listReviews,
} from "@/lib/catalog.functions";

export const productsQuery = (params: Parameters<typeof listProducts>[0] extends undefined ? {} : any = {}) =>
  queryOptions({
    queryKey: ["catalog", "products", params ?? {}],
    queryFn: () => listProducts({ data: params as any }),
  });

export const productBySlugQuery = (slug: string) =>
  queryOptions({
    queryKey: ["catalog", "product", slug],
    queryFn: () => getProductBySlug({ data: { slug } }),
  });

export const categoriesQuery = () =>
  queryOptions({ queryKey: ["catalog", "categories"], queryFn: () => listCategories() });

export const brandsQuery = () =>
  queryOptions({ queryKey: ["catalog", "brands"], queryFn: () => listBrands() });

export const featuredQuery = () =>
  queryOptions({ queryKey: ["catalog", "featured"], queryFn: () => listFeaturedProducts() });

export const newArrivalsQuery = () =>
  queryOptions({ queryKey: ["catalog", "new-arrivals"], queryFn: () => listNewArrivals() });

import { supabase } from "@/integrations/supabase/client";

export const reviewsQuery = (productSlug: string) =>
  queryOptions({
    queryKey: ["catalog", "reviews", productSlug],
    queryFn: () => listReviews({ data: { productSlug } }),
  });

export const settingsQuery = () =>
  queryOptions({
    queryKey: ["catalog", "settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("settings").select("*").limit(1).single();
      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 10, // 10 minutes cache for store configuration
  });

export const heroSlidesQuery = () =>
  queryOptions({
    queryKey: ["catalog", "hero-slides"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hero_slides")
        .select("*")
        .order("position", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

export const userOrdersQuery = () =>
  queryOptions({
    queryKey: ["account", "orders"],
    queryFn: async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user?.id;
      if (!userId) return [];
      const { data, error } = await supabase
        .from("orders")
        .select("*, items:order_items(*, product:products(slug)), history:order_status_history(*)")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

export const userAddressesQuery = () =>
  queryOptions({
    queryKey: ["account", "addresses"],
    queryFn: async () => {
      const { data, error } = await supabase.from("addresses").select("*").order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
