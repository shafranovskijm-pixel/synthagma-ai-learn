-- Fix infinite recursion in RLS policy for public.profiles
-- Create a SECURITY DEFINER helper to safely read current user's organization_id
CREATE OR REPLACE FUNCTION public.current_organization_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id
  FROM public.profiles
  WHERE user_id = auth.uid()
  LIMIT 1
$$;

-- Replace org-manager policy that referenced profiles inside profiles (caused recursion)
DROP POLICY IF EXISTS "Org managers can view org profiles " ON public.profiles;
DROP POLICY IF EXISTS "Org managers can view org profiles" ON public.profiles;

CREATE POLICY "Org managers can view org profiles"
ON public.profiles
FOR SELECT
USING (
  has_role(auth.uid(), 'organization'::app_role)
  AND organization_id IS NOT NULL
  AND organization_id = public.current_organization_id()
);
