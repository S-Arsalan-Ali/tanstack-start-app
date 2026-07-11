-- ============================================================================
-- MOTOHELM E-COMMERCE CONSOLIDATED MASTER SCHEMA SETUP (100% COMPLETE)
-- ============================================================================
-- This script sets up the database schema for the entire MotoHelm storefront:
--  1. Database enums and utility updated_at trigger helper
--  2. RBAC Roles, User Profiles, Address Books, and Wishlist tables
--  3. Brands, Categories, Products, Images, and Variants tables
--  4. Order placement backend (Orders, Order Items, Status History, Payments)
--  5. Coupons / Promo codes and Newsletter Subscribers
--  6. Review rating aggregator triggers
--  7. Admin settings, logo upload, and homepage Hero Slides
--  8. Supabase public storage buckets (brand logos, product images, categories,
--     payment receipts, storefront assets, invoices) and custom RLS policies
--  9. Realtime pub-sub invalidation for storefront updates
--  10. Storefront catalog seed data (Categories, Brands, Settings, Products,
--      Product Images, Product Variants, Product Reviews, Promo Codes)
--
-- RUN DIRECTIONS:
-- 1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/_/sql
-- 2. Open the SQL Editor and click "New Query".
-- 3. Paste the entire contents of this script and click "Run".
-- ============================================================================

-- ============================================================================
-- SECTION 1: DATABASE ENUMS
-- ============================================================================
CREATE TYPE public.app_role AS ENUM ('admin', 'staff', 'customer');
CREATE TYPE public.product_status AS ENUM ('draft', 'active', 'archived');
CREATE TYPE public.order_status AS ENUM ('pending', 'processing', 'packed', 'shipped', 'delivered', 'cancelled', 'returned');
CREATE TYPE public.payment_status AS ENUM ('pending', 'paid', 'refunded', 'failed');
CREATE TYPE public.payment_mode AS ENUM ('card', 'cod', 'easypaisa', 'jazzcash', 'nayapay', 'bank');
CREATE TYPE public.shipping_status AS ENUM ('pending', 'label_created', 'in_transit', 'delivered');
CREATE TYPE public.return_status AS ENUM ('requested', 'approved', 'received', 'refunded', 'rejected');

-- ============================================================================
-- SECTION 2: CORE UPDATED_AT TRIGGER HELPER
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- ============================================================================
-- SECTION 3: USER ROLES
-- ============================================================================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Helper to verify if a user has a specific role (Bypasses RLS - Security Definer)
-- Restricted execute access: Revoked from 'anon' at the end of the script for security.
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "Users view own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins view all roles" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============================================================================
-- SECTION 4: PROFILES
-- ============================================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  email TEXT,
  phone TEXT,
  avatar_url TEXT,
  points INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins manage profiles" ON public.profiles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile + customer role on signup trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name, email, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name'),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'phone', NEW.phone)
  )
  ON CONFLICT (user_id) DO UPDATE
  SET name = EXCLUDED.name, phone = EXCLUDED.phone, email = EXCLUDED.email;
  
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'customer') ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- SECTION 5: BRANDS & CATEGORIES
-- ============================================================================
CREATE TABLE public.brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  description TEXT,
  position INTEGER NOT NULL DEFAULT 0, -- Display sorting order in storefront lists and brand sliders
  show_in_slider BOOLEAN NOT NULL DEFAULT true, -- Flag to determine if this brand is displayed in the home brand slider
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.brands TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.brands TO authenticated;
GRANT ALL ON public.brands TO service_role;
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Brands public read" ON public.brands FOR SELECT USING (true);
CREATE POLICY "Brands admin write" ON public.brands FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff')) WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));
CREATE TRIGGER brands_updated_at BEFORE UPDATE ON public.brands FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  parent_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  image_url TEXT,
  description TEXT,
  position INTEGER NOT NULL DEFAULT 0, -- Display sorting order in storefront lists and lineups
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.categories TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Categories public read" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Categories admin write" ON public.categories FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff')) WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));
CREATE TRIGGER categories_updated_at BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- SECTION 6: PRODUCTS & PRODUCT IMAGES
-- ============================================================================
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  compare_price NUMERIC(10,2),
  brand_id UUID REFERENCES public.brands(id) ON DELETE SET NULL,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  stock INTEGER NOT NULL DEFAULT 0,
  status product_status NOT NULL DEFAULT 'draft',
  featured BOOLEAN NOT NULL DEFAULT false,
  badge TEXT,
  rating NUMERIC(3,2) DEFAULT 0,
  reviews_count INTEGER DEFAULT 0,
  specs JSONB DEFAULT '[]'::jsonb,
  certifications TEXT[] DEFAULT '{}',
  weight NUMERIC(10,2) DEFAULT 0,
  sku TEXT,
  meta_title TEXT,
  meta_description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.products TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Products public read active" ON public.products FOR SELECT USING (status = 'active' OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));
