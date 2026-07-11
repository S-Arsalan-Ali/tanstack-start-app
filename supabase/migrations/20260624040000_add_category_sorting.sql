-- ============================================================================
-- Add position to categories for storefront lineup order control
-- ============================================================================

-- Add position column for category sorting/ordering (default to 0)
ALTER TABLE public.categories 
ADD COLUMN IF NOT EXISTS position INTEGER NOT NULL DEFAULT 0;

-- Comment on column for explanation in Supabase dashboard
COMMENT ON COLUMN public.categories.position IS 'Display sorting order in storefront lists and lineups';
