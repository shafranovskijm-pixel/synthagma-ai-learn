-- Update handle_new_user to respect registration_type from metadata
-- Only allows 'organization' or 'student' (never 'admin' for security)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  requested_role text;
  final_role app_role;
BEGIN
  -- Get requested role from metadata (only organization or student allowed)
  requested_role := COALESCE(new.raw_user_meta_data ->> 'registration_type', 'student');
  
  -- SECURITY: Only allow organization or student, never admin
  IF requested_role = 'organization' THEN
    final_role := 'organization'::app_role;
  ELSE
    final_role := 'student'::app_role;
  END IF;

  -- Insert profile with user data
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data ->> 'full_name', ''),
    new.email
  );
  
  -- Insert role based on registration type
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, final_role);
  
  -- If organization role, create organization entry and link profile
  IF final_role = 'organization' THEN
    DECLARE
      new_org_id uuid;
    BEGIN
      INSERT INTO public.organizations (name, email, contact_name)
      VALUES (
        COALESCE(new.raw_user_meta_data ->> 'full_name', 'Новая организация'),
        new.email,
        COALESCE(new.raw_user_meta_data ->> 'full_name', '')
      )
      RETURNING id INTO new_org_id;
      
      UPDATE public.profiles
      SET organization_id = new_org_id
      WHERE user_id = new.id;
    END;
  END IF;
  
  RETURN new;
END;
$$;