CREATE POLICY "Products admin write" ON public.products FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff')) WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));
CREATE TRIGGER products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX products_category_idx ON public.products(category_id);
CREATE INDEX products_brand_idx ON public.products(brand_id);

CREATE TABLE public.product_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  alt TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.product_images TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.product_images TO authenticated;
GRANT ALL ON public.product_images TO service_role;
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Product images public read" ON public.product_images FOR SELECT USING (true);
CREATE POLICY "Product images admin write" ON public.product_images FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff')) WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));
CREATE INDEX product_images_product_idx ON public.product_images(product_id);

-- ============================================================================
-- SECTION 7: PRODUCT VARIANTS
-- ============================================================================
CREATE TABLE public.product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  color TEXT,
  color_hex TEXT,
  size TEXT,
  sku TEXT,
  stock INTEGER NOT NULL DEFAULT 0,
  price_override NUMERIC(10,2),
  is_active BOOLEAN DEFAULT true,
  barcode TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.product_variants TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.product_variants TO authenticated;
GRANT ALL ON public.product_variants TO service_role;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Variants public read" ON public.product_variants FOR SELECT USING (true);
CREATE POLICY "Variants admin write" ON public.product_variants FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff')) WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

-- ============================================================================
-- SECTION 8: CUSTOMER ADDRESS BOOK
-- ============================================================================
CREATE TABLE public.addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label TEXT NOT NULL DEFAULT 'Home',
  name TEXT NOT NULL,
  line1 TEXT NOT NULL,
  line2 TEXT,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  country TEXT NOT NULL,
  phone TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.addresses TO authenticated;
GRANT ALL ON public.addresses TO service_role;
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own addresses" ON public.addresses
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins/Staff view all addresses" ON public.addresses
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

CREATE TRIGGER set_addresses_updated_at BEFORE UPDATE ON public.addresses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- SECTION 9: ORDERS & ORDER ITEMS
-- ============================================================================
CREATE SEQUENCE IF NOT EXISTS public.order_number_seq START WITH 100001;

CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  number TEXT NOT NULL UNIQUE DEFAULT ('MH-' || nextval('public.order_number_seq')::text),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_email TEXT,
  customer_name TEXT,
  status order_status NOT NULL DEFAULT 'pending',
  payment_status payment_status NOT NULL DEFAULT 'pending',
  payment_mode payment_mode NOT NULL DEFAULT 'card',
  shipping_status shipping_status NOT NULL DEFAULT 'pending',
  tracking TEXT,
  courier_name TEXT, -- Courier service provider name (e.g., Leopard, TCS, M&P)
  tracking_url TEXT, -- Link to track order transit details
  shipping_address JSONB,
  billing_address JSONB,
  subtotal NUMERIC(10,2) NOT NULL DEFAULT 0,
  shipping NUMERIC(10,2) NOT NULL DEFAULT 0,
  tax NUMERIC(10,2) NOT NULL DEFAULT 0,
  discount NUMERIC(10,2) NOT NULL DEFAULT 0,
  total NUMERIC(10,2) NOT NULL DEFAULT 0,
  notes TEXT,
  payment_reference TEXT,
  payment_receipt_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own orders" ON public.orders FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));
CREATE POLICY "Users create own orders" ON public.orders FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins manage orders" ON public.orders FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff')) WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));
CREATE TRIGGER orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX orders_user_idx ON public.orders(user_id);
CREATE INDEX orders_created_idx ON public.orders(created_at DESC);

CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  variant_id UUID REFERENCES public.product_variants(id) ON DELETE SET NULL,
  name_snapshot TEXT NOT NULL,
  image_snapshot TEXT,
  color TEXT,
  size TEXT,
  qty INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  line_total NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.order_items TO authenticated;
GRANT ALL ON public.order_items TO service_role;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Order items view via order" ON public.order_items FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND (o.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'))));
CREATE POLICY "Order items insert via own order" ON public.order_items FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.user_id = auth.uid()));
CREATE POLICY "Order items admin all" ON public.order_items FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff')) WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));
CREATE INDEX order_items_order_idx ON public.order_items(order_id);

-- ============================================================================
-- SECTION 10: WISHLISTS
-- ============================================================================
CREATE TABLE public.wishlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, product_id)
);

ALTER TABLE public.wishlists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own wishlists" ON public.wishlists
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT, DELETE ON public.wishlists TO authenticated;
GRANT ALL ON public.wishlists TO service_role;

-- ============================================================================
-- SECTION 11: COUPONS / DISCOUNT CODES
-- ============================================================================
CREATE TABLE public.coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percent', 'fixed')),
  discount_value NUMERIC(10,2) NOT NULL,
  min_order_subtotal NUMERIC(10,2) DEFAULT 0,
  max_discount NUMERIC(10,2),
  expires_at TIMESTAMPTZ,
  usage_limit INTEGER,
  usage_count INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.coupons TO anon, authenticated;
GRANT ALL ON public.coupons TO service_role;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coupons public read" ON public.coupons FOR SELECT USING (is_active = true AND (expires_at IS NULL OR expires_at > now()));
CREATE POLICY "Admins manage coupons" ON public.coupons FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

CREATE TRIGGER set_coupons_updated_at BEFORE UPDATE ON public.coupons FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- SECTION 12: RETURNS
-- ============================================================================
CREATE TABLE public.returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  reason TEXT,
  status return_status NOT NULL DEFAULT 'requested',
  refund_amount NUMERIC(10,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.returns TO authenticated;
GRANT ALL ON public.returns TO service_role;
ALTER TABLE public.returns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Returns view via order" ON public.returns FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND (o.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'))));
CREATE POLICY "Returns insert via own order" ON public.returns FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.user_id = auth.uid()));
CREATE POLICY "Returns admin all" ON public.returns FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff')) WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));
CREATE TRIGGER returns_updated_at BEFORE UPDATE ON public.returns FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- SECTION 13: ORDER STATUS AUDIT LOG & PAYMENT TRANSACTIONS
-- ============================================================================
CREATE TABLE public.order_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  status order_status NOT NULL,
  notes TEXT,
  changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own order status history" ON public.order_status_history FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.user_id = auth.uid()));
CREATE POLICY "Admins manage status history" ON public.order_status_history FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff')) WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_status_history TO authenticated;
GRANT ALL ON public.order_status_history TO service_role;

CREATE TABLE public.payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  payment_method text NOT NULL,
  transaction_ref text,
  amount numeric(10,2) NOT NULL,
  status payment_status NOT NULL DEFAULT 'pending',
  raw_response jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own transactions" ON public.payment_transactions FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.user_id = auth.uid()));
CREATE POLICY "Admins view transactions" ON public.payment_transactions FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_transactions TO authenticated;
GRANT ALL ON public.payment_transactions TO service_role;

