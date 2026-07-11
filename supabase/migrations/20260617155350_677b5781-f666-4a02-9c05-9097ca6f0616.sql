
-- product_reviews table -----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.product_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  author_name text NOT NULL,
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title text,
  body text,
  verified boolean NOT NULL DEFAULT false,
  helpful integer NOT NULL DEFAULT 0,
  helmet_size text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_product_reviews_product ON public.product_reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_user ON public.product_reviews(user_id);
GRANT SELECT ON public.product_reviews TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.product_reviews TO authenticated;
GRANT ALL ON public.product_reviews TO service_role;
ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Reviews public read" ON public.product_reviews;
CREATE POLICY "Reviews public read" ON public.product_reviews FOR SELECT USING (true);
DROP POLICY IF EXISTS "Reviews owner insert" ON public.product_reviews;
CREATE POLICY "Reviews owner insert" ON public.product_reviews FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Reviews owner or staff update" ON public.product_reviews;
CREATE POLICY "Reviews owner or staff update" ON public.product_reviews FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(),'admin') OR has_role(auth.uid(),'staff'))
  WITH CHECK (auth.uid() = user_id OR has_role(auth.uid(),'admin') OR has_role(auth.uid(),'staff'));
DROP POLICY IF EXISTS "Reviews owner or staff delete" ON public.product_reviews;
CREATE POLICY "Reviews owner or staff delete" ON public.product_reviews FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(),'admin') OR has_role(auth.uid(),'staff'));
DROP TRIGGER IF EXISTS set_product_reviews_updated_at ON public.product_reviews;
CREATE TRIGGER set_product_reviews_updated_at BEFORE UPDATE ON public.product_reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- GRANT audit on public-read tables -----------------------------------------
GRANT SELECT ON public.products, public.product_images, public.product_variants,
                public.categories, public.brands, public.settings TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products, public.product_images,
      public.product_variants, public.categories, public.brands, public.settings TO authenticated;
GRANT ALL ON public.products, public.product_images, public.product_variants,
             public.categories, public.brands, public.settings TO service_role;

-- Seed product_images (URLs: "local:<key>" — resolved to bundled assets) -----
WITH src(slug, urls) AS (VALUES
  ('apex-rs1-carbon',          ARRAY['local:p1','local:p3','local:p2']),
  ('shadow-pro-matte',         ARRAY['local:p2','local:p1']),
  ('carbon-zero',              ARRAY['local:p3','local:p1']),
  ('circuit-gp',               ARRAY['local:p4']),
  ('flux-modular-silver',      ARRAY['local:p5']),
  ('transit-flip',             ARRAY['local:p6']),
  ('raid-adv-white',           ARRAY['local:p7']),
  ('rampage-mx',               ARRAY['local:p8']),
  ('heritage-cafe',            ARRAY['local:p9']),
  ('vector-urban',             ARRAY['local:p10']),
  ('checker-racer',            ARRAY['local:p11']),
  ('summit-touring',           ARRAY['local:p12']),
  ('apex-race-gloves',         ARRAY['local:a1']),
  ('iridium-replacement-visor',ARRAY['local:a2']),
  ('pinlock-70-insert',        ARRAY['local:a2']),
  ('alloy-phone-mount',        ARRAY['local:a4']),
  ('gopro-helmet-mount',       ARRAY['local:a4']),
  ('tank-bag-pro',             ARRAY['local:a5']),
  ('comms-pro-bluetooth',      ARRAY['local:a3']),
  ('trail-goggles-fire',       ARRAY['local:a6']),
  ('carbon-key-fob',           ARRAY['local:a1'])
)
INSERT INTO public.product_images (product_id, url, alt, position)
SELECT p.id, u.url, p.name, u.pos
FROM src
JOIN public.products p ON p.slug = src.slug
JOIN LATERAL unnest(src.urls) WITH ORDINALITY AS u(url, pos) ON true
WHERE NOT EXISTS (SELECT 1 FROM public.product_images pi WHERE pi.product_id = p.id);

