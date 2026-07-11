-- Migration to add stamp_url to settings table
ALTER TABLE public.settings ADD COLUMN stamp_url TEXT;