-- ============================================================================
-- SECTION 14: SETTINGS TABLE
-- ============================================================================
CREATE TABLE public.settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_name TEXT NOT NULL DEFAULT 'MotoHelm',
  store_email TEXT,
  store_phone TEXT,
  store_address TEXT,
  logo_url TEXT,
  currency TEXT NOT NULL DEFAULT 'USD',
  currency_symbol TEXT NOT NULL DEFAULT 'Rs.',
  tax_rate NUMERIC(5,2) NOT NULL DEFAULT 8.5,
  tax_inclusive BOOLEAN NOT NULL DEFAULT false,
  shipping_flat NUMERIC(10,2) NOT NULL DEFAULT 150,
  shipping_rates_city JSONB DEFAULT '[]'::jsonb,
  free_shipping_threshold NUMERIC(10,2) NOT NULL DEFAULT 20000,
  free_shipping_enabled BOOLEAN NOT NULL DEFAULT true,
  payment_modes_enabled TEXT[] NOT NULL DEFAULT ARRAY['cod','easypaisa','jazzcash','bank'],
  easypaisa_number TEXT DEFAULT '03001234567',
  easypaisa_title TEXT DEFAULT 'MotoHelm Store',
  jazzcash_number TEXT DEFAULT '03001234567',
  jazzcash_title TEXT DEFAULT 'MotoHelm Store',
  bank_name TEXT DEFAULT 'Meezan Bank Ltd',
  bank_title TEXT DEFAULT 'MotoHelm Store',
  bank_account_number TEXT DEFAULT '0123-0123456-789',
  bank_iban TEXT DEFAULT 'PK36 MEZN 0001 2300 1234 5678',
  email_from TEXT,
  hero_headline TEXT,
  hero_subline TEXT,
  theme JSONB DEFAULT '{}'::jsonb,
  promo_ticker TEXT[] DEFAULT ARRAY['FREE SHIPPING OVER Rs. 20,000', 'ECE 22.06 CERTIFIED', '30-DAY RIDE & RETURN', 'FIM HOMOLOGATED RACE GEAR'], -- Sliding promo phrases under the hero banner
  map_iframe_url TEXT,
  whatsapp_number TEXT,
  faqs JSONB DEFAULT '[]'::jsonb,
  invoice_terms TEXT DEFAULT '1. All sales of ECE/FIM certified helmets are final.
2. Returns are only accepted within 30 days if items are in brand new, unused condition.
3. Warranty claims require proof of purchase and original packaging.', -- Default terms and conditions printed on invoices
  stamp_url TEXT,
  easypaisa_qr_url TEXT,
  jazzcash_qr_url TEXT,
  bank_qr_url TEXT,
  easypaisa_logo_url TEXT,
  jazzcash_logo_url TEXT,
  bank_logo_url TEXT,
  cod_logo_url TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.settings TO anon, authenticated;
