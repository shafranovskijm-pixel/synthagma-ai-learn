-- Allow organization users to insert new organizations (companies)
CREATE POLICY "Org managers can insert organizations"
ON public.organizations
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'organization'::app_role));