import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Service-role client: bypasses RLS. Needed because `questions` and
// `question_papers` have SELECT policies scoped to created_by = auth.uid()
// — this dashboard shows cross-faculty aggregates, which no client-side
// query (even an admin's) can produce under that policy.
const supabaseAdmin = createClient(
  Deno.env.get("PROJECT_URL")!,
  Deno.env.get("SERVICE_ROLE_KEY")!
);

const RANGE_TO_MONTHS: Record<string, number> = {
  "last-month": 1,
  "last-3-months": 3,
  "last-6-months": 6,
  "last-year": 12,
};

const questionTypeLabels: Record<string, string> = {
  mcq: "MCQ",
  short_answer: "Short Answer",
  long_answer: "Long Answer",
  numerical: "Numerical",
  case_study: "Case Study",
  application: "Application Based",
  analytical: "Analytical",
};

const bloomLabels: Record<string, string> = {
  remember: "Remember",
  understand: "Understand",
  apply: "Apply",
  analyze: "Analyze",
  evaluate: "Evaluate",
  create: "Create",
};

function monthsAgo(n: number): Date {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}`;
}

function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? null : 0; // null = "new" (no prior baseline)
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // ── 1. Auth: confirm caller is an admin.
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
      return new Response(JSON.stringify({ error: "Only admins can view analytics" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── 2. Parse range.
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const range = RANGE_TO_MONTHS[body.range] ? body.range : "last-6-months";
    const months = RANGE_TO_MONTHS[range];

    const cutoff = monthsAgo(months); // start of current period
    const prevCutoff = monthsAgo(months * 2); // start of previous (comparison) period

    // ── 3. Fetch raw rows for current + previous period in one go (from
    // prevCutoff onward), then split in-process — cheaper than 4 round trips.
    const [{ data: questionRows, error: qErr }, { data: paperRows, error: pErr }, { data: profileRows }, { data: subjectRows }] =
      await Promise.all([
        supabaseAdmin
          .from("questions")
          .select("id, created_by, created_at, bloom_level, question_type, difficulty, source, approved, subject_id")
          .gte("created_at", prevCutoff.toISOString()),
        supabaseAdmin
          .from("question_papers")
          .select("id, created_by, created_at, subject_id, status")
          .gte("created_at", prevCutoff.toISOString()),
        supabaseAdmin.from("profiles").select("id, full_name, role"),
        supabaseAdmin.from("subjects").select("id, name"),
      ]);

    if (qErr || pErr) {
      return new Response(JSON.stringify({ error: (qErr || pErr)?.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const profileMap = Object.fromEntries((profileRows ?? []).map((p: any) => [p.id, p]));
    const subjectMap = Object.fromEntries((subjectRows ?? []).map((s: any) => [s.id, s.name]));

    const allQuestions = questionRows ?? [];
    const allPapers = paperRows ?? [];

    const currentQuestions = allQuestions.filter((r: any) => new Date(r.created_at) >= cutoff);
    const currentPapers = allPapers.filter((r: any) => new Date(r.created_at) >= cutoff);
    const prevQuestions = allQuestions.filter((r: any) => new Date(r.created_at) < cutoff);
    const prevPapers = allPapers.filter((r: any) => new Date(r.created_at) < cutoff);

    // ── 4. Totals for current period.
    const totalPapers = currentPapers.length;
    const totalQuestions = currentQuestions.length;
    const totalAIQuestions = currentQuestions.filter((q: any) => q.source === "ai_generated").length;
    const approvedCount = currentQuestions.filter((q: any) => q.approved === true).length;
    const approvalRate = totalQuestions > 0 ? Math.round((approvedCount / totalQuestions) * 1000) / 10 : 0;

    const activeFacultyIds = new Set(
      [...currentQuestions, ...currentPapers]
        .map((r: any) => r.created_by)
        .filter((id: string | null) => id && profileMap[id]?.role === "faculty")
    );
    const activeFaculty = activeFacultyIds.size;

    // ── 5. Same metrics for the previous period, for trend arrows.
    const prevTotalPapers = prevPapers.length;
    const prevTotalQuestions = prevQuestions.length;
    const prevTotalAIQuestions = prevQuestions.filter((q: any) => q.source === "ai_generated").length;
    const prevApprovedCount = prevQuestions.filter((q: any) => q.approved === true).length;
    const prevApprovalRate =
      prevTotalQuestions > 0 ? Math.round((prevApprovedCount / prevTotalQuestions) * 1000) / 10 : 0;
    const prevActiveFacultyIds = new Set(
      [...prevQuestions, ...prevPapers]
        .map((r: any) => r.created_by)
        .filter((id: string | null) => id && profileMap[id]?.role === "faculty")
    );

    const trends = {
      papersChangePct: pctChange(totalPapers, prevTotalPapers),
      aiQuestionsChangePct: pctChange(totalAIQuestions, prevTotalAIQuestions),
      approvalRateChangePct: pctChange(approvalRate, prevApprovalRate),
      activeFacultyChangePct: pctChange(activeFaculty, prevActiveFacultyIds.size),
    };

    // ── 6. Monthly trend buckets across the selected range.
    const buckets: { key: string; label: string; papers: number; questions: number; approved: number }[] = [];
    for (let i = months - 1; i >= 0; i--) {
      const d = monthsAgo(i);
      buckets.push({
        key: monthKey(d),
        label: d.toLocaleDateString("en-US", { month: "short", year: months > 6 ? "2-digit" : undefined }),
        papers: 0,
        questions: 0,
        approved: 0,
      });
    }
    const bucketByKey = Object.fromEntries(buckets.map((b) => [b.key, b]));
    for (const q of currentQuestions) {
      const b = bucketByKey[monthKey(new Date(q.created_at))];
      if (b) {
        b.questions += 1;
        if (q.approved) b.approved += 1;
      }
    }
    for (const p of currentPapers) {
      const b = bucketByKey[monthKey(new Date(p.created_at))];
      if (b) b.papers += 1;
    }
    const monthlyTrend = buckets.map((b) => ({
      month: b.label,
      papers: b.papers,
      questions: b.questions,
      approvalRate: b.questions > 0 ? Math.round((b.approved / b.questions) * 1000) / 10 : 0,
    }));

    // ── 7. Faculty usage breakdown.
    const facultyStats: Record<string, { papers: number; questions: number; aiQuestions: number }> = {};
    for (const q of currentQuestions) {
      if (!q.created_by) continue;
      facultyStats[q.created_by] ??= { papers: 0, questions: 0, aiQuestions: 0 };
      facultyStats[q.created_by].questions += 1;
      if (q.source === "ai_generated") facultyStats[q.created_by].aiQuestions += 1;
    }
    for (const p of currentPapers) {
      if (!p.created_by) continue;
      facultyStats[p.created_by] ??= { papers: 0, questions: 0, aiQuestions: 0 };
      facultyStats[p.created_by].papers += 1;
    }
    const facultyUsage = Object.entries(facultyStats)
      .map(([id, s]) => ({
        name: profileMap[id]?.full_name ?? "Unknown User",
        papers: s.papers,
        questions: s.questions,
        aiUsagePercent: s.questions > 0 ? Math.round((s.aiQuestions / s.questions) * 100) : 0,
      }))
      .sort((a, b) => b.papers - a.papers || b.questions - a.questions)
      .slice(0, 8);

    // ── 8. Questions by subject (replaces fictional "topics" — topic_id is
    // never populated by the generator, subject_id always is).
    const subjectCounts: Record<string, number> = {};
    for (const q of currentQuestions) {
      if (!q.subject_id) continue;
      subjectCounts[q.subject_id] = (subjectCounts[q.subject_id] ?? 0) + 1;
    }
    const subjectPopularity = Object.entries(subjectCounts)
      .map(([id, count]) => ({ subject: subjectMap[id] ?? "Unknown Subject", count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
    const subjectsCovered = Object.keys(subjectCounts).length;

    // ── 9. Bloom's taxonomy distribution (real, direct column).
    const bloomCounts: Record<string, number> = {};
    for (const q of currentQuestions) {
      const level = q.bloom_level;
      if (!level) continue;
      bloomCounts[level] = (bloomCounts[level] ?? 0) + 1;
    }
    const bloomDistribution = Object.keys(bloomLabels).map((key) => ({
      level: bloomLabels[key],
      count: bloomCounts[key] ?? 0,
      percentage: totalQuestions > 0 ? Math.round(((bloomCounts[key] ?? 0) / totalQuestions) * 100) : 0,
    }));

    // ── 10. Question type distribution (replaces the fictional AI
    // performance radar — no generation-speed/accuracy/relevance data
    // exists anywhere, so we surface a real breakdown instead).
    const typeCounts: Record<string, number> = {};
    for (const q of currentQuestions) {
      const t = q.question_type;
      if (!t) continue;
      typeCounts[t] = (typeCounts[t] ?? 0) + 1;
    }
    const questionTypeDistribution = Object.keys(questionTypeLabels)
      .map((key) => ({
        type: questionTypeLabels[key],
        count: typeCounts[key] ?? 0,
        percentage: totalQuestions > 0 ? Math.round(((typeCounts[key] ?? 0) / totalQuestions) * 100) : 0,
      }))
      .filter((t) => t.count > 0)
      .sort((a, b) => b.count - a.count);

    // ── 11. Most recent activity timestamp, for the achievements section.
    const mostRecentQuestionAt = currentQuestions.reduce(
      (latest: string | null, q: any) => (!latest || q.created_at > latest ? q.created_at : latest),
      null
    );

    return new Response(
      JSON.stringify({
        totals: { totalPapers, totalQuestions, totalAIQuestions, approvedCount, approvalRate, activeFaculty },
        trends,
        monthlyTrend,
        facultyUsage,
        subjectPopularity,
        subjectsCovered,
        bloomDistribution,
        questionTypeDistribution,
        mostRecentQuestionAt,
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