
-- Create org_documents table for contracts, invoices, acts
CREATE TABLE public.org_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('contract', 'invoice', 'act')),
  name TEXT NOT NULL,
  file_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.org_documents ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Admins can manage all documents"
ON public.org_documents FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Org managers can manage own documents"
ON public.org_documents FOR ALL
USING (
  has_role(auth.uid(), 'organization'::app_role) 
  AND organization_id = current_organization_id()
);

-- Trigger for updated_at
CREATE TRIGGER update_org_documents_updated_at
BEFORE UPDATE ON public.org_documents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for org documents
INSERT INTO storage.buckets (id, name, public) VALUES ('org-documents', 'org-documents', false);

-- Storage policies
CREATE POLICY "Admins can manage all org docs"
ON storage.objects FOR ALL
USING (bucket_id = 'org-documents' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Org managers can manage own org docs"
ON storage.objects FOR ALL
USING (
  bucket_id = 'org-documents' 
  AND has_role(auth.uid(), 'organization'::app_role)
  AND (storage.foldername(name))[1] = current_organization_id()::text
);
