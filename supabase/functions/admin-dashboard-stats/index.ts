import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Service-role client: bypasses RLS. Needed here because `questions` and
// `question_papers` have SELECT policies scoped to `created_by = auth.uid()`
// — correct for faculty (they shouldn't see each other's content), but it
// means no client-side query, even an admin's, can ever see the true totals.
const supabaseAdmin = createClient(
  Deno.env.get("PROJECT_URL")!,
  Deno.env.get("SERVICE_ROLE_KEY")!
);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // ── 1. Identify caller and confirm they're an admin (same gate as
    // admin-create-user — only admins should see cross-user aggregates).
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
      return new Response(JSON.stringify({ error: "Only admins can view dashboard stats" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── 2. Global totals (exact counts, RLS bypassed via service role).
    const [{ count: totalQuestions }, { count: totalPapers }] = await Promise.all([
      supabaseAdmin.from("questions").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("question_papers").select("*", { count: "exact", head: true }),
    ]);

    // ── 3. Per-faculty breakdown. Pulling just the `created_by` column and
    // aggregating in-process — fine at hundreds/low-thousands of rows. If
    // this table grows much larger, replace with a Postgres RPC that does
    // `select created_by, count(*) group by created_by` server-side instead.
    const [{ data: questionRows }, { data: paperRows }] = await Promise.all([
      supabaseAdmin.from("questions").select("created_by"),
      supabaseAdmin.from("question_papers").select("created_by"),
    ]);

    const questionCounts: Record<string, number> = {};
    for (const row of questionRows ?? []) {
      if (!row.created_by) continue;
      questionCounts[row.created_by] = (questionCounts[row.created_by] ?? 0) + 1;
    }

    const paperCounts: Record<string, number> = {};
    for (const row of paperRows ?? []) {
      if (!row.created_by) continue;
      paperCounts[row.created_by] = (paperCounts[row.created_by] ?? 0) + 1;
    }

    const userIds = [...new Set([...Object.keys(questionCounts), ...Object.keys(paperCounts)])];

    const perUser = userIds.map((id) => ({
      id,
      questionCount: questionCounts[id] ?? 0,
      paperCount: paperCounts[id] ?? 0,
    }));

    return new Response(
      JSON.stringify({
        totalQuestions: totalQuestions ?? 0,
        totalPapers: totalPapers ?? 0,
        perUser,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});