-- Migration to add tracking_url to orders table
ALTER TABLE public.orders ADD COLUMN tracking_url TEXT;
