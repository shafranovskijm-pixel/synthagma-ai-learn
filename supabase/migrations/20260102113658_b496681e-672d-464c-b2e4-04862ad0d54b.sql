-- Create table for registration links
CREATE TABLE public.registration_links (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  name text,
  inn text,
  expires_at timestamp with time zone DEFAULT (now() + interval '30 days'),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  used_count integer NOT NULL DEFAULT 0
);

-- Enable RLS
ALTER TABLE public.registration_links ENABLE ROW LEVEL SECURITY;

-- Policies for registration_links
CREATE POLICY "Org managers can manage own links"
ON public.registration_links
FOR ALL
USING (
  has_role(auth.uid(), 'organization'::app_role) 
  AND organization_id = current_organization_id()
);

CREATE POLICY "Admins can manage all links"
ON public.registration_links
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Public can read links for registration (no auth required)
CREATE POLICY "Anyone can view valid links"
ON public.registration_links
FOR SELECT
USING (expires_at > now());

-- Add RLS policy for enrollments DELETE
CREATE POLICY "Org managers can delete enrollments"
ON public.enrollments
FOR DELETE
USING (
  has_role(auth.uid(), 'organization'::app_role) 
  AND EXISTS (
    SELECT 1 FROM courses c
    WHERE c.id = enrollments.course_id
    AND c.organization_id = current_organization_id()
  )
);

-- Add admin policy for enrollments
CREATE POLICY "Admins can manage all enrollments"
ON public.enrollments
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));