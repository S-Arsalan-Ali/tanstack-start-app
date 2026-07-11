-- Migration: Add city-wise shipping rates to settings
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS shipping_rates_city JSONB DEFAULT '[]'::jsonb;

-- Optional: You can insert some initial city-wise rates if needed, for example:
-- UPDATE public.settings SET shipping_rates_city = '[{"city": "Karachi", "rate": 0}, {"city": "Lahore", "rate": 300}]'::jsonb;