-- Seed product_variants (color × size matrix using jsonb) -------------------
WITH src(slug, colors_json, sizes) AS (VALUES
  ('apex-rs1-carbon',          '[{"n":"Inferno","h":"#ff3b00"},{"n":"Stealth","h":"#0a0a0a"}]'::jsonb, ARRAY['XS','S','M','L','XL']),
  ('shadow-pro-matte',         '[{"n":"Matte Black","h":"#1a1a1a"}]'::jsonb, ARRAY['S','M','L','XL']),
  ('carbon-zero',              '[{"n":"Raw Carbon","h":"#2a2a2a"}]'::jsonb, ARRAY['S','M','L','XL']),
  ('circuit-gp',               '[{"n":"Inferno","h":"#ff3b00"},{"n":"Arctic","h":"#f5f5f5"}]'::jsonb, ARRAY['XS','S','M','L','XL']),
  ('flux-modular-silver',      '[{"n":"Titanium","h":"#c0c0c0"},{"n":"Onyx","h":"#1a1a1a"}]'::jsonb, ARRAY['S','M','L','XL']),
  ('transit-flip',             '[{"n":"Onyx","h":"#0a0a0a"}]'::jsonb, ARRAY['S','M','L','XL']),
  ('raid-adv-white',           '[{"n":"Arctic","h":"#f5f5f5"},{"n":"Tactical","h":"#3a3a30"}]'::jsonb, ARRAY['S','M','L','XL']),
  ('rampage-mx',               '[{"n":"Hi-Vis","h":"#ffe000"},{"n":"Stealth","h":"#0a0a0a"}]'::jsonb, ARRAY['S','M','L','XL']),
  ('heritage-cafe',            '[{"n":"Bone","h":"#f0e6d2"},{"n":"Espresso","h":"#3a2418"}]'::jsonb, ARRAY['S','M','L','XL']),
  ('vector-urban',             '[{"n":"Matte Black","h":"#1a1a1a"},{"n":"Cement","h":"#7a7a7a"}]'::jsonb, ARRAY['XS','S','M','L']),
  ('checker-racer',            '[{"n":"Race Red","h":"#e83b2f"}]'::jsonb, ARRAY['S','M','L','XL']),
  ('summit-touring',           '[{"n":"Cobalt","h":"#1d4ed8"}]'::jsonb, ARRAY['S','M','L','XL']),
  ('apex-race-gloves',         '[{"n":"Inferno","h":"#ff3b00"}]'::jsonb, ARRAY['S','M','L','XL']),
  ('iridium-replacement-visor','[{"n":"Iridium Red","h":"#e83b2f"}]'::jsonb, ARRAY['Universal']),
  ('pinlock-70-insert',        '[{"n":"Clear","h":"#f5f5f5"}]'::jsonb, ARRAY['Universal']),
  ('alloy-phone-mount',        '[{"n":"Anodized Black","h":"#1a1a1a"}]'::jsonb, ARRAY['22-32mm']),
  ('gopro-helmet-mount',       '[{"n":"Black","h":"#0a0a0a"}]'::jsonb, ARRAY['Universal']),
  ('tank-bag-pro',             '[{"n":"Tactical Black","h":"#1a1a1a"}]'::jsonb, ARRAY['18L']),
  ('comms-pro-bluetooth',      '[{"n":"Black","h":"#0a0a0a"}]'::jsonb, ARRAY['Universal']),
  ('trail-goggles-fire',       '[{"n":"Inferno","h":"#ff3b00"}]'::jsonb, ARRAY['Universal']),
  ('carbon-key-fob',           '[{"n":"Raw Carbon","h":"#2a2a2a"}]'::jsonb, ARRAY['One Size'])
)
INSERT INTO public.product_variants (product_id, color, color_hex, size, sku, stock)
SELECT p.id,
       c->>'n',
       c->>'h',
       sz,
       upper(regexp_replace(p.slug,'[^a-z0-9]','','g')) || '-' ||
       upper(regexp_replace(c->>'n','[^A-Za-z0-9]','','g')) || '-' || sz,
       (20 + floor(random()*40))::int
FROM src
JOIN public.products p ON p.slug = src.slug
JOIN LATERAL jsonb_array_elements(src.colors_json) AS c ON true
JOIN LATERAL unnest(src.sizes) AS sz ON true
WHERE NOT EXISTS (SELECT 1 FROM public.product_variants v WHERE v.product_id = p.id);

-- Sync product stock from variants ------------------------------------------
UPDATE public.products p
SET stock = COALESCE(s.total, p.stock)
FROM (SELECT product_id, SUM(stock)::int AS total FROM public.product_variants GROUP BY product_id) s
WHERE s.product_id = p.id;

-- Seed product_reviews ------------------------------------------------------
WITH src(slug, author_name, rating, title, body, verified, helpful, helmet_size) AS (VALUES
  ('apex-rs1-carbon','Marco V.',5,'Track-ready out of the box','Did three sessions at Mugello — visor stayed clear, ventilation is on another level. The shell weight is noticeable after the third stint, you feel less neck fatigue.',true,42,'L'),
  ('apex-rs1-carbon','Sara K.',5,'Quietest lid I''ve owned','Commute 60km/day on the autostrada. Wind noise is dramatically lower than my previous helmet. Pinlock visor is a must for early mornings.',true,31,'M'),
  ('apex-rs1-carbon','Dan R.',4,'Great helmet, snug cheek pads','Fit is true to size but the cheek pads break in over the first week. After that, perfect. Comms cavity worked great with my Cardo unit.',true,18,'L'),
  ('shadow-pro-matte','Jules P.',5,'Daily rider perfection','Internal sun visor is a game changer. The matte finish does pick up fingerprints but the build quality is outstanding.',true,24,'M'),
  ('shadow-pro-matte','Chen W.',4,'Solid value','Heavier than carbon options but the price-to-quality ratio is unbeatable. Bluetooth cavity worked first try.',true,15,'L'),
  ('carbon-zero','Luca M.',5,'Podium-ready','Lightest helmet I''ve worn. The FIM homologation gives confidence at speed. Worth every euro.',true,28,'M'),
  ('vector-urban','Priya S.',4,'Perfect city lid','Compact, light, easy to throw in a pannier. The clear bubble visor is great for stop-and-go traffic.',true,12,'S'),
  ('raid-adv-white','Tom B.',5,'Crossed the Pyrenees','Peak visor stayed put at 130km/h, goggle channel worked with my Smith MX. Vents kept me cool in the heat.',true,19,'L'),
  ('transit-flip','Aiko T.',5,'Tour essential','Did a 4000km tour. Flip-up makes gas stops effortless. Dual visor system handles all light conditions.',true,22,'M'),
  ('comms-pro-bluetooth','Rafa G.',5,'Mesh works as advertised','8-rider conference held up across a 1.2km canyon ride. Battery easily lasted a full day of riding.',true,16,NULL)
)
INSERT INTO public.product_reviews (product_id, author_name, rating, title, body, verified, helpful, helmet_size)
SELECT p.id, src.author_name, src.rating, src.title, src.body, src.verified, src.helpful, src.helmet_size
FROM src
JOIN public.products p ON p.slug = src.slug
WHERE NOT EXISTS (
  SELECT 1 FROM public.product_reviews pr
  WHERE pr.product_id = p.id AND pr.author_name = src.author_name AND pr.title = src.title
);
