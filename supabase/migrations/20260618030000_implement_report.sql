-- Phase 1 & 2 Schema and Security Updates

-- 1. Revoke has_role execute privilege from anon
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;

-- 2. Update payment_mode enum to include new modes
ALTER TYPE public.payment_mode ADD VALUE IF NOT EXISTS 'easypaisa';
ALTER TYPE public.payment_mode ADD VALUE IF NOT EXISTS 'jazzcash';
ALTER TYPE public.payment_mode ADD VALUE IF NOT EXISTS 'nayapay';
ALTER TYPE public.payment_mode ADD VALUE IF NOT EXISTS 'bank';

-- 3. Alter orders table to use sequential number generation
CREATE SEQUENCE IF NOT EXISTS public.order_number_seq START WITH 100001;
ALTER TABLE public.orders ALTER COLUMN number SET DEFAULT ('MH-' || nextval('public.order_number_seq')::text);

-- 4. Alter products table to add weight, sku, meta columns
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS weight NUMERIC(10,2) DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS sku TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS meta_title TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS meta_description TEXT;

-- 5. Alter product_variants table to add is_active, barcode columns
ALTER TABLE public.product_variants ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE public.product_variants ADD COLUMN IF NOT EXISTS barcode TEXT;

-- 6. Create addresses table
CREATE TABLE IF NOT EXISTS public.addresses (
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

-- Enable RLS for addresses
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own addresses" ON public.addresses;
CREATE POLICY "Users manage own addresses" ON public.addresses
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins/Staff view all addresses" ON public.addresses;
CREATE POLICY "Admins/Staff view all addresses" ON public.addresses
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

-- Trigger for addresses.updated_at
DROP TRIGGER IF EXISTS set_addresses_updated_at ON public.addresses;
CREATE TRIGGER set_addresses_updated_at BEFORE UPDATE ON public.addresses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 7. Create coupons table
CREATE TABLE IF NOT EXISTS public.coupons (
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

-- Enable RLS for coupons
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Coupons public read" ON public.coupons;
CREATE POLICY "Coupons public read" ON public.coupons FOR SELECT USING (is_active = true AND (expires_at IS NULL OR expires_at > now()));

DROP POLICY IF EXISTS "Admins manage coupons" ON public.coupons;
CREATE POLICY "Admins manage coupons" ON public.coupons FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

DROP TRIGGER IF EXISTS set_coupons_updated_at ON public.coupons;
CREATE TRIGGER set_coupons_updated_at BEFORE UPDATE ON public.coupons
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 8. Create wishlists table
CREATE TABLE IF NOT EXISTS public.wishlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, product_id)
);

-- Enable RLS for wishlists
ALTER TABLE public.wishlists ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own wishlists" ON public.wishlists;
CREATE POLICY "Users manage own wishlists" ON public.wishlists
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT, DELETE ON public.wishlists TO authenticated;
GRANT ALL ON public.wishlists TO service_role;

-- 9. Create newsletter_subscribers table
CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS for newsletter_subscribers
ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public insert subscribers" ON public.newsletter_subscribers;
CREATE POLICY "Public insert subscribers" ON public.newsletter_subscribers FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Admins view subscribers" ON public.newsletter_subscribers;
CREATE POLICY "Admins view subscribers" ON public.newsletter_subscribers FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

GRANT SELECT, INSERT ON public.newsletter_subscribers TO anon, authenticated;
GRANT ALL ON public.newsletter_subscribers TO service_role;

-- 10. Create order_status_history table
CREATE TABLE IF NOT EXISTS public.order_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  status order_status NOT NULL,
  notes TEXT,
  changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS for order_status_history
ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own order status history" ON public.order_status_history;
CREATE POLICY "Users view own order status history" ON public.order_status_history
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.user_id = auth.uid()));

DROP POLICY IF EXISTS "Admins manage status history" ON public.order_status_history;
CREATE POLICY "Admins manage status history" ON public.order_status_history
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_status_history TO authenticated;
GRANT ALL ON public.order_status_history TO service_role;

-- 11. Add payment_transactions table
CREATE TABLE IF NOT EXISTS public.payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  payment_method text NOT NULL,
  transaction_ref text,
  amount numeric(10,2) NOT NULL,
  status payment_status NOT NULL DEFAULT 'pending',
  raw_response jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS for payment_transactions
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own transactions" ON public.payment_transactions;
CREATE POLICY "Users view own transactions" ON public.payment_transactions
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.user_id = auth.uid()));

DROP POLICY IF EXISTS "Admins view transactions" ON public.payment_transactions;
CREATE POLICY "Admins view transactions" ON public.payment_transactions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_transactions TO authenticated;
GRANT ALL ON public.payment_transactions TO service_role;

-- 12. Add product review calculation trigger/function
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

DROP TRIGGER IF EXISTS on_review_change ON public.product_reviews;
CREATE TRIGGER on_review_change
AFTER INSERT OR UPDATE OR DELETE ON public.product_reviews
FOR EACH ROW EXECUTE FUNCTION public.aggregate_product_reviews();

-- 13. Update profiles table to add points
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS points INTEGER DEFAULT 0;

-- 14. Adjust handle_new_user trigger to support phone numbers
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

-- 15. Update settings table default data with PKR currencies and configurations
UPDATE public.settings
SET store_name = 'MotoHelm',
    store_email = 'hello@motohelm.com',
    currency = 'PKR',
    currency_symbol = 'Rs',
    tax_rate = 8.5,
    shipping_flat = 150.00,
    free_shipping_threshold = 20000.00,
    payment_modes_enabled = ARRAY['card','cod','easypaisa','jazzcash','nayapay','bank']::text[],
    hero_headline = 'RACE-BRED. STREET-READY.',
    hero_subline = 'ECE 22.06 certified helmets engineered for the apex.'
WHERE id = (SELECT id FROM public.settings LIMIT 1);

-- 16. Seed a default coupon for demo purposes
INSERT INTO public.coupons (code, discount_type, discount_value, min_order_subtotal, usage_limit, is_active)
VALUES ('RIDER10', 'percent', 10.00, 2000.00, 1000, true)
ON CONFLICT (code) DO NOTHING;

-- Grant permissions for new tables to anon and authenticated users
GRANT SELECT ON public.coupons TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.addresses TO authenticated;
GRANT SELECT ON public.order_status_history TO authenticated;
