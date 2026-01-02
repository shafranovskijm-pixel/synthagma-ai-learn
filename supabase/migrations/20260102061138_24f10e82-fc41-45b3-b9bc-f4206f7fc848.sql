-- Fix SECURITY DEFINER privilege escalation vulnerability
-- The handle_new_user function must NOT accept role from user-supplied metadata
-- Always default to 'student' role - admins must manually promote users

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Insert profile with user data
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data ->> 'full_name', ''),
    new.email
  );
  
  -- SECURITY FIX: Always insert as 'student' role
  -- Role escalation must be done by an admin through proper channels
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, 'student');
  
  RETURN new;
END;
$$;