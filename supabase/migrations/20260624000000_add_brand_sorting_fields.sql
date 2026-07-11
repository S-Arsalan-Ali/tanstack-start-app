-- ============================================================================
-- Add position & show_in_slider to brands for homepage slider control
-- ============================================================================

-- Add position column for brand sorting/ordering (default to 0)
ALTER TABLE public.brands 
ADD COLUMN IF NOT EXISTS position INTEGER NOT NULL DEFAULT 0;

-- Add show_in_slider column to toggle visibility on homepage brand slider (default to true)
ALTER TABLE public.brands 
ADD COLUMN IF NOT EXISTS show_in_slider BOOLEAN NOT NULL DEFAULT true;

-- Comment on columns for explanation in Supabase dashboard
COMMENT ON COLUMN public.brands.position IS 'Display sorting order in storefront lists and brand sliders';
COMMENT ON COLUMN public.brands.show_in_slider IS 'Flag to determine if this brand is displayed in the home brand slider';
