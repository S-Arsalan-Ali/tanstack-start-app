-- ============================================================================
-- MIGRATION: Add mobile_image_url to hero_slides
-- ============================================================================
-- PURPOSE:
--   Adds an optional `mobile_image_url` column to the `hero_slides` table.
--   This allows admins to upload a separate portrait-cropped image optimized
--   for mobile/tablet viewports (< 1024px), while keeping the existing
--   `image_url` as the desktop/landscape version.
--
-- HOW IT WORKS:
--   - The column is nullable (TEXT, no NOT NULL constraint).
--   - If `mobile_image_url` is NULL, the storefront falls back to `image_url`
--     for all viewports — identical to the current behavior.
--   - If set, the frontend uses an HTML <picture> element with a
--     `<source media="(min-width: 1024px)">` for the desktop image,
--     and the `<img src="mobile_image_url">` as the default/mobile fallback.
--
-- BACKWARD COMPATIBILITY:
--   - Zero breaking changes. All existing slides continue to work unchanged.
--   - No RLS policy changes needed (same row, same policies apply).
--   - No index changes needed (column is not queried/filtered).
-- ============================================================================

ALTER TABLE public.hero_slides
  ADD COLUMN mobile_image_url TEXT;

-- NOTE: No additional grants or RLS changes required.
-- The existing policies on hero_slides already cover SELECT/INSERT/UPDATE/DELETE
-- for the entire row, so the new column is automatically included.
