
-- ============= ENUMS =============
CREATE TYPE public.app_role AS ENUM ('admin', 'staff', 'customer');
CREATE TYPE public.product_status AS ENUM ('draft', 'active', 'archived');
CREATE TYPE public.order_status AS ENUM ('processing', 'packed', 'shipped', 'delivered', 'cancelled', 'returned');
CREATE TYPE public.payment_status AS ENUM ('pending', 'paid', 'refunded', 'failed');
CREATE TYPE public.payment_mode AS ENUM ('card', 'cod', 'upi', 'paypal');
CREATE TYPE public.shipping_status AS ENUM ('pending', 'label_created', 'in_transit', 'delivered');
CREATE TYPE public.return_status AS ENUM ('requested', 'approved', 'received', 'refunded', 'rejected');

-- ============= updated_at helper =============
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- ============= USER ROLES =============
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

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "Users view own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins view all roles" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============= PROFILES =============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  email TEXT,
  phone TEXT,
  avatar_url TEXT,
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

-- Auto-create profile + customer role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name'), NEW.email)
  ON CONFLICT (user_id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'customer') ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============= BRANDS =============
CREATE TABLE public.brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  description TEXT,
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

-- ============= CATEGORIES =============
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  parent_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  image_url TEXT,
  description TEXT,
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

-- ============= PRODUCTS =============
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

-- ============= PRODUCT IMAGES =============
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

-- ============= PRODUCT VARIANTS =============
CREATE TABLE public.product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  color TEXT,
  color_hex TEXT,
  size TEXT,
  sku TEXT,
  stock INTEGER NOT NULL DEFAULT 0,
  price_override NUMERIC(10,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.product_variants TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.product_variants TO authenticated;
GRANT ALL ON public.product_variants TO service_role;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Variants public read" ON public.product_variants FOR SELECT USING (true);
CREATE POLICY "Variants admin write" ON public.product_variants FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff')) WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

-- ============= ORDERS =============
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  number TEXT NOT NULL UNIQUE DEFAULT ('MH-' || lpad((floor(random()*900000)+100000)::text, 6, '0')),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_email TEXT,
  customer_name TEXT,
  status order_status NOT NULL DEFAULT 'processing',
  payment_status payment_status NOT NULL DEFAULT 'pending',
  payment_mode payment_mode NOT NULL DEFAULT 'card',
  shipping_status shipping_status NOT NULL DEFAULT 'pending',
  tracking TEXT,
  shipping_address JSONB,
  billing_address JSONB,
  subtotal NUMERIC(10,2) NOT NULL DEFAULT 0,
  shipping NUMERIC(10,2) NOT NULL DEFAULT 0,
  tax NUMERIC(10,2) NOT NULL DEFAULT 0,
  discount NUMERIC(10,2) NOT NULL DEFAULT 0,
  total NUMERIC(10,2) NOT NULL DEFAULT 0,
  notes TEXT,
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

-- ============= ORDER ITEMS =============
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

-- ============= RETURNS =============
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

-- ============= SETTINGS =============
CREATE TABLE public.settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_name TEXT NOT NULL DEFAULT 'MotoHelm',
  store_email TEXT,
  store_phone TEXT,
  store_address TEXT,
  logo_url TEXT,
  currency TEXT NOT NULL DEFAULT 'USD',
  currency_symbol TEXT NOT NULL DEFAULT '$',
  tax_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  tax_inclusive BOOLEAN NOT NULL DEFAULT false,
  shipping_flat NUMERIC(10,2) NOT NULL DEFAULT 0,
  free_shipping_threshold NUMERIC(10,2) NOT NULL DEFAULT 0,
  payment_modes_enabled TEXT[] NOT NULL DEFAULT ARRAY['card','cod','upi','paypal'],
  email_from TEXT,
  hero_headline TEXT,
  hero_subline TEXT,
  theme JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.settings TO anon, authenticated;
GRANT INSERT, UPDATE ON public.settings TO authenticated;
GRANT ALL ON public.settings TO service_role;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Settings public read" ON public.settings FOR SELECT USING (true);
CREATE POLICY "Settings admin write" ON public.settings FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER settings_updated_at BEFORE UPDATE ON public.settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
INSERT INTO public.settings (store_name, currency, currency_symbol) VALUES ('MotoHelm', 'USD', '$');

-- ============= STORAGE BUCKETS =============
INSERT INTO storage.buckets (id, name, public) VALUES
  ('product-images', 'product-images', true),
  ('brand-logos', 'brand-logos', true),
  ('category-images', 'category-images', true),
  ('invoices', 'invoices', false);

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
