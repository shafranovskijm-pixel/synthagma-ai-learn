-- Create student_documents table for enrollment/expulsion orders
CREATE TABLE public.student_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  enrollment_id UUID NOT NULL REFERENCES public.enrollments(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('enrollment_order', 'expulsion_order')),
  name TEXT NOT NULL CHECK (char_length(name) <= 500),
  file_url TEXT CHECK (char_length(file_url) <= 2000),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.student_documents ENABLE ROW LEVEL SECURITY;

-- Admins can manage all student documents
CREATE POLICY "Admins can manage all student documents"
ON public.student_documents
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Org managers can manage documents for students in their courses
CREATE POLICY "Org managers can manage own student documents"
ON public.student_documents
FOR ALL
USING (
  has_role(auth.uid(), 'organization'::app_role) AND 
  EXISTS (
    SELECT 1 FROM enrollments e
    JOIN courses c ON c.id = e.course_id
    WHERE e.id = student_documents.enrollment_id
    AND c.organization_id = current_organization_id()
  )
);

-- Students can view their own documents
CREATE POLICY "Students can view own documents"
ON public.student_documents
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM enrollments e
    WHERE e.id = student_documents.enrollment_id
    AND e.user_id = auth.uid()
  )
);

-- Add trigger for updated_at
CREATE TRIGGER update_student_documents_updated_at
BEFORE UPDATE ON public.student_documents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for student documents
INSERT INTO storage.buckets (id, name, public) VALUES ('student-documents', 'student-documents', false);

-- Storage policies for student documents bucket
CREATE POLICY "Admins can manage student documents storage"
ON storage.objects
FOR ALL
USING (bucket_id = 'student-documents' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Org managers can manage own student documents storage"
ON storage.objects
FOR ALL
USING (
  bucket_id = 'student-documents' AND 
  has_role(auth.uid(), 'organization'::app_role)
);

CREATE POLICY "Students can view own documents storage"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'student-documents' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);