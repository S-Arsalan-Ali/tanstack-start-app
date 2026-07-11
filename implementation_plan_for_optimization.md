# Implementation Plan — Comprehensive Application Optimization

This plan outlines the optimization strategy for the MotoHelm application to reduce the initial bundle size, improve Time to First Byte (TTFB), speed up route transitions, prevent heavy storefront dependencies from leaking into the admin panel, and minimize server/database connection overhead.

---

## Proposed Changes

### 1. Root Layout Chunk Splitting (Chunk Isolation for Admin)

#### [MODIFY] [__root.tsx](file:///e:/lovable orange/chrome-chrome-main/ecommerce/src/routes/__root.tsx)

Currently, the root layout eagerly imports storefront layout components (`Header`, `Footer`, `CartDrawer`, `WishlistDrawer`, `MobileNav`, `SearchOverlay`). These drag in heavy third-party assets like `framer-motion` and dozens of `lucide-react` icons. As a result, the admin dashboard is forced to download all this code.

**Changes:**
- Dynamic/lazy import these layout components using `React.lazy` and `React.Suspense` fallback.
- Wrap their JSX declarations in `Suspense` containers.
- This results in a massive chunk size reduction for `/admin` routes.

---

### 2. Homepage Time-To-First-Byte (TTFB) & Critical Path Deferral

#### [MODIFY] [index.tsx](file:///e:/lovable orange/chrome-chrome-main/ecommerce/src/routes/index.tsx)

The homepage loader currently prefetches 7 different queries from Supabase in a blocking `Promise.all` statement before resolving. This blocks the initial page render and delays showing above-the-fold content.

**Changes:**
- Keep only `settingsQuery()` and `heroSlidesQuery()` in the blocking loader since they are required above-the-fold.
- Defer the other 5 queries to load asynchronously on the client.

#### [MODIFY] [index.lazy.tsx](file:///e:/lovable orange/chrome-chrome-main/ecommerce/src/routes/index.lazy.tsx)

**Changes:**
- Convert the deferred queries (`categoriesQuery`, `featuredQuery`, `newArrivalsQuery`, `productsQuery`, `brandsQuery`) from `useSuspenseQuery` to standard `useQuery`.
- Implement high-fidelity loading skeletons for:
  - Categories Carousel
  - Brand Slider
  - Bestsellers, New Arrivals, Limited Edition, and Sale product sections

#### [MODIFY] [BrandSlider.tsx](file:///e:/lovable orange/chrome-chrome-main/ecommerce/src/components/home/BrandSlider.tsx)

**Changes:**
- Accept an `isLoading` prop.
- Render 5 premium pulsing skeleton border panels to match the official grid partners design when loading.

---

### 3. Image Optimization & Multi-Resolution CDN Delivery

#### [MODIFY] [index.lazy.tsx](file:///e:/lovable orange/chrome-chrome-main/ecommerce/src/routes/index.lazy.tsx)

**Changes:**
- In the homepage category list (line 110), replace raw `resolveImage` with `getOptimizedImageUrl` restricted to `width=600`. This prevents loading heavy raw uploads for category previews.

#### [MODIFY] [product.$slug.lazy.tsx](file:///e:/lovable orange/chrome-chrome-main/ecommerce/src/routes/product.$slug.lazy.tsx)

Currently, the product gallery downloads full-resolution images for all thumbnails on page load, wasting substantial mobile data and memory.

**Changes:**
- Use `getOptimizedImageUrl` with appropriate width parameters:
  - **Thumbnails list:** `width=200` (speeds up thumbnail grid load)
  - **Active gallery image:** `width=1000` (crisp view, prevents downloading raw 4K images)
  - **Lightbox view:** `width=1400` (high resolution, loaded only on zoom clicks)

---

### 4. Zustand LocalStorage Privacy & Write Optimization

#### [MODIFY] [shop.ts](file:///e:/lovable orange/chrome-chrome-main/ecommerce/src/store/shop.ts)

Currently, the Zustand store persists the **entire state** directly into `localStorage`. This includes:
- Live database-fetched arrays (`orders`, `addresses`)
- User-specific profile information (`email`, `phone`, `name`)

