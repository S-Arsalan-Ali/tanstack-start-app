-- Migration to add promo_ticker column to settings table for homepage promo slider customizability.
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS promo_ticker TEXT[] DEFAULT ARRAY['FREE SHIPPING OVER Rs.200', 'ECE 22.06 CERTIFIED', '30-DAY RIDE & RETURN', 'FIM HOMOLOGATED RACE GEAR'];
UPDATE public.settings SET promo_ticker = ARRAY['FREE SHIPPING OVER Rs.200', 'ECE 22.06 CERTIFIED', '30-DAY RIDE & RETURN', 'FIM HOMOLOGATED RACE GEAR'] WHERE promo_ticker IS NULL;
