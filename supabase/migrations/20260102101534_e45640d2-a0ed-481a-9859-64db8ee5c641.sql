-- Remove restrictive content length constraint and update type check
ALTER TABLE public.lessons DROP CONSTRAINT lessons_content_length;
ALTER TABLE public.lessons ADD CONSTRAINT lessons_content_length CHECK (length(content) <= 10000000);

ALTER TABLE public.lessons DROP CONSTRAINT lessons_type_check;
ALTER TABLE public.lessons ADD CONSTRAINT lessons_type_check CHECK (type = ANY (ARRAY['text'::text, 'video'::text, 'image'::text, 'test'::text, 'audio'::text]));