This causes redundant writes, bloated browser storage, and potential security leaks (e.g. customer info remaining in plain text in the browser's database after sign-out).

**Changes:**
- Use Zustand's `partialize` callback inside the `persist` options block.
- Persist only anonymous, cross-session customer state: `cart`, `wishlist`, and `recentSearches`.
- Exclude dynamic authenticated fields (`orders`, `addresses`, `profile`) from local storage.

---

### 5. Shop Page "Load More" Pagination

#### [MODIFY] [ShopGrid.tsx](file:///e:/lovable orange/chrome-chrome-main/ecommerce/src/components/shop/ShopGrid.tsx)

Currently, the shop grid page maps and renders *all* products matching the filters in one go. If there are 100+ products, rendering so many heavy product cards (with motion animations and hover effects) triggers major DOM layout costs and paint lag.

**Changes:**
- Introduce a client-side pagination limit using a `pageSize` state (defaulting to `9` products).
- Slice the filtered products array to render only up to `pageSize` products.
- Reset `pageSize` back to `9` whenever search text, category, brand, badge, sorting, or price filters change.
- Render a beautiful, cyberpunk-themed "Load More" button at the bottom when there are remaining products.

---

### 6. Dynamic PDF Generation Import

#### [MODIFY] [admin.orders.lazy.tsx](file:///e:/lovable orange/chrome-chrome-main/ecommerce/src/routes/admin.orders.lazy.tsx)

The admin orders page eagerly imports `buildInvoicePdf` from `@/lib/invoice`, which pulls in the massive `jspdf` and `jspdf-autotable` packages (totaling over 400KB minified). This bloats the orders page bundle.

**Changes:**
- Remove the eager `import { buildInvoicePdf } from "@/lib/invoice"` from the top.
- Dynamically import the invoice builder inside the `downloadPdf` click handler:
  ```tsx
  const { buildInvoicePdf } = await import("@/lib/invoice");
  ```
- This ensures `jspdf` is only fetched when a user actively clicks the invoice download button.

---

### 7. Admin Dashboard Loading States

#### [MODIFY] [admin.dashboard.lazy.tsx](file:///e:/lovable orange/chrome-chrome-main/ecommerce/src/routes/admin.dashboard.lazy.tsx)

The admin dashboard pulls data from multiple tables upon mount but lacks a loader, causing charts to flash empty or render with 0 values.

**Changes:**
- Introduce a `loading` state during Postgres telemetry fetch.
- Render high-tech skeleton panels (matching the dark-mode cyber theme) while database queries are resolved.

---

### 8. Server-Side Supabase Client Caching

#### [MODIFY] [catalog.functions.ts](file:///e:/lovable orange/chrome-chrome-main/ecommerce/src/lib/catalog.functions.ts)

Currently, a new Supabase client is instantiated on every single server function call. This leads to connection setup latency and TLS handshake overhead on serverless edge functions.

**Changes:**
- Implement a cached module-scoped client instance:
  ```typescript
  let cachedClient: ReturnType<typeof createClient<Database>> | null = null;
  function client() {
    if (cachedClient) return cachedClient;
    // ... create client ...
    cachedClient = createClient<Database>(url, key, ...);
    return cachedClient;
  }
  ```

---

### 9. TanStack Router Preload & Cache Tuning

#### [MODIFY] [router.tsx](file:///e:/lovable orange/chrome-chrome-main/ecommerce/src/router.tsx)

Currently, the router has `defaultPreloadStaleTime: 0`. This causes preload attempts (on link hover) to immediately expire, executing double-fetches to Supabase when the user clicks the link.

**Changes:**
- Enable `defaultPreload: "intent"` to automatically fetch route assets when user hovers/focuses links.
- Set `defaultPreloadStaleTime: 30000` (30 seconds) to cache preloaded route loaders and eliminate duplicate data queries on route transitions.

---

### 10. TanStack Query Default Configurations

#### [MODIFY] [router.tsx](file:///e:/lovable orange/chrome-chrome-main/ecommerce/src/router.tsx)

By default, React Query marks queries stale immediately (`staleTime: 0`) and refetches them on window refocus, which generates repetitive read load on Supabase tables (e.g. settings, categories).

**Changes:**
- Configure global query defaults in the `QueryClient` initialization:
  ```typescript
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 30, // 30 seconds
        refetchOnWindowFocus: false,
      },
    },
  });
  ```

---

### 11. CSS & Font Preload Optimization

#### [MODIFY] [__root.tsx](file:///e:/lovable orange/chrome-chrome-main/ecommerce/src/routes/__root.tsx)

External font sheets are imported synchronously from Google Fonts via link tag, delaying initial page paints.

**Changes:**
- Preload the Google Fonts stylesheet to ensure fonts start downloading during initial document parsing:
  ```typescript
  { rel: "preload", href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Bebas+Neue&family=JetBrains+Mono:wght@400;500;700&display=swap", as: "style" }
  ```

---

## Verification Plan

### Automated Build Checks
- Run `npm run build` to verify code splits correctly, all dynamic imports resolve, and build succeeds without compiler errors.
- Confirm compilation outputs separate chunk files (e.g. `vendor-framer`, `vendor-pdf`).

### Manual UX Auditing
1. **Network Tab Analysis:**
   - Open `/admin/dashboard` in Incognito mode.
   - Verify that storefront chunks (`Header`, `Footer`, `CartDrawer`, `framer-motion`) are **NOT** downloaded.
   - Verify that PDF-related chunks (`vendor-pdf`) are **NOT** downloaded on initial `/admin/orders` page load.
   - Click "PDF" (download invoice) on an order drawer and verify `vendor-pdf` dynamically downloads and compiles the PDF correctly.
2. **Homepage Progressive Loading:**
   - Reload the storefront homepage with "Slow 3G" throttling.
   - Verify that the Hero Slider renders immediately.
   - Verify that below-the-fold sections display beautiful loading skeletons and fill in smoothly as data arrives.
3. **Admin Dashboard Telemetry:**
   - Verify that the dashboard shows clean skeleton loading indicators before displaying charts.
4. **Image Bandwidth Reduction:**
   - Visit a product page, inspect thumbnail elements, and verify they load optimized `width=200` URLs.
5. **Storage Privacy Check:**
   - Add items to cart/wishlist, log in, view orders/addresses.
   - Inspect Chrome DevTools → Application → Local Storage → `motohelm-shop`.
   - Verify that `orders` and `addresses` do not exist in the JSON payload, while `cart` and `wishlist` are correctly persisted.
6. **Shop Page Pagination Audit:**
   - Open the shop page `/shop`.
   - Verify that only `9` product cards render initially.
   - Verify that clicking "Load More" appends `9` more products.
   - Verify that changing a filter (e.g., category or brand) resets the rendered list count back to `9`.
7. **Preload and Refetch Checks:**
   - Hover over shop links and check the browser network logs to verify routing bundles and data queries preload before clicking.
   - Verify that query requests to Supabase do not duplicate upon clicking a preloaded link.
   - Check that switching tabs does not trigger re-fetches for fresh queries (i.e. window focus refetch is disabled).
