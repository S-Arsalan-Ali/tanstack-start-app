# Responsive Hero Section — Separate Desktop & Mobile Images + Layouts

## Problem

The current hero section uses a **single `image_url`** per slide, rendered identically across all viewport sizes. This causes:

- **Landscape images** cropped poorly on portrait mobile screens (key subject matter cut off)
- **Text overlay positioning** that works on desktop but overlaps or becomes unreadable on small screens
- No ability for the admin to upload a **mobile-optimized crop/version** of a hero banner

## What This Changes

1. **Each hero slide gets TWO image slots**: `image_url` (desktop, landscape) + `mobile_image_url` (mobile, portrait crop)
2. **The `<HeroSlider>` component** uses the HTML `<picture>` element with `<source media="...">` for **art direction** — the browser natively picks the right image with zero JS overhead
3. **The admin panel** gets a second `ImageUpload` side-by-side labeled "Mobile Image" for each slide
4. **The text layout** is tuned separately for mobile vs desktop using responsive utility classes (already partially done, this plan polishes it)

---

## User Review Required

> [!IMPORTANT]
> **Mobile image is optional.** If no mobile image is uploaded, the system falls back to the existing desktop `image_url` with `object-cover` — identical to current behavior. This means **zero breaking changes** for slides already created.

> [!IMPORTANT]
> **Default fallback slides** (the 3 hardcoded slides in `HeroSlider.tsx` using bundled `.webp` assets) — should we also create mobile-cropped versions of these? This would require generating/providing 3 additional mobile-optimized images. We can skip this and only apply the feature to admin-uploaded slides.

---

## Open Questions

