import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Service-role client: bypasses RLS, can call the Admin Auth API
// (auth.admin.createUser) and write to profiles regardless of policy.
const supabaseAdmin = createClient(
  Deno.env.get("PROJECT_URL")!,
  Deno.env.get("SERVICE_ROLE_KEY")!
);

const VALID_ROLES = ["faculty", "admin", "exam_cell"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // ── 1. Identify the caller from their JWT and confirm they're an admin.
    // Anyone can call this URL, but only an authenticated admin's token
    // should be allowed to actually create accounts.
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");

    if (!token) {
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: callerData, error: callerErr } = await supabaseAdmin.auth.getUser(token);
    if (callerErr || !callerData?.user) {
      return new Response(JSON.stringify({ error: "Invalid or expired session" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: callerProfile, error: callerProfileErr } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", callerData.user.id)
      .single();

    if (callerProfileErr || callerProfile?.role !== "admin") {
      return new Response(JSON.stringify({ error: "Only admins can create users" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── 2. Validate input.
    const { full_name, email, password, role, department } = await req.json();

    if (!full_name || !email || !password) {
      return new Response(
        JSON.stringify({ error: "full_name, email, and password are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (password.length < 6) {
      return new Response(JSON.stringify({ error: "Password must be at least 6 characters" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const finalRole = VALID_ROLES.includes(role) ? role : "faculty";

    // ── 3. Create the actual auth account (this is the part that requires
    // the service role key — it's what lets the new user log in with the
    // email/password the admin just typed in).
    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // skip email verification since an admin is vouching for this account
      user_metadata: { full_name },
    });

    if (createErr || !created?.user) {
      return new Response(JSON.stringify({ error: createErr?.message || "Failed to create user" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── 4. Ensure the profiles row reflects what the admin entered.
    // Upsert rather than insert: if a DB trigger already auto-creates a
    // bare profile row on auth.users insert, this fills in/overwrites the
    // fields the admin specified instead of conflicting with it.
    const { error: profileErr } = await supabaseAdmin.from("profiles").upsert({
      id: created.user.id,
      full_name,
      email,
      role: finalRole,
      department: department || null,
    });

    if (profileErr) {
      // Auth account exists but profile row failed — surface this clearly
      // rather than silently leaving a half-created account.
      return new Response(
        JSON.stringify({
          error: `User account created, but profile setup failed: ${profileErr.message}`,
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ user: { id: created.user.id, email, full_name, role: finalRole } }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});