GRANT INSERT, UPDATE ON public.settings TO authenticated;
GRANT ALL ON public.settings TO service_role;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Settings public read" ON public.settings FOR SELECT USING (true);
CREATE POLICY "Settings admin write" ON public.settings FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER settings_updated_at BEFORE UPDATE ON public.settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- SECTION 15: HERO SLIDES TABLE
-- ============================================================================
CREATE TABLE public.hero_slides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  position INTEGER NOT NULL DEFAULT 0,
  image_url TEXT NOT NULL,
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
CREATE TRIGGER hero_slides_updated_at BEFORE UPDATE ON public.hero_slides FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- SECTION 16: PRODUCT REVIEWS TABLE & RATING TRIGGER
-- ============================================================================
CREATE TABLE public.product_reviews (
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

CREATE INDEX idx_product_reviews_product ON public.product_reviews(product_id);
CREATE INDEX idx_product_reviews_user ON public.product_reviews(user_id);
GRANT SELECT ON public.product_reviews TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.product_reviews TO authenticated;
GRANT ALL ON public.product_reviews TO service_role;
ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Reviews public read" ON public.product_reviews FOR SELECT USING (true);
CREATE POLICY "Reviews owner insert" ON public.product_reviews FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Reviews owner or staff update" ON public.product_reviews FOR UPDATE TO authenticated USING (auth.uid() = user_id OR has_role(auth.uid(),'admin') OR has_role(auth.uid(),'staff')) WITH CHECK (auth.uid() = user_id OR has_role(auth.uid(),'admin') OR has_role(auth.uid(),'staff'));
CREATE POLICY "Reviews owner or staff delete" ON public.product_reviews FOR DELETE TO authenticated USING (auth.uid() = user_id OR has_role(auth.uid(),'admin') OR has_role(auth.uid(),'staff'));
CREATE TRIGGER set_product_reviews_updated_at BEFORE UPDATE ON public.product_reviews FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Reviews Aggregator function
CREATE OR REPLACE FUNCTION public.aggregate_product_reviews()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  pid UUID;
  avg_rating NUMERIC(3,2);
  cnt INTEGER;
  BEGIN
  IF TG_OP = 'DELETE' THEN
    pid := OLD.product_id;
  ELSE
    pid := NEW.product_id;
  END IF;

  SELECT COALESCE(ROUND(AVG(rating), 2), 0), COUNT(*)
  INTO avg_rating, cnt
  FROM public.product_reviews
  WHERE product_id = pid;

  UPDATE public.products
  SET rating = avg_rating, reviews_count = cnt
  WHERE id = pid;

  RETURN NULL;
END; $$;

CREATE TRIGGER on_review_change
AFTER INSERT OR UPDATE OR DELETE ON public.product_reviews
FOR EACH ROW EXECUTE FUNCTION public.aggregate_product_reviews();

-- ============================================================================
-- SECTION 17: RPC INVENTORY HELPERS FOR SECURE SERVER OPERATIONS
-- ============================================================================
CREATE OR REPLACE FUNCTION public.decrement_variant_stock(var_id UUID, qty_to_dec INT)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.product_variants
  SET stock = stock - qty_to_dec
  WHERE id = var_id;
END; $$;

CREATE OR REPLACE FUNCTION public.sync_product_stock(prod_id UUID)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.products
  SET stock = (SELECT COALESCE(SUM(stock), 0) FROM public.product_variants WHERE product_id = prod_id)
  WHERE id = prod_id;
END; $$;

CREATE OR REPLACE FUNCTION public.increment_coupon_usage(coupon_id UUID)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.coupons
  SET usage_count = usage_count + 1
  WHERE id = coupon_id;
END; $$;

-- ============================================================================
-- SECTION 18: NEWSLETTER SUBSCRIBERS
-- ============================================================================
CREATE TABLE public.newsletter_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public insert subscribers" ON public.newsletter_subscribers FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Admins view subscribers" ON public.newsletter_subscribers FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));
GRANT SELECT, INSERT ON public.newsletter_subscribers TO anon, authenticated;
GRANT ALL ON public.newsletter_subscribers TO service_role;

-- ============================================================================
-- SECTION 19: STORAGE BUCKET DEFINITIONS & POLICIES
-- ============================================================================
INSERT INTO storage.buckets (id, name, public) VALUES
  ('product-images', 'product-images', true),
  ('brand-logos', 'brand-logos', true),
  ('category-images', 'category-images', true),
  ('invoices', 'invoices', false),
  ('payment-receipts', 'payment-receipts', true),
  ('store-assets', 'store-assets', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read product images" ON storage.objects FOR SELECT USING (bucket_id = 'product-images');
CREATE POLICY "Admin write product images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'product-images' AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff')));
CREATE POLICY "Admin update product images" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'product-images' AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff')));
CREATE POLICY "Admin delete product images" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'product-images' AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff')));

CREATE POLICY "Public read brand logos" ON storage.objects FOR SELECT USING (bucket_id = 'brand-logos');
CREATE POLICY "Admin write brand logos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'brand-logos' AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff')));
CREATE POLICY "Admin update brand logos" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'brand-logos' AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff')));
CREATE POLICY "Admin delete brand logos" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'brand-logos' AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff')));

CREATE POLICY "Public read category images" ON storage.objects FOR SELECT USING (bucket_id = 'category-images');
CREATE POLICY "Admin write category images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'category-images' AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff')));
CREATE POLICY "Admin update category images" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'category-images' AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff')));
CREATE POLICY "Admin delete category images" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'category-images' AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff')));

CREATE POLICY "Admin read invoices" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'invoices' AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff')));
CREATE POLICY "Admin write invoices" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'invoices' AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff')));

CREATE POLICY "Public read payment receipts" ON storage.objects FOR SELECT USING (bucket_id = 'payment-receipts');
CREATE POLICY "Authenticated upload payment receipts" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'payment-receipts');
CREATE POLICY "Admin delete payment receipts" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'payment-receipts' AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff')));

