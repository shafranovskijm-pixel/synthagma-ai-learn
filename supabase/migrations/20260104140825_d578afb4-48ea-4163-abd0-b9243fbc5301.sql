-- Create course_categories table
CREATE TABLE public.course_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#6366f1',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add category_id to courses
ALTER TABLE public.courses ADD COLUMN category_id UUID REFERENCES public.course_categories(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE public.course_categories ENABLE ROW LEVEL SECURITY;

-- RLS policies for course_categories
CREATE POLICY "Org managers can manage own categories"
ON public.course_categories
FOR ALL
USING (has_role(auth.uid(), 'organization'::app_role) AND organization_id = current_organization_id());

CREATE POLICY "Admins can manage all categories"
ON public.course_categories
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));