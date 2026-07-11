# Admin-Controlled Hero Section & Branding

Make hero slides and store branding (logo, name) fully manageable from Admin → Settings.

## Current State

| Area | Current | Problem |
|------|---------|---------|
| **Hero slides** | Hard-coded array of 3 slides in [HeroSlider.tsx](file:///e:/lovable%20orange/chrome-chrome-main/ecommerce/src/components/home/HeroSlider.tsx) with static images imported from `@/assets/` | Cannot change images, text, or buttons without code deploy |
| **Logo** | SVG component in [Logo.tsx](file:///e:/lovable%20orange/chrome-chrome-main/ecommerce/src/components/layout/Logo.tsx), no DB backing | Cannot update logo from admin |
| **Store name** | `store_name` column exists in `settings` table but is only used in invoices, not in header/footer | Store name not dynamically rendered in storefront |
| **Settings page** | [admin.settings.tsx](file:///e:/lovable%20orange/chrome-chrome-main/ecommerce/src/routes/admin.settings.tsx) has basic text fields for `hero_headline` / `hero_subline` | No image uploads, no per-slide control, no logo upload |
| **Storage** | Buckets exist: `product-images`, `brand-logos`, `category-images`, `invoices`, `payment-receipts` | No bucket for hero/storefront assets |
| **ImageUpload** | [ImageUpload.tsx](file:///e:/lovable%20orange/chrome-chrome-main/ecommerce/src/components/admin/ImageUpload.tsx) supports `product-images`, `brand-logos`, `category-images` | Need to add `store-assets` bucket support |

---

## User Review Required

> [!IMPORTANT]
> **Hero slide count**: The plan supports unlimited slides (admin can add/remove). Each slide has: image, kicker text, title line 1, title line 2, subtitle, primary CTA (label + link), secondary CTA (label + link), and stat badge (number + label). Is this the right set of fields per slide, or do you want to simplify?

> [!IMPORTANT]
> **Logo behavior**: When a logo image URL is uploaded from admin, it will replace the SVG `Logo` component with an `<img>` tag. When no logo is uploaded, the current SVG fallback will be shown. Is this the desired behavior?

## Open Questions

1. Should each hero slide also have a display order field, or should the order be based on creation time?
2. Should there be an "active/inactive" toggle per slide so you can prepare slides without showing them?

---

## Proposed Changes

### Database — New `hero_slides` Table & Settings Columns

#### [NEW] `20260621000000_hero_slides_and_branding.sql`

**New table `hero_slides`** to store individual slide data:

```sql
CREATE TABLE public.hero_slides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  position INTEGER NOT NULL DEFAULT 0,
  image_url TEXT NOT NULL,
  kicker TEXT,              -- e.g. "APEX RS1 / CARBON SERIES"
  title_line1 TEXT,         -- e.g. "ENGINEERED"
  title_line2 TEXT,         -- e.g. "FOR THE APEX"
  subtitle TEXT,            -- paragraph below title
  cta_label TEXT,           -- primary button label
  cta_link TEXT,            -- primary button URL
  alt_cta_label TEXT,       -- secondary button label
  alt_cta_link TEXT,        -- secondary button URL
  stat_number TEXT,         -- e.g. "1,180g"
  stat_label TEXT,          -- e.g. "Shell Weight"
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

- RLS: public read, admin/staff write
- Auto-`updated_at` trigger

**New storage bucket** `store-assets` (public) for hero images + logo:
- Public read, admin write/update/delete policies

**Update `ImageUpload` component** to accept `store-assets` as a bucket option.

**Settings table** already has `logo_url` and `store_name` columns — no schema change needed, just need to wire them up in the admin UI and storefront.

**Update TypeScript types** to include the new `hero_slides` table and the `store-assets` bucket type.

---

### Admin Settings UI

#### [MODIFY] [admin.settings.tsx](file:///e:/lovable%20orange/chrome-chrome-main/ecommerce/src/routes/admin.settings.tsx)

Expand the settings page with two new sections:

**Section: "Branding"** (placed at the top)
- **Logo upload**: `ImageUpload` component using `store-assets` bucket, bound to `settings.logo_url`. Shows current logo with delete button.
- **Store Name**: Text input bound to `settings.store_name` (already wired, just need to ensure it saves).

**Section: "Hero Slides"** (replaces old "Storefront copy" section)
- List of existing slides, each showing:
  - Thumbnail of the hero image
  - Kicker, title, subtitle preview
  - CTA labels
  - Active/inactive toggle
  - Edit / Delete buttons
  - Drag handle or position number for ordering
- **"Add Slide" button** opens an inline form / expander with:
  - Image upload (required)
  - Kicker, Title Line 1, Title Line 2, Subtitle text inputs
  - Primary CTA: label + link
  - Secondary CTA: label + link
  - Stat: number + label
  - Active toggle
- **Edit mode**: Same form pre-filled with existing data
- **Delete**: Confirmation then removes from DB

---

### Storefront Components

#### [MODIFY] [HeroSlider.tsx](file:///e:/lovable%20orange/chrome-chrome-main/ecommerce/src/components/home/HeroSlider.tsx)

- Remove hard-coded `slides` array and static image imports (`hero1`, `hero2`, `hero3`)
- Accept a `slides` prop (or fetch via `useQuery` with a new `heroSlidesQuery`)
- Render dynamically from DB data
- Fallback: if no slides exist in DB, show a single default slide with store name

#### [MODIFY] [index.tsx](file:///e:/lovable%20orange/chrome-chrome-main/ecommerce/src/routes/index.tsx)

- Import and use `heroSlidesQuery` to prefetch hero data in the route loader
- Pass fetched slides to `HeroSlider`

#### [MODIFY] [Header.tsx](file:///e:/lovable%20orange/chrome-chrome-main/ecommerce/src/components/layout/Header.tsx)

- Fetch settings via `useQuery(settingsQuery())`
- If `settings.logo_url` is set, render `<img src={settings.logo_url}>` instead of `<Logo />`
- Display `settings.store_name` alongside or below the logo (or use "HELM" as fallback)

#### [MODIFY] [Footer.tsx](file:///e:/lovable%20orange/chrome-chrome-main/ecommerce/src/components/layout/Footer.tsx)

- Same dynamic logo/name rendering as Header

#### [MODIFY] [AuthPage.tsx](file:///e:/lovable%20orange/chrome-chrome-main/ecommerce/src/components/auth/AuthPage.tsx)

- Same dynamic logo/name rendering in left brand panel

---

### Query & Data Layer

#### [MODIFY] [catalog-queries.ts](file:///e:/lovable%20orange/chrome-chrome-main/ecommerce/src/lib/catalog-queries.ts)

Add new query:
```ts
export const heroSlidesQuery = () =>
  queryOptions({
    queryKey: ["catalog", "hero-slides"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hero_slides")
        .select("*")
        .eq("is_active", true)
        .order("position", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 1000 * 60 * 5,
  });
```

#### [MODIFY] [ImageUpload.tsx](file:///e:/lovable%20orange/chrome-chrome-main/ecommerce/src/components/admin/ImageUpload.tsx)

- Update `bucket` type to include `"store-assets"`: 
  ```ts
  bucket: "product-images" | "brand-logos" | "category-images" | "store-assets";
  ```

#### [MODIFY] [types.ts](file:///e:/lovable%20orange/chrome-chrome-main/ecommerce/src/integrations/supabase/types.ts)

- Add `hero_slides` table definition (Row, Insert, Update, Relationships)

---

### Realtime Invalidation

#### [MODIFY] [__root.tsx](file:///e:/lovable%20orange/chrome-chrome-main/ecommerce/src/routes/__root.tsx)

- Add realtime listener for `hero_slides` and `settings` table changes to auto-invalidate storefront queries when admin edits content:
  ```ts
  .on("postgres_changes", { event: "*", schema: "public", table: "hero_slides" }, bump)
  .on("postgres_changes", { event: "*", schema: "public", table: "settings" }, bump)
  ```

---

## File Change Summary

| File | Action | Description |
|------|--------|-------------|
| `supabase/migrations/20260621000000_hero_slides_and_branding.sql` | **NEW** | Create `hero_slides` table, `store-assets` bucket, RLS policies |
| [types.ts](file:///e:/lovable%20orange/chrome-chrome-main/ecommerce/src/integrations/supabase/types.ts) | MODIFY | Add `hero_slides` table types |
| [ImageUpload.tsx](file:///e:/lovable%20orange/chrome-chrome-main/ecommerce/src/components/admin/ImageUpload.tsx) | MODIFY | Add `store-assets` bucket |
| [catalog-queries.ts](file:///e:/lovable%20orange/chrome-chrome-main/ecommerce/src/lib/catalog-queries.ts) | MODIFY | Add `heroSlidesQuery` |
| [admin.settings.tsx](file:///e:/lovable%20orange/chrome-chrome-main/ecommerce/src/routes/admin.settings.tsx) | MODIFY | Add Branding + Hero Slides management UI |
| [HeroSlider.tsx](file:///e:/lovable%20orange/chrome-chrome-main/ecommerce/src/components/home/HeroSlider.tsx) | MODIFY | Make dynamic from DB |
| [index.tsx](file:///e:/lovable%20orange/chrome-chrome-main/ecommerce/src/routes/index.tsx) | MODIFY | Prefetch hero slides |
| [Header.tsx](file:///e:/lovable%20orange/chrome-chrome-main/ecommerce/src/components/layout/Header.tsx) | MODIFY | Dynamic logo + store name |
| [Footer.tsx](file:///e:/lovable%20orange/chrome-chrome-main/ecommerce/src/components/layout/Footer.tsx) | MODIFY | Dynamic logo + store name |
| [AuthPage.tsx](file:///e:/lovable%20orange/chrome-chrome-main/ecommerce/src/components/auth/AuthPage.tsx) | MODIFY | Dynamic logo + store name |
| [__root.tsx](file:///e:/lovable%20orange/chrome-chrome-main/ecommerce/src/routes/__root.tsx) | MODIFY | Realtime invalidation for hero_slides + settings |

---

## Verification Plan

### Manual Verification
1. **Admin → Settings**: Upload a logo image → verify it appears in Header, Footer, and Auth pages immediately
2. **Admin → Settings**: Change store name → verify it updates across the storefront
3. **Admin → Settings → Hero Slides**: Add a new slide with image, text, buttons → verify it appears on home page
4. **Admin → Settings → Hero Slides**: Edit an existing slide → changes reflect on home page
5. **Admin → Settings → Hero Slides**: Delete a slide → removed from home page
6. **Admin → Settings → Hero Slides**: Toggle a slide inactive → hidden from home page but still visible in admin
7. **Admin → Settings → Hero Slides**: Reorder slides → order changes on home page
8. **Fallback**: Delete all slides → home page shows graceful empty state or default
9. **Mobile**: Verify hero controls still don't overlap with bottom nav (prior fix)
10. **Realtime**: Edit settings/slides in one tab → another storefront tab auto-updates
