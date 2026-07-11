-- Migration: Add invoice_terms column to settings table
ALTER TABLE public.settings ADD COLUMN invoice_terms text;

-- Seed default invoice terms for existing settings row
UPDATE public.settings SET invoice_terms = '1. All sales of ECE/FIM certified helmets are final.
2. Returns are only accepted within 30 days if items are in brand new, unused condition.
3. Warranty claims require proof of purchase and original packaging.'
WHERE id IS NOT NULL;
