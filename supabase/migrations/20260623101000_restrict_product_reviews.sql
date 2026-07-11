-- Restrict review insertion to verified purchasers of delivered products
-- and enforce at most one review per product per registered user.

-- 1. Drop existing insert policy
DROP POLICY IF EXISTS "Reviews owner insert" ON public.product_reviews;

-- 2. Create the stricter RLS insert policy
CREATE POLICY "Reviews owner insert" ON public.product_reviews
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 
      FROM public.orders o
      JOIN public.order_items oi ON oi.order_id = o.id
      WHERE o.user_id = auth.uid()
        AND o.status = 'delivered'
        AND oi.product_id = product_reviews.product_id
    )
  );

-- 3. Add a unique index to prevent duplicate reviews by the same registered user
CREATE UNIQUE INDEX IF NOT EXISTS unique_user_product_review 
  ON public.product_reviews(user_id, product_id) 
  WHERE user_id IS NOT NULL;