> [!IMPORTANT]
> **Mobile breakpoint**: The plan uses `768px` (Tailwind's `md`) as the breakpoint between mobile and desktop images. The `<picture>` `<source>` tag will use `(min-width: 768px)` for desktop and the `<img>` fallback for mobile. Is this breakpoint acceptable, or should tablet (1024px / `lg`) be the switch point?

> [!NOTE]
> **Mobile layout adjustments**: Currently the hero text uses responsive Tailwind classes (`text-[14vw] sm:text-[10vw] md:text-[8rem]`). The plan includes tightening mobile-specific spacing, padding, and gradient overlays for better readability. No structural layout changes beyond image swapping are proposed.

---

## Proposed Changes

### Database — Supabase Migration

#### [NEW] [20260627000000_add_mobile_image_to_hero_slides.sql](file:///e:/lovable orange/chrome-chrome-main/ecommerce/supabase/migrations/20260627000000_add_mobile_image_to_hero_slides.sql)

Add a nullable `mobile_image_url` column to `hero_slides`:

```sql
ALTER TABLE public.hero_slides
  ADD COLUMN mobile_image_url TEXT;
```

- Nullable = fully backward-compatible (existing slides remain unchanged)
- No RLS changes needed (same row, same policies)

---

### TypeScript Types

#### [MODIFY] [types.ts](file:///e:/lovable orange/chrome-chrome-main/ecommerce/src/integrations/supabase/types.ts)

Add `mobile_image_url` to the `hero_slides` Row, Insert, and Update interfaces:

```diff
 hero_slides: {
   Row: {
+    mobile_image_url: string | null
     ...existing fields...
   }
   Insert: {
+    mobile_image_url?: string | null
     ...existing fields...
   }
   Update: {
+    mobile_image_url?: string | null
     ...existing fields...
   }
 }
```

---

### Admin Panel — Slide Editor

#### [MODIFY] [admin.settings.lazy.tsx](file:///e:/lovable orange/chrome-chrome-main/ecommerce/src/routes/admin.settings.lazy.tsx)

**Changes:**

1. **Slide editor form** (~line 464–470): Replace the single `ImageUpload` with a **side-by-side grid** containing:
   - **Desktop Image** (`image_url`) — existing upload, relabeled "Desktop / Landscape Image (required)"
   - **Mobile Image** (`mobile_image_url`) — new upload, labeled "Mobile / Portrait Image (optional)"
   - Both use the existing `ImageUpload` component uploading to `store-assets` bucket

2. **`saveSlide` payload** (~line 167): Add `mobile_image_url: editingSlide.mobile_image_url || null`

3. **`isSlideDirty` keys** (~line 205): Add `"mobile_image_url"` to the comparison keys array

4. **Fresh slide template** (~line 673): Add `mobile_image_url: ""`

5. **Slide list preview** (~line 587–594): Show a small badge "MOBILE" under the thumbnail if `mobile_image_url` is set

---

### HeroSlider Component — Art Direction

#### [MODIFY] [HeroSlider.tsx](file:///e:/lovable orange/chrome-chrome-main/ecommerce/src/components/home/HeroSlider.tsx)

**Key change:** Replace the `<img>` tag (~line 98–104) with an HTML `<picture>` element:

```tsx
<picture>
  {/* Desktop source — only used at md+ breakpoint */}
  <source media="(min-width: 768px)" srcSet={s.img} />
  {/* Mobile fallback — used below 768px, falls back to desktop if no mobile image */}
  <img
    src={s.mobileImg || s.img}
    alt=""
    className="size-full object-cover"
    loading="eager"
    fetchPriority="high"
  />
</picture>
```

**Slide data mapping** (~line 50–61): Add `mobileImg` field:

```diff
 .map((s: any) => ({
   img: s.image_url,
+  mobileImg: s.mobile_image_url || null,
   kicker: s.kicker || "",
   ...
 }))
```

**Default slides** (~line 11–41): Add `mobileImg: null` to each (no mobile versions for bundled defaults).

**Mobile layout polish** (existing responsive classes, minimal adjustments):
- Tighten bottom padding on mobile for better CTA button visibility
- Adjust gradient overlay for mobile to ensure text contrast on portrait images

---

### LCP Preload Optimization

#### [MODIFY] [index.tsx](file:///e:/lovable orange/chrome-chrome-main/ecommerce/src/routes/index.tsx)

Currently preloads the first slide's `image_url`. We should add a second preload for the mobile image when available:

```diff
 links: lcpUrl ? [
   { rel: "preload", as: "image", href: lcpUrl, fetchPriority: "high" },
+  ...(mobileLcpUrl ? [{ rel: "preload", as: "image", href: mobileLcpUrl, media: "(max-width: 767px)", fetchPriority: "high" }] : []),
 ] : []
```

And conditionally preload the desktop image only for `(min-width: 768px)`:

```diff
-  { rel: "preload", as: "image", href: lcpUrl, fetchPriority: "high" }
+  { rel: "preload", as: "image", href: lcpUrl, media: "(min-width: 768px)", fetchPriority: "high" }
```

---

## Summary of Files Changed

| File | Action | What |
|------|--------|------|
| `supabase/migrations/20260627000000_...sql` | **NEW** | Add `mobile_image_url` column |
| `src/integrations/supabase/types.ts` | MODIFY | Add field to TS types |
| `src/routes/admin.settings.lazy.tsx` | MODIFY | Dual image upload in slide editor |
| `src/components/home/HeroSlider.tsx` | MODIFY | `<picture>` art direction |
| `src/routes/index.tsx` | MODIFY | Conditional LCP preload |

---

## Verification Plan

### Automated Tests
- `npx supabase db push` or `apply_migration` to verify migration applies cleanly

### Manual Verification
1. **Admin panel**: Open Settings → Storefront → Hero Slides → Edit/Create a slide → verify two image upload slots appear side by side
2. **Upload test**: Upload a portrait mobile image and a landscape desktop image to the same slide
3. **Desktop browser**: Resize browser to >768px — confirm desktop image renders
4. **Mobile browser / DevTools**: Resize to <768px — confirm mobile image renders
5. **Fallback test**: Create a slide with only a desktop image (no mobile) — verify it renders on both views without errors
6. **LCP check**: Open Chrome DevTools → Lighthouse → verify no LCP regression
7. **Existing slides**: Confirm slides created before this change still display correctly (backward compat)
