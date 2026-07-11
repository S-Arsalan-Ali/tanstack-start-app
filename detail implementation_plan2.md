# MotoHelm Ecommerce — Comprehensive Improvement Plan

Deep analysis of the full codebase covering performance, speed, design, security, architecture, and reliability.

---

## User Review Required

> [!CAUTION]
> **Critical Security Vulnerability Found**: The `.env` file contains the **Supabase Service Role Key** (`SUPABASE_SERVICE_ROLE_KEY`) — a secret that grants full bypass of Row Level Security. While `.gitignore` does exclude `.env`, the key is currently sitting in the repo directory. If this file was ever committed to Git history, it **must be rotated immediately** in the Supabase dashboard. See [Security §1](#1-service-role-key-exposure) below.

> [!IMPORTANT]
> This plan is organized into **3 Phases** by priority. Phase 1 (Security + Critical Performance) should be executed immediately. Phases 2 and 3 can be batched. Please review and approve the areas you'd like me to implement.

## Open Questions

1. **Payment integration**: Are you planning to integrate a real payment gateway (Stripe, Paddle, etc.) in the future? The current manual-receipt flow has inherent fraud risk (see Security §4).
2. **Image CDN**: The `getOptimizedImageUrl` function uses Supabase's render endpoint — do you have Supabase Pro/Enterprise for image transformations, or should we set up a dedicated CDN (Cloudflare Images, Imgix)?
3. **Rate limiting**: Are there any Cloudflare WAF rules or Supabase rate limits configured for the API?
4. **Target deployment**: Cloudflare Workers is configured via `wrangler.jsonc` — is this the production deployment target?

---

## 🔴 PHASE 1 — Security & Critical Issues (Immediate)

### 1. Service Role Key Exposure

**File**: [.env](file:///e:/lovable%20orange/chrome-chrome-main/ecommerce/.env)

The `.env` file contains `SUPABASE_SERVICE_ROLE_KEY` in plaintext. While `.gitignore` excludes `.env`, the risk profile is:

- If this was ever committed, the key is in Git history forever
- Anyone with file system access to the dev machine can read it
- The key bypasses **all RLS policies**

**Fix**:
- Verify the key was never committed: `git log --all --oneline -- .env`
- If it was committed, **rotate the key** in Supabase Dashboard → Settings → API
- Move server-only secrets to Cloudflare Workers secrets (`wrangler secret put`) or `.dev.vars` (which is already gitignored)

---

### 2. Admin Authorization — Client-Side Only Guard

**Files**: [admin.lazy.tsx](file:///e:/lovable%20orange/chrome-chrome-main/ecommerce/src/routes/admin.lazy.tsx), [admin.settings.lazy.tsx](file:///e:/lovable%20orange/chrome-chrome-main/ecommerce/src/routes/admin.settings.lazy.tsx)

The entire admin panel authorization is **client-side only**. The `AdminGate` component checks roles by querying `user_roles` table directly from the browser. This means:

- The admin UI code (67KB settings page!) is shipped to **all users**
- A determined attacker can bypass the gate by modifying JS in devtools
- Admin data mutations (settings save, slide CRUD, etc.) use the client-side `supabase` object — they rely entirely on RLS policies being bulletproof

**Fix**:
#### [MODIFY] [admin.tsx](file:///e:/lovable%20orange/chrome-chrome-main/ecommerce/src/routes/admin.tsx)
- Add a server-side `beforeLoad` or `loader` that uses `requireSupabaseAuth` middleware to verify admin/staff role before the route even renders
- Return `redirect({ to: '/login' })` if unauthorized

#### [MODIFY] Admin mutation functions
- Move admin write operations (settings save, product CRUD, order status changes, slide management) to server functions with `requireSupabaseAuth` + admin role check, similar to how `createOrder` works

---

### 3. Coupon Validation — No Auth Required

**File**: [order.functions.ts](file:///e:/lovable%20orange/chrome-chrome-main/ecommerce/src/lib/order.functions.ts#L40-L80)

`validateCoupon` is a server function that uses `supabaseAdmin` (bypasses RLS) but has **no authentication middleware**. This means:

- Any unauthenticated user can brute-force coupon codes via the API
- The coupon table structure is exposed through error responses

**Fix**:
- Add `.middleware([requireSupabaseAuth])` to `validateCoupon`
- Add rate limiting or IP-based throttling

---

### 4. Search SQL Injection Vector

**File**: [catalog.functions.ts](file:///e:/lovable%20orange/chrome-chrome-main/ecommerce/src/lib/catalog.functions.ts#L100)

```typescript
if (data.search) q = q.ilike("name", `%${data.search}%`);
```

While Supabase's `.ilike()` method does parameterize the query (safe from traditional SQL injection), the search input has **no length limit or sanitization**. An attacker could send megabyte-length strings causing:
- Excessive database CPU usage
- Memory exhaustion on the edge worker

**Fix**:
- Add `search: z.string().max(100).optional()` to the Zod schema
- Consider PostgreSQL full-text search (`to_tsquery`) for better performance and security

---

### 5. Receipt Upload — No File Type Validation Server-Side

**File**: [checkout.lazy.tsx](file:///e:/lovable%20orange/chrome-chrome-main/ecommerce/src/routes/checkout.lazy.tsx#L91-L122)

Receipt files are uploaded directly to Supabase Storage from the client. The only validation is:
- Client-side 5MB limit
- `accept="image/*"` HTML attribute (trivially bypassed)

**Fix**:
- Configure Supabase Storage bucket policies to restrict MIME types to `image/png`, `image/jpeg`, `image/webp`
- Add server-side file validation in a server function before the upload
- Generate signed upload URLs instead of direct public bucket uploads

---

### 6. Hardcoded Dummy Profile on Sign-Out

**File**: [__root.tsx](file:///e:/lovable%20orange/chrome-chrome-main/ecommerce/src/routes/__root.tsx#L250-L262)

On `SIGNED_OUT`, the store is populated with dummy data:
```typescript
profile: {
  name: "Alex Rivera",
  email: "alex.rivera@motohelm.test",
  phone: "+1 555 0142",
  ...
}
```

This is confusing UX and could leak test data in production.

**Fix**: Reset to the `defaultProfile` (Guest Rider) from [shop.ts](file:///e:/lovable%20orange/chrome-chrome-main/ecommerce/src/store/shop.ts#L91-L97).

---

## 🟡 PHASE 2 — Performance & Speed

### 7. Massive Admin Settings File — 67KB Single Component

**File**: [admin.settings.lazy.tsx](file:///e:/lovable%20orange/chrome-chrome-main/ecommerce/src/routes/admin.settings.lazy.tsx) — **1291 lines, 67KB**

This monolithic file handles storefront, payments, fulfillment, contact, FAQs, security, and hero slides — all in one component. Even though it's lazy-loaded, it's still a single massive chunk.

**Fix**:
- Split each tab into its own component file under `components/admin/settings/`
- Each tab component is imported lazily within the settings page
- Target: **no single file over ~300 lines**

---

### 8. Home Page — Waterfall of 6 Independent Queries

**File**: [index.lazy.tsx](file:///e:/lovable%20orange/chrome-chrome-main/ecommerce/src/routes/index.lazy.tsx#L32-L37)

The home page fires **6 parallel queries** on mount:
```typescript
const { data: catsRes } = useQuery(categoriesQuery());
const { data: featuredRes } = useQuery(featuredQuery());
const { data: newArrivalsRes } = useQuery(newArrivalsQuery());
const { data: allProductsRes } = useQuery(productsQuery({}));
const { data: settings } = useSuspenseQuery(settingsQuery());
const { data: brands } = useQuery(brandsQuery());
```

The `productsQuery({})` fetches **ALL products** just to derive bestsellers, limited editions, and sale items. This is highly wasteful.

**Fix**:
- Move critical queries to the route's `loader` function ([index.tsx](file:///e:/lovable%20orange/chrome-chrome-main/ecommerce/src/routes/index.tsx)) using `ensureQueryData` for SSR
- Create dedicated server functions: `listBestsellers()`, `listLimitedEdition()`, `listSaleProducts()` instead of fetching all products
- Use `staleTime` and `gcTime` to prevent refetching on navigation

---

### 9. Preloader Component — 23KB of Animation Code

**File**: [Preloader.tsx](file:///e:/lovable%20orange/chrome-chrome-main/ecommerce/src/components/layout/Preloader.tsx) — **23KB**

This component is lazy-loaded but still bloats the initial experience. It includes 3 different animation themes inline.

**Fix**:
- Dynamically import only the selected theme variant
- Extract each theme into its own file: `PreloaderDashboard.tsx`, `PreloaderIgnition.tsx`, `PreloaderMinimalist.tsx`
- Consider replacing framer-motion animations with CSS-only for the preloader (reduces JS parse time)

---

### 10. Framer Motion Everywhere — Heavy Animation Library

**Files**: Nearly every component imports `framer-motion` (94KB gzip)

The library is used for:
- Simple fade-in/slide-up on viewport enter (could be CSS `@starting-style` or `IntersectionObserver`)
- AnimatePresence for drawers/overlays (could be CSS transitions with `dialog` element)

**Fix**:
- Replace `whileInView` animations with CSS `animation` + `IntersectionObserver` hook
- Keep framer-motion only for complex orchestrated sequences (Preloader, hero transitions)
- This could save **40-60KB** from the main bundle

---

### 11. Google Fonts — Render-Blocking Stylesheet

**File**: [__root.tsx](file:///e:/lovable%20orange/chrome-chrome-main/ecommerce/src/routes/__root.tsx#L86-L90)

Fonts are loaded via two mechanisms:
1. `@font-face` in CSS for Bebas Neue (good — uses `font-display: swap`)
2. Google Fonts stylesheet link for Inter, Bebas Neue, and JetBrains Mono (bad — render-blocking)

The font stylesheet is loaded twice: once as `preload` and once as `stylesheet`.

**Fix**:
- Self-host all font files (Inter, JetBrains Mono) via `@font-face` in CSS, like Bebas Neue already is
- Remove Google Fonts `<link>` entirely
- Use `font-display: swap` on all declarations
- This eliminates a render-blocking external request and reduces LCP by **200-500ms**

---

### 12. Image Optimization Gaps

**File**: [local-images.ts](file:///e:/lovable%20orange/chrome-chrome-main/ecommerce/src/lib/local-images.ts)

- `resolveImage()` falls back to `p1` (a full-res JPG) when no image exists — this should be a tiny placeholder
- No `srcset` or responsive images — every device loads the same resolution
- Hero images have no `fetchpriority="high"` hint
- Product images lack `width` and `height` attributes (causes CLS)

**Fix**:
- Add `<img width={...} height={...}>` to all image elements to prevent layout shift
- Add `srcset` with 400w/800w/1200w breakpoints using `getOptimizedImageUrl`
- Set `fetchpriority="high"` on hero/LCP images
- Use a placeholder SVG or blurred data-URI for fallback

---

### 13. Zustand Store — Over-Persisting State

**File**: [shop.ts](file:///e:/lovable%20orange/chrome-chrome-main/ecommerce/src/store/shop.ts#L205-L217)

The `partialize` function persists `cartOpen`, `wishlistOpen`, `searchOpen`, and `searchOrigin` to localStorage. These are **transient UI states** that should never persist across sessions.

**Fix**:
```typescript
partialize: (state) => ({
  cart: state.cart,
  wishlist: state.wishlist,
  recentSearches: state.recentSearches,
}),
```

---

### 14. Realtime Channel — Broad Subscription

**File**: [__root.tsx](file:///e:/lovable%20orange/chrome-chrome-main/ecommerce/src/routes/__root.tsx#L268-L292)

The root component subscribes to realtime changes on **7 tables** for every single user, including anonymous visitors. This is expensive:
- Each realtime connection uses a WebSocket
- Storefront visitors don't need admin-triggered catalog change notifications — the `staleTime` on queries is sufficient

**Fix**:
- Only subscribe to realtime in the admin layout, not the storefront root
- For the storefront, rely on `staleTime` + periodic `refetchInterval` for freshness

---

### 15. QueryClient staleTime Mismatch

**File**: [router.tsx](file:///e:/lovable%20orange/chrome-chrome-main/ecommerce/src/router.tsx#L10)

Global `staleTime: 30000` (30s) but `settingsQuery` has `staleTime: 600000` (10min). The global is too short for catalog data that rarely changes, causing unnecessary refetches.

**Fix**:
- Set global `staleTime: 1000 * 60 * 5` (5min) for catalog queries
- Keep 30s only for user-specific queries (orders, profile)
- Add `gcTime` (garbage collection) to prevent memory buildup

---

## 🟢 PHASE 3 — Design, UX & Architecture

### 16. Accessibility Gaps

Found across multiple components:

| Issue | Location | Fix |
|-------|----------|-----|
| No skip-to-content link | [__root.tsx](file:///e:/lovable%20orange/chrome-chrome-main/ecommerce/src/routes/__root.tsx) | Add hidden skip link at top of body |
| Missing `alt` text on logo images | [Header.tsx](file:///e:/lovable%20orange/chrome-chrome-main/ecommerce/src/components/layout/Header.tsx#L163-L167) | Use store name for alt |
| No `aria-label` on filter/sort buttons | [ReviewsSection.tsx](file:///e:/lovable%20orange/chrome-chrome-main/ecommerce/src/components/shop/ReviewsSection.tsx#L433) | Add descriptive labels |
| No keyboard trap management on mobile nav | [Header.tsx](file:///e:/lovable%20orange/chrome-chrome-main/ecommerce/src/components/layout/Header.tsx#L354-L500) | Trap focus within modal |
| Color contrast — `text-muted-foreground` on dark bg | Multiple files | Verify WCAG AA ratio ≥ 4.5:1 |
| No `<h1>` on admin pages | Admin route files | Add heading hierarchy |

---

### 17. Checkout Page — UX Issues

**File**: [checkout.lazy.tsx](file:///e:/lovable%20orange/chrome-chrome-main/ecommerce/src/routes/checkout.lazy.tsx)

- **845 lines** — should be split into `ShippingStep`, `ReviewStep`, `PaymentStep` components
- No address auto-complete or validation (city/postal code)
- No form persistence — refreshing the page loses all entered data
- The `[first, last] = profile.name.split(" ")` pattern fails for single-name profiles, multi-word names
- Payment receipt upload and reference are duplicated identically for 3 payment methods (bank, easypaisa, jazzcash) — should be a shared component

**Fix**:
- Extract each step into its own component
- Store form state in sessionStorage or Zustand
- Create a `PaymentReceiptUploader` shared component
- Handle edge cases in name parsing

---

### 18. TypeScript Strictness Gaps

**Files**: Multiple

- `any` types used liberally: [admin.settings.lazy.tsx](file:///e:/lovable%20orange/chrome-chrome-main/ecommerce/src/routes/admin.settings.lazy.tsx#L17) (`useState<any>(null)`), [checkout.lazy.tsx](file:///e:/lovable%20orange/chrome-chrome-main/ecommerce/src/routes/checkout.lazy.tsx#L37-L41)
- `noUnusedLocals: false` and `noUnusedParameters: false` in [tsconfig.json](file:///e:/lovable%20orange/chrome-chrome-main/ecommerce/tsconfig.json#L19-L20) — leaves dead code undetected
- No explicit return types on many functions

**Fix**:
- Define proper interfaces for Settings, ShippingAddress, Coupon, Slide data shapes
- Enable `noUnusedLocals: true` and `noUnusedParameters: true` gradually
- Add return types to all server functions

---

### 19. Error Handling Improvements

**Files**: [order.functions.ts](file:///e:/lovable%20orange/chrome-chrome-main/ecommerce/src/lib/order.functions.ts), [catalog.functions.ts](file:///e:/lovable%20orange/chrome-chrome-main/ecommerce/src/lib/catalog.functions.ts)

- Server function errors throw raw `Error` objects with database error messages — these can leak schema information to clients
- No structured error responses — the client catches generic errors
- The order creation has a partial rollback (deletes order on item insert failure) but doesn't rollback stock decrements if later steps fail

**Fix**:
- Wrap server function errors in a sanitized `AppError` class
- Use database transactions for order creation (via Supabase RPC or `BEGIN/COMMIT`)
- Return structured `{ success, error, code }` responses

---

### 20. SEO & Core Web Vitals

| Metric | Issue | Fix |
|--------|-------|-----|
| **LCP** | Hero image has no `fetchpriority`, preloader blocks render | Add `fetchpriority="high"`, optimize preloader timing |
| **CLS** | Images without width/height | Add dimensions to all `<img>` |
| **INP** | Heavy framer-motion animations on scroll | Defer non-critical animations |
| **FCP** | Google Fonts render-blocking | Self-host fonts |
| **SEO** | No structured data (Product, BreadcrumbList, Organization) | Add JSON-LD schema |
| **SEO** | No `canonical` URL tags | Add via `head()` function |
| **SEO** | No sitemap.xml or robots.txt | Generate from product/category data |

---

### 21. Bundle Optimizations

Current manual chunk splitting in [vite.config.ts](file:///e:/lovable%20orange/chrome-chrome-main/ecommerce/vite.config.ts#L19-L36) is good but can be improved:

**Additional chunks to separate**:
- `@radix-ui/*` — 15+ Radix packages should be one chunk
- `zod` — only used in server functions, shouldn't be in client bundle
- `date-fns` — likely tree-shakeable but verify
- `embla-carousel-react` — only used on home and shop pages

**Fix**: Add these to `manualChunks` and verify with `npx vite-bundle-visualizer`.

---

## 🔵 PHASE 4 — Data Layer, Operational Resilience & Scalability (New)

### 22. Admin Mutations — All Client-Side with No Server Guard

**Files**: [admin.orders.lazy.tsx](file:///e:/lovable%20orange/chrome-chrome-main/ecommerce/src/routes/admin.orders.lazy.tsx#L77-L91), [admin.products.lazy.tsx](file:///e:/lovable%20orange/chrome-chrome-main/ecommerce/src/routes/admin.products.lazy.tsx#L138-L243), [admin.returns.lazy.tsx](file:///e:/lovable%20orange/chrome-chrome-main/ecommerce/src/routes/admin.returns.lazy.tsx#L35-L58), [admin.customers.lazy.tsx](file:///e:/lovable%20orange/chrome-chrome-main/ecommerce/src/routes/admin.customers.lazy.tsx#L64-L77)

Every admin mutation (update order, save product, delete variant, assign user role, manage returns) is done via **direct `supabase.from().update()/insert()/delete()` calls from the browser**. While RLS policies exist, this pattern has several issues:

- **No input validation** — admin can set order total to negative, set tax to 999999, etc.
- **No audit trail atomicity** — `logActivity()` fires after the mutation, not in a transaction. If the mutation succeeds but `logActivity` fails, the log is lost.
- **Race conditions** — Two admins updating the same order simultaneously can overwrite each other's changes (no optimistic locking / `updated_at` check).
- **Tax/total recalculation done in JS** — Lines like `total: detail.subtotal - detail.discount + val + detail.shipping` compute business-critical values client-side. A malicious admin could manipulate these.

**Fix**:
- Create server functions for all admin mutations: `updateOrderStatus()`, `saveProduct()`, `assignRole()`, etc.
- Validate all inputs with Zod schemas
- Compute totals server-side (or via a PostgreSQL trigger/function)
- Add optimistic locking using `updated_at` comparison

---

### 23. Order Number Collision Risk

**File**: [initial schema](file:///e:/lovable%20orange/chrome-chrome-main/ecommerce/supabase/migrations/20260528022147_ad52d33e-a997-4457-975d-990294c58b9e.sql#L176)

```sql
number TEXT NOT NULL UNIQUE DEFAULT ('MH-' || lpad((floor(random()*900000)+100000)::text, 6, '0'))
```

Order numbers are generated using `random()` — with a pool of only 900,000 values. As order count grows:
- At **~1,000 orders**, collision probability is ~0.06%
- At **~30,000 orders**, collision probability approaches **~40%** (birthday paradox)
- On collision, the `INSERT` fails and the order is lost

**Fix**:
- Use a PostgreSQL `SEQUENCE` for guaranteed uniqueness: `MH-` || `nextval('order_number_seq')`
- Or use a date-prefix pattern: `MH-20260711-0001`

---

### 24. Payment Receipts Bucket — Public Read Access

**File**: [manual payment migration](file:///e:/lovable%20orange/chrome-chrome-main/ecommerce/supabase/migrations/20260619101000_add_manual_payment_fields.sql#L20-L31)

```sql
INSERT INTO storage.buckets (id, name, public) VALUES ('payment-receipts', 'payment-receipts', true);
CREATE POLICY "Public read payment receipts" ON storage.objects FOR SELECT USING (bucket_id = 'payment-receipts');
```

Payment receipt screenshots (which may contain bank account numbers, transaction IDs, personal financial data) are **publicly readable by anyone** with the file URL. These URLs are stored in the `orders` table and are guessable (timestamp-based filenames).

**Fix**:
- Set bucket to `public: false`
- Create signed URLs for admin viewing (via a server function)
- Restrict read access to authenticated users with admin/staff role

---

### 25. No Pagination on Admin Data Tables

**Files**: [admin.orders.lazy.tsx](file:///e:/lovable%20orange/chrome-chrome-main/ecommerce/src/routes/admin.orders.lazy.tsx#L37), [admin.products.lazy.tsx](file:///e:/lovable%20orange/chrome-chrome-main/ecommerce/src/routes/admin.products.lazy.tsx#L80), [admin.customers.lazy.tsx](file:///e:/lovable%20orange/chrome-chrome-main/ecommerce/src/routes/admin.customers.lazy.tsx#L29-L33)

All admin pages fetch **every record in the table** on mount:
```typescript
supabase.from("orders").select("*").order("created_at", { ascending: false })  // ALL orders
supabase.from("profiles").select("*").order("created_at", { ascending: false }) // ALL customers
supabase.from("products").select("*").order("created_at", { ascending: false }) // ALL products
```

With growth, this causes:
- Slow page loads (fetching 10,000+ rows)
- Excessive memory usage in the browser
- Supabase row limit (default 1000) silently truncates results

**Fix**:
- Implement cursor-based or offset pagination (25-50 rows per page)
- Add server-side search instead of client-side `useMemo` filtering
- Show total count via `.select("*", { count: "exact", head: true })`

---

### 26. Admin Role Check Duplicated Per-Page

**Files**: Every admin page independently queries `user_roles`:
- [admin.lazy.tsx L46](file:///e:/lovable%20orange/chrome-chrome-main/ecommerce/src/routes/admin.lazy.tsx#L46) — `AdminGate`
- [admin.orders.lazy.tsx L44](file:///e:/lovable%20orange/chrome-chrome-main/ecommerce/src/routes/admin.orders.lazy.tsx#L44) — Orders
- [admin.products.lazy.tsx L96](file:///e:/lovable%20orange/chrome-chrome-main/ecommerce/src/routes/admin.products.lazy.tsx#L96) — Products
- [admin.settings.lazy.tsx L52](file:///e:/lovable%20orange/chrome-chrome-main/ecommerce/src/routes/admin.settings.lazy.tsx#L52) — Settings
- [admin.customers.lazy.tsx L47](file:///e:/lovable%20orange/chrome-chrome-main/ecommerce/src/routes/admin.customers.lazy.tsx#L47) — Customers

Each page fires its own `supabase.from("user_roles").select("role")` query. This is:
- **6+ redundant DB queries** on every admin navigation
- Inconsistent — some pages check for `admin` only, some check for `admin || staff`

**Fix**:
- Create a shared `useAdminRole()` hook or store the role in a React Context after the initial `AdminGate` check
- Use TanStack Query with `staleTime: Infinity` for the role check
- This eliminates ~5 duplicate queries per admin session

---

### 27. Stock Not Restored on Order Cancellation

**File**: [admin.orders.lazy.tsx](file:///e:/lovable%20orange/chrome-chrome-main/ecommerce/src/routes/admin.orders.lazy.tsx#L122-L153)

When an admin cancels an order, the status is set to `"cancelled"` but:
- **Stock is never returned** to the product variants
- The `decrement_variant_stock` RPC was called during checkout, but there's no corresponding `increment_variant_stock` for cancellation
- Over time, phantom stock deductions accumulate

**Fix**:
- Create a `restore_variant_stock` RPC that reverses the decrement
- Call it from a server function when order status → `cancelled` or `returned`
- Add a `product_stock_audit` table for stock movement tracking

---

### 28. `window.prompt()` Used for Business Logic

**File**: [admin.orders.lazy.tsx L95](file:///e:/lovable%20orange/chrome-chrome-main/ecommerce/src/routes/admin.orders.lazy.tsx#L95)

```typescript
const reason = window.prompt("Enter payment decline reason...");
```

`window.prompt()` is:
- Blocked by many browsers (Safari blocks it in cross-origin iframes)
- Not styleable — breaks the admin panel's design language
- Has no validation — empty/null returns are handled but poorly

The app already has a `useConfirm()` hook and dialog system — this should use it.

**Fix**: Replace `window.prompt` with a custom modal dialog component that matches the admin design system.

---

### 29. Deprecated `getSession()` Pattern

**Files**: 20+ files across the codebase use `supabase.auth.getSession()`

Supabase has deprecated `getSession()` in favor of `getUser()` because:
- `getSession()` reads from localStorage and **does not validate** the JWT with Supabase's servers
- A tampered JWT in localStorage would pass `getSession()` checks
- `getUser()` makes a network request to verify the token

**Impact**: Components that use `getSession()` for security decisions (ReviewsSection, admin pages, checkout) may accept expired or tampered tokens.

**Fix**:
- Replace `getSession()` with `getUser()` in all security-sensitive paths
- Keep `getSession()` only for non-sensitive reads (e.g., prefilling form fields)

---

### 30. No Database Backup / Point-in-Time Recovery Strategy

**File**: [supabase/config.toml](file:///e:/lovable%20orange/chrome-chrome-main/ecommerce/supabase/config.toml)

The config is minimal (35 bytes). There's no evidence of:
- Database backup configuration
- Point-in-time recovery (PITR) enabled on Supabase
- Soft-delete patterns for orders, products, or customers

If someone accidentally deletes all products (the admin delete button exists with only a confirm dialog), there's no recovery path.

**Fix**:
- Enable PITR on Supabase (requires Pro plan)
- Add `deleted_at` soft-delete column to critical tables (products, orders)
- Consider daily pg_dump exports to a separate S3-compatible bucket

---

### 31. No Rate Limiting on Order Creation

**File**: [order.functions.ts](file:///e:/lovable%20orange/chrome-chrome-main/ecommerce/src/lib/order.functions.ts)

The `createOrder` server function has `requireSupabaseAuth` middleware but no rate limiting. A malicious authenticated user could:
- Create hundreds of orders in seconds
- Exhaust all product stock via `decrement_variant_stock` RPC calls
- Generate thousands of order numbers, accelerating the collision problem (§23)

**Fix**:
- Add per-user rate limiting (e.g., max 5 orders per 10 minutes)
- Implement a debounce check: if last order was < 30 seconds ago, reject
- Use Cloudflare Workers rate limiting or a simple Redis/KV counter

---

## Verification Plan

### Automated Tests
```bash
# Build validation — ensure no TypeScript errors
npm run build

# Bundle size analysis
npx vite-bundle-visualizer

# Lint check
npm run lint

# Check for leaked secrets in git history
git log --all --oneline -- .env
```

### Manual Verification
- **Lighthouse audit** before and after changes (Performance, Accessibility, Best Practices, SEO scores)
- **Security**: Attempt to access admin panel without credentials, attempt coupon brute-force
- **Mobile**: Test checkout flow on iPhone Safari and Android Chrome
- **Performance**: Measure Time to Interactive and Largest Contentful Paint using Chrome DevTools

### Key Metrics to Track
| Metric | Current (estimated) | Target |
|--------|-------------------|--------|
| Lighthouse Performance | ~60-70 | 90+ |
| LCP | ~3-4s | < 2.5s |
| CLS | ~0.15+ | < 0.1 |
| Main bundle size | ~300KB+ gzip | < 180KB gzip |
| Time to Interactive | ~4-5s | < 3s |
