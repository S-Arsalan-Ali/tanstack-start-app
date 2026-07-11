-- Alter Settings table to support maps, WhatsApp, and FAQs list
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS map_iframe_url TEXT;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS whatsapp_number TEXT;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS faqs JSONB DEFAULT '[]'::jsonb;

-- Create Customer Contact Messages table
CREATE TABLE IF NOT EXISTS public.contact_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  topic TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on contact_messages
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

-- Drop policies if they exist to prevent duplicates
DROP POLICY IF EXISTS "Anyone can insert contact messages" ON public.contact_messages;
DROP POLICY IF EXISTS "Admins and staff can read contact messages" ON public.contact_messages;
DROP POLICY IF EXISTS "Admins and staff can update contact messages" ON public.contact_messages;
DROP POLICY IF EXISTS "Admins and staff can delete contact messages" ON public.contact_messages;

-- RLS Policies
CREATE POLICY "Anyone can insert contact messages"
  ON public.contact_messages
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Admins and staff can read contact messages"
  ON public.contact_messages
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

CREATE POLICY "Admins and staff can update contact messages"
  ON public.contact_messages
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

CREATE POLICY "Admins and staff can delete contact messages"
  ON public.contact_messages
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

-- Grant access to roles
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contact_messages TO authenticated;
GRANT INSERT ON public.contact_messages TO anon;
GRANT ALL ON public.contact_messages TO service_role;
