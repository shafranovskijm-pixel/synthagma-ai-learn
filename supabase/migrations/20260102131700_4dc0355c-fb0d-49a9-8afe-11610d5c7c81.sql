-- Fix student-documents storage policy to validate organization ownership
DROP POLICY IF EXISTS "Org managers can manage own student documents storage" ON storage.objects;

CREATE POLICY "Org managers can manage own student documents storage"
ON storage.objects FOR ALL
USING (
  bucket_id = 'student-documents' AND 
  has_role(auth.uid(), 'organization'::app_role) AND
  EXISTS (
    SELECT 1 FROM public.enrollments e
    JOIN public.courses c ON c.id = e.course_id
    WHERE e.id::text = (storage.foldername(name))[1]
    AND c.organization_id = public.current_organization_id()
  )
)
WITH CHECK (
  bucket_id = 'student-documents' AND 
  has_role(auth.uid(), 'organization'::app_role) AND
  EXISTS (
    SELECT 1 FROM public.enrollments e
    JOIN public.courses c ON c.id = e.course_id
    WHERE e.id::text = (storage.foldername(name))[1]
    AND c.organization_id = public.current_organization_id()
  )
);