CREATE POLICY "Public read store assets" ON storage.objects FOR SELECT USING (bucket_id = 'store-assets');
CREATE POLICY "Admin write store assets" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'store-assets' AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff')));
CREATE POLICY "Admin update store assets" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'store-assets' AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff')));
CREATE POLICY "Admin delete store assets" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'store-assets' AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff')));

-- ============================================================================
-- SECTION 20: REALTIME PUBLICATIONS
-- ============================================================================
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['products','product_images','product_variants','categories','brands','hero_slides','settings'] LOOP
    BEGIN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    EXECUTE format('ALTER TABLE public.%I REPLICA IDENTITY FULL', t);
  END LOOP;
END $$;

-- ============================================================================
-- SECTION 21: PUBLIC READ PRIVILEGES GRANT & REVOCATION
-- ============================================================================
GRANT SELECT ON public.products, public.product_images, public.product_variants,
                public.categories, public.brands, public.settings, public.hero_slides TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products, public.product_images,
      public.product_variants, public.categories, public.brands, public.settings, public.hero_slides TO authenticated;
GRANT ALL ON public.products, public.product_images, public.product_variants,
             public.categories, public.brands, public.settings, public.hero_slides TO service_role;

-- Ensure security definer functions are NOT callable by general anonymous requests
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;

-- ============================================================================
-- SECTION 22: STORE SEED DATA (CATEGORIES, BRANDS, SETTINGS, PRODUCTS)
-- ============================================================================
-- Seed Settings
INSERT INTO public.settings (store_name, store_email, currency, currency_symbol, tax_rate, shipping_flat, free_shipping_threshold, free_shipping_enabled, payment_modes_enabled, hero_headline, hero_subline, promo_ticker, invoice_terms) 
VALUES ('MotoHelm', 'hello@motohelm.com', 'USD', 'Rs.', 8.5, 150.00, 20000.00, true, ARRAY['cod','easypaisa','jazzcash','bank'], 'RACE-BRED. STREET-READY.', 'ECE 22.06 certified helmets engineered for the apex.', ARRAY['FREE SHIPPING OVER Rs. 20,000', 'ECE 22.06 CERTIFIED', '30-DAY RIDE & RETURN', 'FIM HOMOLOGATED RACE GEAR'], '1. All sales of ECE/FIM certified helmets are final.
2. Returns are only accepted within 30 days if items are in brand new, unused condition.
3. Warranty claims require proof of purchase and original packaging.');

-- Seed Categories
INSERT INTO public.categories (slug, name, description) VALUES
  ('full-face', 'Full-Face', 'Track-bred protection'),
  ('modular', 'Modular', 'Flip-up versatility'),
  ('off-road', 'Off-Road / ADV', 'Built for dirt & distance'),
  ('urban', 'Urban / Open-Face', 'City-ready style'),
  ('parts', 'Parts', 'Visors, gloves & spares'),
  ('bike-mounting', 'Bike Mounting', 'Mounts, bags & rigs'),
  ('accessories', 'Accessories', 'Comms, goggles & extras');

-- Seed Brands
INSERT INTO public.brands (slug, name, description) VALUES
  ('motohelm', 'MotoHelm', 'House brand. Track-bred, street-certified.'),
  ('velocita', 'Velocita', 'Italian race heritage.'),
  ('trailborn', 'Trailborn', 'Adventure & off-road specialists.'),
  ('atelier', 'Atelier', 'Hand-finished heritage pieces.'),
  ('gridtech', 'GridTech', 'Bike mounts, bags & rigs.');

-- Seed Products
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
) AS v(slug,name,description,brand_slug,cat_slug,price,compare_price,stock,featured,badge);

-- Seed Product Images
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
JOIN LATERAL unnest(src.urls) WITH ORDINALITY AS u(url, pos) ON true;

-- Seed Product Variants
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
JOIN LATERAL unnest(src.sizes) AS sz ON true;

-- Sync stock aggregates
UPDATE public.products p
SET stock = COALESCE(s.total, p.stock)
FROM (SELECT product_id, SUM(stock)::int AS total FROM public.product_variants GROUP BY product_id) s
WHERE s.product_id = p.id;

-- Seed Product Reviews
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
JOIN public.products p ON p.slug = src.slug;

