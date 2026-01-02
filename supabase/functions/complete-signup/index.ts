import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type RegistrationType = "organization" | "student";

interface CompleteSignupBody {
  full_name?: string;
  registration_type?: RegistrationType;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      console.error("Missing env vars", {
        hasUrl: !!supabaseUrl,
        hasAnon: !!anonKey,
        hasServiceRole: !!serviceRoleKey,
      });
      return new Response(JSON.stringify({ error: "Server misconfigured" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const authHeader = req.headers.get("authorization") ?? req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const body: CompleteSignupBody = await req.json().catch(() => ({}));
    const requestedType: RegistrationType = body.registration_type === "organization" ? "organization" : "student";

    // Identify caller (must be authenticated)
    const supabaseAuthed = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });

    const { data: userData, error: userError } = await supabaseAuthed.auth.getUser();
    if (userError || !userData?.user) {
      console.error("getUser failed", userError);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const user = userData.user;

    // Admin client for DB writes
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    // Ensure profile exists
    const { data: existingProfile, error: profileSelectError } = await supabaseAdmin
      .from("profiles")
      .select("id, organization_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (profileSelectError) {
      console.error("profile select error", profileSelectError);
      throw profileSelectError;
    }

    if (!existingProfile) {
      const { error: insertProfileError } = await supabaseAdmin.from("profiles").insert({
        user_id: user.id,
        full_name: (body.full_name ?? (user.user_metadata as any)?.full_name ?? "").toString().slice(0, 200),
        email: user.email,
      });
      if (insertProfileError) {
        console.error("profile insert error", insertProfileError);
        throw insertProfileError;
      }
    }

    // Ensure role exists (only student/organization allowed)
    const finalRole = requestedType === "organization" ? "organization" : "student";

    const { data: existingRole, error: roleSelectError } = await supabaseAdmin
      .from("user_roles")
      .select("id, role")
      .eq("user_id", user.id)
      .maybeSingle();

    if (roleSelectError) {
      console.error("role select error", roleSelectError);
      throw roleSelectError;
    }

    if (!existingRole) {
      const { error: insertRoleError } = await supabaseAdmin.from("user_roles").insert({
        user_id: user.id,
        role: finalRole,
      });
      if (insertRoleError) {
        console.error("role insert error", insertRoleError);
        throw insertRoleError;
      }
    }

    // If organization: create organization + link profile (only if not linked yet)
    let organization_id: string | null = existingProfile?.organization_id ?? null;

    if (finalRole === "organization" && !organization_id) {
      const orgName = ((body.full_name ?? (user.user_metadata as any)?.full_name ?? "Новая организация") as string)
        .toString()
        .slice(0, 200);

      const { data: newOrg, error: orgInsertError } = await supabaseAdmin
        .from("organizations")
        .insert({
          name: orgName || "Новая организация",
          email: user.email,
          contact_name: orgName,
          ai_enabled: false,
        })
        .select("id")
        .single();

      if (orgInsertError) {
        console.error("org insert error", orgInsertError);
        throw orgInsertError;
      }

      organization_id = newOrg.id;

      const { error: profileUpdateError } = await supabaseAdmin
        .from("profiles")
        .update({ organization_id })
        .eq("user_id", user.id);

      if (profileUpdateError) {
        console.error("profile update error", profileUpdateError);
        throw profileUpdateError;
      }
    }

    return new Response(
      JSON.stringify({ success: true, role: finalRole, organization_id }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("complete-signup error", error);
    return new Response(JSON.stringify({ error: error?.message ?? "Unknown error" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
