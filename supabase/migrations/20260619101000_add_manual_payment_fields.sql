-- Add 'pending' to the order_status enum if not exists
ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'pending' BEFORE 'processing';

-- Alter orders table to support manual payment references and screenshot uploads
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_reference TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_receipt_url TEXT;
ALTER TABLE public.orders ALTER COLUMN status SET DEFAULT 'pending';

-- Alter settings table to support configuring manual payment credentials
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS easypaisa_number TEXT DEFAULT '03001234567';
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS easypaisa_title TEXT DEFAULT 'MotoHelm Store';
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS jazzcash_number TEXT DEFAULT '03001234567';
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS jazzcash_title TEXT DEFAULT 'MotoHelm Store';
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS bank_name TEXT DEFAULT 'Meezan Bank Ltd';
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS bank_title TEXT DEFAULT 'MotoHelm Store';
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS bank_account_number TEXT DEFAULT '0123-0123456-789';
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS bank_iban TEXT DEFAULT 'PK36 MEZN 0001 2300 1234 5678';

-- Setup Storage Bucket for manual payment receipt screenshots
INSERT INTO storage.buckets (id, name, public) 
VALUES ('payment-receipts', 'payment-receipts', true) 
ON CONFLICT (id) DO NOTHING;

-- Storage Policies for payment-receipts bucket
DROP POLICY IF EXISTS "Public read payment receipts" ON storage.objects;
CREATE POLICY "Public read payment receipts" ON storage.objects FOR SELECT 
  USING (bucket_id = 'payment-receipts');

DROP POLICY IF EXISTS "Authenticated upload payment receipts" ON storage.objects;
CREATE POLICY "Authenticated upload payment receipts" ON storage.objects FOR INSERT TO authenticated 
  WITH CHECK (bucket_id = 'payment-receipts');

DROP POLICY IF EXISTS "Admin delete payment receipts" ON storage.objects;
CREATE POLICY "Admin delete payment receipts" ON storage.objects FOR DELETE TO authenticated 
  USING (bucket_id = 'payment-receipts' AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff')));

-- Notification trigger and helper function to simulate WhatsApp and Email notification logs when order status or payment state changes
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

DROP TRIGGER IF EXISTS trigger_order_payment_notify ON public.orders;
DROP TRIGGER IF EXISTS trigger_order_status_updates ON public.orders;

CREATE TRIGGER trigger_order_status_updates
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_order_status_and_payment_updates();