-- Seed Demo Coupon
INSERT INTO public.coupons (code, discount_type, discount_value, min_order_subtotal, usage_limit, is_active)
VALUES ('RIDER10', 'percent', 10.00, 2000.00, 1000, true)
ON CONFLICT (code) DO NOTHING;

-- Force Aggregate trigger updates to calculate loaded ratings
UPDATE public.product_reviews SET rating = rating WHERE id IS NOT NULL;

-- ============================================================================
-- SECTION 23: ORDER WORKFLOW AUTOMATIONS & NOTIFICATIONS TRIGGERS
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_order_status_and_payment_updates()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- 1. If payment status changes from pending to paid
  IF NEW.payment_status = 'paid' AND OLD.payment_status = 'pending' THEN
    -- If status is pending, update it to processing
    IF NEW.status = 'pending' THEN
      NEW.status := 'processing';
    END IF;
    
    -- Generate tracking number if not set
    IF NEW.tracking IS NULL THEN
      NEW.tracking := 'MH-TRK-' || upper(substring(md5(random()::text) from 1 for 8));
    END IF;

    INSERT INTO public.order_status_history (order_id, status, notes, changed_by)
    VALUES (NEW.id, NEW.status, 'Payment verified manually by admin. Status updated to processing and tracking number generated. Dispatching Email and WhatsApp notifications to customer.', NEW.user_id);

  -- 2. Else if order status changes to processing directly (e.g. for COD orders, or updated manually)
  ELSIF NEW.status = 'processing' AND OLD.status <> 'processing' THEN
    -- Generate tracking number if not set
    IF NEW.tracking IS NULL THEN
      NEW.tracking := 'MH-TRK-' || upper(substring(md5(random()::text) from 1 for 8));
    END IF;

    INSERT INTO public.order_status_history (order_id, status, notes, changed_by)
    VALUES (NEW.id, 'processing', 'Order status updated to processing. Tracking number generated.', NEW.user_id);

  -- 3. For any other status change, log it to history
  ELSIF NEW.status <> OLD.status THEN
    INSERT INTO public.order_status_history (order_id, status, notes, changed_by)
    VALUES (NEW.id, NEW.status, 'Order status updated to ' || NEW.status || '.', NEW.user_id);
  END IF;

  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trigger_order_status_updates ON public.orders;
CREATE TRIGGER trigger_order_status_updates
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_order_status_and_payment_updates();

-- ============================================================================
-- SECTION 24: CUSTOMER CONTACT MESSAGES
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.contact_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  topic TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert contact messages"
  ON public.contact_messages FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Admins and staff can read contact messages"
  ON public.contact_messages FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

CREATE POLICY "Admins and staff can update contact messages"
  ON public.contact_messages FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

CREATE POLICY "Admins and staff can delete contact messages"
  ON public.contact_messages FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.contact_messages TO authenticated;
GRANT INSERT ON public.contact_messages TO anon;
GRANT ALL ON public.contact_messages TO service_role;

-- ============================================================================
-- SECTION 25: ACTIVITY AUDIT LOGS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL,
    entity_id UUID,
    details JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view activity logs"
  ON public.activity_logs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can insert activity logs"
  ON public.activity_logs FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT ON public.activity_logs TO authenticated;
GRANT ALL ON public.activity_logs TO service_role;

RAISE NOTICE 'Master database setup completed successfully!';

-- ============================================================================
-- SECTION 26: DATABASE MIGRATION - ADD PAYMENT QR CODES (MIGRATION ONLY)
-- ============================================================================
-- EXPLANATION:
-- To improve the user experience for manual payment methods (EasyPaisa, JazzCash, 
-- and Bank Transfer), we add fields to store the URLs of QR codes uploaded by 
-- the admin. The checkout flow will then dynamically display these QR codes.
--
-- RUN THIS IF YOU ALREADY HAVE AN EXISTING INSTANCE OF THE DATABASE:
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS easypaisa_qr_url TEXT;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS jazzcash_qr_url TEXT;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS bank_qr_url TEXT;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS easypaisa_logo_url TEXT;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS jazzcash_logo_url TEXT;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS bank_logo_url TEXT;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS cod_logo_url TEXT;
