-- ============= HERO SLIDES TABLE =============
-- Each slide supports two images for responsive art direction:
--   • image_url         → Desktop/landscape hero banner (required, used at ≥1024px)
--   • mobile_image_url  → Mobile/portrait hero banner (optional, used at <1024px)
-- If mobile_image_url is NULL the frontend falls back to image_url for all viewports.
CREATE TABLE public.hero_slides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  position INTEGER NOT NULL DEFAULT 0,
  image_url TEXT NOT NULL,
  mobile_image_url TEXT,          -- Optional portrait-cropped image for phone/tablet (<1024px)
  kicker TEXT,
  title_line1 TEXT,
  title_line2 TEXT,
  subtitle TEXT,
  cta_label TEXT,
  cta_link TEXT,
  alt_cta_label TEXT,
  alt_cta_link TEXT,
  stat_number TEXT,
  stat_label TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.hero_slides TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.hero_slides TO authenticated;
GRANT ALL ON public.hero_slides TO service_role;

ALTER TABLE public.hero_slides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hero slides public read" ON public.hero_slides FOR SELECT USING (true);
CREATE POLICY "Hero slides admin write" ON public.hero_slides FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

CREATE TRIGGER hero_slides_updated_at BEFORE UPDATE ON public.hero_slides
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============= STORE-ASSETS STORAGE BUCKET =============
INSERT INTO storage.buckets (id, name, public)
VALUES ('store-assets', 'store-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Public read
DROP POLICY IF EXISTS "Public read store assets" ON storage.objects;
CREATE POLICY "Public read store assets" ON storage.objects
  FOR SELECT USING (bucket_id = 'store-assets');

-- Admin write
DROP POLICY IF EXISTS "Admin write store assets" ON storage.objects;
CREATE POLICY "Admin write store assets" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'store-assets' AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff')));

-- Admin update
DROP POLICY IF EXISTS "Admin update store assets" ON storage.objects;
CREATE POLICY "Admin update store assets" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'store-assets' AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff')));

-- Admin delete
DROP POLICY IF EXISTS "Admin delete store assets" ON storage.objects;
CREATE POLICY "Admin delete store assets" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'store-assets' AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff')));
