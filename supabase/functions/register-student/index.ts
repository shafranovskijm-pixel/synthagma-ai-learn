import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RegisterStudentRequest {
  token?: string | null;
  email: string;
  password: string;
  full_name: string;
  organization_id?: string | null;
  course_id?: string | null;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const { token, email, password, full_name, organization_id, course_id }: RegisterStudentRequest = await req.json();

    console.log("Register student request:", { token, email, full_name, organization_id, course_id });

    if (!email || !password || !full_name) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let orgId = organization_id;

    // If token provided, verify registration link
    if (token) {
      const { data: link, error: linkError } = await supabaseAdmin
        .from("registration_links")
        .select("*")
        .eq("token", token)
        .single();

      if (linkError || !link) {
        console.error("Link not found:", linkError);
        return new Response(
          JSON.stringify({ error: "Invalid registration link" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (new Date(link.expires_at) < new Date()) {
        return new Response(
          JSON.stringify({ error: "Registration link has expired" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      orgId = link.organization_id;

      // Update link usage count
      await supabaseAdmin
        .from("registration_links")
        .update({ used_count: (link.used_count || 0) + 1 })
        .eq("id", link.id);
    }

    if (!orgId) {
      return new Response(
        JSON.stringify({ error: "Organization ID required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create user with admin API
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name,
        registration_type: "student"
      }
    });

    if (authError) {
      console.error("Auth error:", authError);
      return new Response(
        JSON.stringify({ error: authError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = authData.user.id;
    console.log("User created:", userId);

    // Wait a moment for the trigger to create profile and role
    await new Promise(resolve => setTimeout(resolve, 500));

    // Update profile with organization_id (trigger creates profile with student role)
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update({ 
        organization_id: orgId,
        full_name: full_name 
      })
      .eq("user_id", userId);

    if (profileError) {
      console.error("Profile update error:", profileError);
    }

    // If course_id provided, create enrollment
    if (course_id) {
      const { error: enrollError } = await supabaseAdmin
        .from("enrollments")
        .insert({
          user_id: userId,
          course_id: course_id,
          status: "active",
          progress: 0
        });

      if (enrollError) {
        console.error("Enrollment error:", enrollError);
      } else {
        console.log("Student enrolled in course:", course_id);
      }
    }

    console.log("Student registered successfully:", { userId, organizationId: orgId });

    return new Response(
      JSON.stringify({ 
        success: true, 
        user_id: userId,
        organization_id: orgId
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error in register-student:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
