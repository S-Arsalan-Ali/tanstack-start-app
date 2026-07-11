-- ============================================================================
-- MOTOHELM E-COMMERCE SYSTEM MIGRATION GUIDE
-- ============================================================================
-- This single SQL script upgrades your Supabase database schema to support:
--  * Sequential order numbering
--  * Secured security privileges
--  * Real checkout order & item recording
--  * Address books, wishlist syncing, coupons, and status auditing
--  * Recalculating product ratings via database triggers
--
-- RUN DIRECTIONS:
-- 1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/_/sql
-- 2. Open the SQL Editor and click "New Query".
-- 3. Paste the entire contents of this script and click "Run".
-- ============================================================================

-- ============================================================================
-- STEP 1: SECURITY UPGRADES
-- ============================================================================
-- The public 'anon' role should not have rights to call security-sensitive functions.
-- We revoke EXECUTE permissions on 'has_role' to prevent data probing.
-- ============================================================================
RAISE NOTICE 'Step 1: Revoking has_role permissions...';
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;


-- ============================================================================
-- STEP 2: EXPAND PAYMENT OPTIONS
-- ============================================================================
-- Add mobile wallet payment modes and bank transfer to the payment mode enum.
-- PostgreSQL requires ALTER TYPE ADD VALUE statements to run separately.
-- ============================================================================
RAISE NOTICE 'Step 2: Altering payment_mode enum values...';
ALTER TYPE public.payment_mode ADD VALUE IF NOT EXISTS 'easypaisa';
ALTER TYPE public.payment_mode ADD VALUE IF NOT EXISTS 'jazzcash';
ALTER TYPE public.payment_mode ADD VALUE IF NOT EXISTS 'nayapay';
ALTER TYPE public.payment_mode ADD VALUE IF NOT EXISTS 'bank';


-- ============================================================================
-- STEP 3: SEQUENTIAL ORDER NUMBERS
-- ============================================================================
-- Replace the random order number default with a sequence starting at 100001
-- to guarantee unique, chronological order numbers (e.g. MH-100001).
-- ============================================================================
RAISE NOTICE 'Step 3: Setting up order sequences...';
CREATE SEQUENCE IF NOT EXISTS public.order_number_seq START WITH 100001;
ALTER TABLE public.orders ALTER COLUMN number SET DEFAULT ('MH-' || nextval('public.order_number_seq')::text);


-- ============================================================================
-- STEP 4: ADD BASE ATTRIBUTES TO PRODUCTS & VARIANTS
-- ============================================================================
-- Add missing metadata, weight, SKU, and status fields to products & variants
-- to handle shipping calculations and inventory management.
-- ============================================================================
RAISE NOTICE 'Step 4: Adding missing product/variant columns...';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS weight NUMERIC(10,2) DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS sku TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS meta_title TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS meta_description TEXT;

ALTER TABLE public.product_variants ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE public.product_variants ADD COLUMN IF NOT EXISTS barcode TEXT;


-- ============================================================================
-- STEP 5: CUSTOMER ADDRESS BOOK TABLE
-- ============================================================================
-- Create the addresses table to store customer shipping details.
-- RLS policies ensure customers manage only their own addresses.
-- ============================================================================
RAISE NOTICE 'Step 5: Creating addresses table...';
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

-- Enable RLS
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;

-- Customers can view/insert/update/delete their own address cards
DROP POLICY IF EXISTS "Users manage own addresses" ON public.addresses;
CREATE POLICY "Users manage own addresses" ON public.addresses
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Staff/Admins can view all address listings for logistics
DROP POLICY IF EXISTS "Admins/Staff view all addresses" ON public.addresses;
CREATE POLICY "Admins/Staff view all addresses" ON public.addresses
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

-- Trigger to auto-update 'updated_at' timestamp
DROP TRIGGER IF EXISTS set_addresses_updated_at ON public.addresses;
CREATE TRIGGER set_addresses_updated_at BEFORE UPDATE ON public.addresses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- ============================================================================
-- STEP 6: COUPONS & DISCOUNTS SYSTEM
-- ============================================================================
-- Create the coupons table to support discount codes during checkouts.
-- Customers can read valid coupons; only admin/staff can manage them.
-- ============================================================================
RAISE NOTICE 'Step 6: Creating coupons table...';
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

-- Enable RLS
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

-- Active coupons are public for read operations (validation at checkout)
DROP POLICY IF EXISTS "Coupons public read" ON public.coupons;
CREATE POLICY "Coupons public read" ON public.coupons 
  FOR SELECT USING (is_active = true AND (expires_at IS NULL OR expires_at > now()));

-- Staff/Admins manage coupon codes
DROP POLICY IF EXISTS "Admins manage coupons" ON public.coupons;
CREATE POLICY "Admins manage coupons" ON public.coupons 
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

