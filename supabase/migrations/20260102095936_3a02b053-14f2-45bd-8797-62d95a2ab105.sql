-- Fix organizations RLS policies (drop both possible name variants, then recreate correctly)
DROP POLICY IF EXISTS "Members can view own organization" ON public.organizations;
DROP POLICY IF EXISTS "Members can view own organization " ON public.organizations;
DROP POLICY IF EXISTS "Org managers can update own organization" ON public.organizations;
DROP POLICY IF EXISTS "Org managers can update own organization " ON public.organizations;

CREATE POLICY "Members can view own organization"
ON public.organizations
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.user_id = auth.uid()
      AND p.organization_id = organizations.id
  )
);

CREATE POLICY "Org managers can update own organization"
ON public.organizations
FOR UPDATE
USING (
  has_role(auth.uid(), 'organization'::app_role)
  AND EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.user_id = auth.uid()
      AND p.organization_id = organizations.id
  )
)
WITH CHECK (
  has_role(auth.uid(), 'organization'::app_role)
  AND EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.user_id = auth.uid()
      AND p.organization_id = organizations.id
  )
);
