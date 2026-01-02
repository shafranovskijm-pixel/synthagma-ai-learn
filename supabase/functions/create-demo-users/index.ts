import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEMO_USERS = [
  { email: "admin@demo.syntagma.ru", password: "demo123", role: "admin", fullName: "Демо Админ" },
  { email: "org@demo.syntagma.ru", password: "demo123", role: "organization", fullName: "Демо Организация" },
  { email: "student@demo.syntagma.ru", password: "demo123", role: "student", fullName: "Демо Студент" },
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const results = [];

    for (const user of DEMO_USERS) {
      console.log(`Creating user: ${user.email}`);

      // Create user
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true,
        user_metadata: { full_name: user.fullName },
      });

      if (authError) {
        console.error(`Error creating user ${user.email}:`, authError);
        results.push({ email: user.email, success: false, error: authError.message });
        continue;
      }

      console.log(`User created: ${authData.user.id}`);

      // Update role (trigger creates student role by default)
      if (user.role !== "student") {
        const { error: roleError } = await supabaseAdmin
          .from("user_roles")
          .update({ role: user.role })
          .eq("user_id", authData.user.id);

        if (roleError) {
          console.error(`Error updating role for ${user.email}:`, roleError);
          results.push({ email: user.email, success: false, error: roleError.message });
          continue;
        }
        console.log(`Role updated to ${user.role} for ${user.email}`);
      }

      results.push({ email: user.email, success: true, role: user.role });
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in create-demo-users:", error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
