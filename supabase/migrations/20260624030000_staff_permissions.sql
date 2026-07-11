-- Drop old policies
DROP POLICY IF EXISTS "Admins manage coupons" ON public.coupons;
DROP POLICY IF EXISTS "Products admin write" ON public.products;
DROP POLICY IF EXISTS "Variants admin write" ON public.product_variants;
DROP POLICY IF EXISTS "Admins manage orders" ON public.orders;
DROP POLICY IF EXISTS "Order items admin all" ON public.order_items;
DROP POLICY IF EXISTS "Returns admin all" ON public.returns;

-- Coupons policies
CREATE POLICY "Admins manage coupons"
ON public.coupons
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Staff view coupons"
ON public.coupons
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'staff'::public.app_role));

-- Products policies
CREATE POLICY "Admins/Staff select products"
ON public.products
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins/Staff write products"
ON public.products
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'staff'::public.app_role));

CREATE POLICY "Admins/Staff update products"
ON public.products
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'staff'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'staff'::public.app_role));

CREATE POLICY "Admins delete products"
ON public.products
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Product Variants policies
CREATE POLICY "Admins/Staff select variants"
ON public.product_variants
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins/Staff write variants"
ON public.product_variants
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'staff'::public.app_role));

CREATE POLICY "Admins/Staff update variants"
ON public.product_variants
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'staff'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'staff'::public.app_role));

CREATE POLICY "Admins delete variants"
ON public.product_variants
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Orders policies
CREATE POLICY "Admins/Staff insert orders"
ON public.orders
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'staff'::public.app_role));

CREATE POLICY "Admins/Staff update orders"
ON public.orders
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'staff'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'staff'::public.app_role));

CREATE POLICY "Admins delete orders"
ON public.orders
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Order Items policies
CREATE POLICY "Admins/Staff insert order items"
ON public.order_items
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'staff'::public.app_role));

CREATE POLICY "Admins/Staff update order items"
ON public.order_items
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'staff'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'staff'::public.app_role));

CREATE POLICY "Admins delete order items"
ON public.order_items
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Returns policies
CREATE POLICY "Admins/Staff insert returns"
ON public.returns
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'staff'::public.app_role));

CREATE POLICY "Admins/Staff update returns"
ON public.returns
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'staff'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'staff'::public.app_role));

CREATE POLICY "Admins delete returns"
ON public.returns
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));