-- Trigger to auto-update 'updated_at' timestamp
DROP TRIGGER IF EXISTS set_coupons_updated_at ON public.coupons;
CREATE TRIGGER set_coupons_updated_at BEFORE UPDATE ON public.coupons
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- ============================================================================
-- STEP 7: CUSTOMER WISHLIST JUNCTION
-- ============================================================================
-- Wishlist needs to be backed up to the database so items are not lost when
-- switching devices. Authenticated users can manage their own wishlist items.
-- ============================================================================
RAISE NOTICE 'Step 7: Creating wishlists table...';
CREATE TABLE IF NOT EXISTS public.wishlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, product_id)
);

-- Enable RLS
ALTER TABLE public.wishlists ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own wishlists" ON public.wishlists;
CREATE POLICY "Users manage own wishlists" ON public.wishlists
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT, DELETE ON public.wishlists TO authenticated;
GRANT ALL ON public.wishlists TO service_role;


-- ============================================================================
-- STEP 8: NEWSLETTER SUBSCRIBERS
-- ============================================================================
-- Log subscribers from the homepage email form.
-- Anyone can subscribe; only admins/staff can see the subscriber list.
-- ============================================================================
RAISE NOTICE 'Step 8: Creating newsletter_subscribers table...';
CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public insert subscribers" ON public.newsletter_subscribers;
CREATE POLICY "Public insert subscribers" ON public.newsletter_subscribers FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Admins view subscribers" ON public.newsletter_subscribers;
CREATE POLICY "Admins view subscribers" ON public.newsletter_subscribers FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

GRANT SELECT, INSERT ON public.newsletter_subscribers TO anon, authenticated;
GRANT ALL ON public.newsletter_subscribers TO service_role;


-- ============================================================================
-- STEP 9: ORDER STATUS HISTORY AUDIT BOOK
-- ============================================================================
-- Records status logs (e.g. processing -> packed -> shipped) for customer order
-- logs. Users can view logs for their own orders; admins update them.
-- ============================================================================
RAISE NOTICE 'Step 9: Creating order_status_history table...';
CREATE TABLE IF NOT EXISTS public.order_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  status order_status NOT NULL,
  notes TEXT,
  changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
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


-- ============================================================================
-- STEP 10: PAYMENT TRANSACTIONS LOG TABLE
-- ============================================================================
-- Logs payment modes, transaction reference keys, and success status details.
-- ============================================================================
RAISE NOTICE 'Step 10: Creating payment_transactions table...';
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

-- Enable RLS
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


-- ============================================================================
-- STEP 11: DYNAMIC PRODUCT RATINGS TRIGGER
-- ============================================================================
-- Trigger function that auto-aggregates rating averages and review count sizes on
-- the products table when product_reviews are inserted, updated, or deleted.
-- ============================================================================
RAISE NOTICE 'Step 11: Setting up review aggregation triggers...';
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


-- ============================================================================
-- STEP 12: SIGNUP PROFILE SYNC TRIGGER (PHONE FIELD ADDITION)
-- ============================================================================
-- Extend handle_new_user trigger to save signup metadata phone numbers
-- automatically to customer profiles table.
-- ============================================================================
RAISE NOTICE 'Step 12: Updating handle_new_user trigger...';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS points INTEGER DEFAULT 0;

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


-- ============================================================================
-- STEP 13: RPC INVENTORY HELPERS FOR TRUSTED SERVER TRANS ACTIONS
-- ============================================================================
-- Store helpers used by TanStack Start checkout server function to decrement
-- stock and sync product summaries bypassing RLS secure bounds.
-- ============================================================================
RAISE NOTICE 'Step 13: Creating RPC stock/coupon helpers...';

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
-- STEP 14: SEED DYNAMIC SYSTEM SETTINGS
-- ============================================================================
-- Set up default parameters for the checkout and calculations:
-- PKR currency, tax rates (8.5%), flat shipping flat rate (Rs. 150),
-- and free shipping spend limit (Rs. 20,000).
-- ============================================================================
RAISE NOTICE 'Step 14: Seeding shop parameters...';
UPDATE public.settings
SET store_name = 'MotoHelm',
    store_email = 'hello@motohelm.com',
    currency = 'PKR',
    currency_symbol = 'Rs.',
    tax_rate = 8.5,
    shipping_flat = 150.00,
    free_shipping_threshold = 20000.00,
    payment_modes_enabled = ARRAY['card','cod','easypaisa','jazzcash','nayapay','bank']::text[],
    hero_headline = 'RACE-BRED. STREET-READY.',
    hero_subline = 'ECE 22.06 certified helmets engineered for the apex.'
WHERE id = (SELECT id FROM public.settings LIMIT 1);


-- ============================================================================
-- STEP 15: SEED DEMO COUPONS & GRANTS
-- ============================================================================
-- Seed a discount coupon for verify testing and grant roles.
-- ============================================================================
RAISE NOTICE 'Step 15: Final seeding and grants...';
INSERT INTO public.coupons (code, discount_type, discount_value, min_order_subtotal, usage_limit, is_active)
VALUES ('RIDER10', 'percent', 10.00, 2000.00, 1000, true)
ON CONFLICT (code) DO NOTHING;

GRANT SELECT ON public.coupons TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.addresses TO authenticated;
GRANT SELECT ON public.order_status_history TO authenticated;

RAISE NOTICE 'Database schema updated successfully!';
