
-- Seed catalog data (idempotent via slug unique indexes)

-- Default settings row if none exists
INSERT INTO public.settings (store_name, store_email, currency, currency_symbol, tax_rate, shipping_flat, free_shipping_threshold, payment_modes_enabled, hero_headline, hero_subline)
SELECT 'MotoHelm', 'hello@motohelm.com', 'PKR', 'Rs', 8.5, 15, 200, ARRAY['Card','COD','Easy Paisa','Jazz Cash','Bank']::text[], 'RACE-BRED. STREET-READY.', 'ECE 22.06 certified helmets engineered for the apex.'
WHERE NOT EXISTS (SELECT 1 FROM public.settings);

-- Categories
INSERT INTO public.categories (slug, name, description) VALUES
  ('full-face', 'Full-Face', 'Track-bred protection'),
  ('modular', 'Modular', 'Flip-up versatility'),
  ('off-road', 'Off-Road / ADV', 'Built for dirt & distance'),
  ('urban', 'Urban / Open-Face', 'City-ready style'),
  ('parts', 'Parts', 'Visors, gloves & spares'),
  ('bike-mounting', 'Bike Mounting', 'Mounts, bags & rigs'),
  ('accessories', 'Accessories', 'Comms, goggles & extras')
ON CONFLICT (slug) DO NOTHING;

-- Brands
INSERT INTO public.brands (slug, name, description) VALUES
  ('motohelm', 'MotoHelm', 'House brand. Track-bred, street-certified.'),
  ('velocita', 'Velocita', 'Italian race heritage.'),
  ('trailborn', 'Trailborn', 'Adventure & off-road specialists.'),
  ('atelier', 'Atelier', 'Hand-finished heritage pieces.'),
  ('gridtech', 'GridTech', 'Bike mounts, bags & rigs.')
ON CONFLICT (slug) DO NOTHING;

-- Products
WITH b AS (SELECT id, slug FROM public.brands), c AS (SELECT id, slug FROM public.categories)
INSERT INTO public.products (slug, name, description, brand_id, category_id, price, compare_price, stock, status, featured, badge)
SELECT v.slug, v.name, v.description,
  (SELECT id FROM b WHERE slug = v.brand_slug),
  (SELECT id FROM c WHERE slug = v.cat_slug),
  v.price, v.compare_price, v.stock, 'active'::product_status, v.featured, v.badge
FROM (VALUES
  ('apex-rs1-carbon','Apex RS1 Carbon','Race-bred shell with iridium visor and aerodynamic spoiler.','motohelm','full-face',649,749,24,true,'BESTSELLER'),
  ('shadow-pro-matte','Shadow Pro Matte','Murdered-out daily rider with internal sun visor.','motohelm','full-face',389,NULL,18,true,'NEW'),
  ('carbon-zero','Carbon Zero','FIM-homologated race shell. The lightest in our lineup.','velocita','full-face',899,NULL,8,true,'LIMITED'),
  ('circuit-gp','Circuit GP','Track-day weapon with bold liveries.','velocita','full-face',459,519,32,false,'SALE'),
  ('flux-modular-silver','Flux Modular','Dual-certified P/J flip-up.','motohelm','modular',429,NULL,21,false,NULL),
  ('transit-flip','Transit Flip','Tour-ready modular with comms cavity.','velocita','modular',549,NULL,14,true,'BESTSELLER'),
  ('raid-adv-white','Raid ADV','Adventure-ready with peak visor and ADV ventilation.','trailborn','off-road',519,NULL,11,true,'NEW'),
  ('rampage-mx','Rampage MX','Pure motocross. Wide goggle aperture.','trailborn','off-road',289,NULL,27,false,NULL),
  ('heritage-cafe','Heritage Café','Hand-finished open-face with Italian leather trim.','atelier','urban',329,NULL,6,false,'LIMITED'),
  ('vector-urban','Vector Urban','Compact open-face with clear bubble visor.','motohelm','urban',199,NULL,42,true,'BESTSELLER'),
  ('checker-racer','Checker Racer','Retro race livery, modern certification.','atelier','urban',379,NULL,15,false,'NEW'),
  ('summit-touring','Summit Touring','Long-distance adventure lid.','trailborn','off-road',459,NULL,19,false,NULL),
  ('apex-race-gloves','Apex Race Gloves','Carbon-knuckle race gloves with kangaroo palm.','motohelm','parts',149,NULL,38,false,'NEW'),
  ('iridium-replacement-visor','Iridium Replacement Visor','Drop-in iridium visor for Apex and Shadow series.','motohelm','parts',89,NULL,64,false,NULL),
  ('pinlock-70-insert','Pinlock 70 Insert','Anti-fog Pinlock 70 insert.','velocita','parts',34,NULL,120,false,'BESTSELLER'),
  ('alloy-phone-mount','Alloy Phone Mount','CNC aluminum phone clamp with vibration damping.','gridtech','bike-mounting',59,NULL,85,false,'BESTSELLER'),
  ('gopro-helmet-mount','GoPro Helmet Mount','Chin-mount for action cameras.','gridtech','bike-mounting',29,NULL,140,false,NULL),
  ('tank-bag-pro','Tank Bag Pro 18L','Magnetic + strap-mount tank bag.','trailborn','bike-mounting',179,NULL,22,false,'NEW'),
  ('comms-pro-bluetooth','Comms Pro Bluetooth','Mesh intercom with 8-rider conferencing.','motohelm','accessories',249,NULL,31,true,'BESTSELLER'),
  ('trail-goggles-fire','Trail Goggles Fire','Wide-aperture goggles with mirrored fire lens.','trailborn','accessories',79,NULL,47,false,NULL),
  ('carbon-key-fob','Carbon Key Fob','Real carbon-fiber key fob with leather strap.','atelier','accessories',39,NULL,56,false,'LIMITED')
) AS v(slug,name,description,brand_slug,cat_slug,price,compare_price,stock,featured,badge)
ON CONFLICT (slug) DO NOTHING;
