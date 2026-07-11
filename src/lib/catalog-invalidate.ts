import type { QueryClient } from "@tanstack/react-query";

/** Invalidate all storefront catalog queries (products, categories, brands, reviews, featured). */
export const invalidateCatalog = (qc: QueryClient) =>
  qc.invalidateQueries({ queryKey: ["catalog"] });
