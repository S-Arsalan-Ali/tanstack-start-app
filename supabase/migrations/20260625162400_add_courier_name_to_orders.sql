-- Migration: Add courier_name column to orders table
ALTER TABLE public.orders ADD COLUMN courier_name text;
