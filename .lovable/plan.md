## 1. Fix `has_role` permission denied

Migration `20260528022235` revoked `EXECUTE` on `public.has_role(uuid, app_role)` from `PUBLIC, anon`. But the `products` SELECT policy is `USING (status = 'active' OR public.has_role(auth.uid(), 'admin') OR ...)` and runs as `anon` for public storefront reads — Postgres evaluates the whole expression and throws `permission denied for function has_role` before short-circuit can save it.

Migration:
- `GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO anon, authenticated, service_role;`
- Function is already `SECURITY DEFINER` + `STABLE`, so granting `anon` is safe (it only reads `user_roles`, returns boolean).
- Audit other policies that mix `has_role` with public predicates (none currently expose data — only `products` is public-read; `product_images/variants/reviews` use `USING (true)`).

## 2. Catalog single-source-of-truth (remove `@/data/products` from runtime)

Files to migrate off static `products`/`helmetCategories`:

- **`src/components/layout/Header.tsx`** — replace `helmetCategories` with `useQuery(categoriesQuery())`, `featuredHelmet` with `useQuery(featuredQuery())` (first item). Loading state: render menu without featured tile.
- **`src/components/layout/SearchOverlay.tsx`** — replace `products` array with `useQuery(productsQuery({}))`. Client-side filter on name/brand/category/slug stays. "Popular Right Now" → `featuredQuery()`.
- **`src/components/layout/WishlistDrawer.tsx`** — `useQuery(productsQuery({}))`, filter by `wishlist` slugs. `moveToCart` reads colors/sizes from `CatalogProductDetail` — switch to fetching `productBySlugQuery(slug)` on demand inside `moveToCart`, or include variants in `listProducts` (simpler: fetch detail on click).
- **`src/components/account/DashboardPanel.tsx`** — `recommended` from `featuredQuery()`. Orders/profile still come from `useShop` for now (out of scope — separate ticket).
- **`src/routes/wishlist.tsx`** — already on Supabase; verify no static import remains.
- Delete `import { products }` / `import { helmetCategories }` from any remaining runtime file. Keep `src/data/products.ts` only as seed reference (not imported anywhere at runtime).

Verification: `rg "from \"@/data/(products|reviews)\"" src` returns zero matches in non-seed files.

## 3. Cache invalidation after admin edits

Add a small helper `src/lib/catalog-invalidate.ts`:

```ts
export const invalidateCatalog = (qc: QueryClient) =>
  qc.invalidateQueries({ queryKey: ["catalog"] });
```

Wire into admin mutation success handlers in:
- `src/routes/admin.products.tsx` (create/update/delete product, variant, image)
- `src/routes/admin.categories.tsx`
- `src/routes/admin.brands.tsx`
- `src/routes/admin.settings.tsx` (if surfaced on storefront)

Also call `router.invalidate()` so route loaders re-prime on next navigation.

For cross-tab freshness (admin edits in one tab → storefront in another), enable a lightweight Postgres realtime subscription in `__root.tsx` on `products`, `product_images`, `product_variants`, `categories`, `brands` that calls `invalidateCatalog(queryClient)`. Throttled (500ms) to avoid storms.

## 4. Wishlist drawer "Add to cart" variant fix

`CatalogProduct` (list shape) doesn't include `colors`/`sizes`. Two options:
- **A (chosen)**: On `moveToCart` click, call `queryClient.fetchQuery(productBySlugQuery(slug))` to get the detail with variants, pick first color + middle size, then add to cart. One extra request per click — fine.
- B: Extend `listProducts` to include a `default_variant` join (more upfront data on every list).

## 5. Out of scope

- Migrating `useShop` cart/wishlist/orders/profile to Supabase tables (Zustand stays).
- Customer-facing orders/addresses panels (still use local store).
- Image migration from `local:` keys to storage URLs.

## Files touched

**Migration**: `supabase/migrations/<ts>_grant_has_role_anon.sql`
**New**: `src/lib/catalog-invalidate.ts`
**Edited**: `Header.tsx`, `SearchOverlay.tsx`, `WishlistDrawer.tsx`, `DashboardPanel.tsx`, `__root.tsx`, `admin.products.tsx`, `admin.categories.tsx`, `admin.brands.tsx`, `admin.settings.tsx`
