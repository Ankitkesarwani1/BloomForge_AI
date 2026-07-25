import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabase = createClient(
  Deno.env.get("PROJECT_URL")!,
  Deno.env.get("SERVICE_ROLE_KEY")!
);

async function embed(text: string): Promise<number[]> {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "models/gemini-embedding-001",
        content: { parts: [{ text }] },
        outputDimensionality: 768,
      }),
    }
  );
  if (!res.ok) {
    throw new Error(`Gemini embedding error: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  return data.embedding.values;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { syllabus_id } = await req.json();
    if (!syllabus_id) {
      return new Response(JSON.stringify({ error: "syllabus_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await supabase.from("syllabus_chunks").delete().eq("syllabus_id", syllabus_id);

    const { data: syllabus, error: syllabusErr } = await supabase
      .from("syllabi")
      .select("id, subject, code, course_objectives, course_outcomes")
      .eq("id", syllabus_id)
      .single();

    if (syllabusErr || !syllabus) {
      return new Response(JSON.stringify({ error: "Syllabus not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: units, error: unitsErr } = await supabase
      .from("units")
      .select("id, unit_number, title, description, topics(id, topic_number, content)")
      .eq("syllabus_id", syllabus_id);

    if (unitsErr) {
      return new Response(JSON.stringify({ error: unitsErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const chunkRows: {
      syllabus_id: string;
      unit_id: string | null;
      topic_id: string | null;
      content: string;
    }[] = [];

    for (const unit of units ?? []) {
      if (unit.topics && unit.topics.length > 0) {
        for (const topic of unit.topics) {
          const text = `Subject: ${syllabus.subject} (${syllabus.code})\nUnit ${unit.unit_number}: ${unit.title}\nTopic ${topic.topic_number}: ${topic.content}`;
          chunkRows.push({ syllabus_id, unit_id: unit.id, topic_id: topic.id, content: text });
        }
      } else {
        const text = `Subject: ${syllabus.subject} (${syllabus.code})\nUnit ${unit.unit_number}: ${unit.title}\n${unit.description ?? ""}`;
        chunkRows.push({ syllabus_id, unit_id: unit.id, topic_id: null, content: text });
      }
    }

    const objectives = (syllabus.course_objectives ?? []) as string[];
    if (objectives.length > 0) {
      const text = `Subject: ${syllabus.subject} (${syllabus.code})\nCourse Objectives:\n${objectives.map((o, i) => `${i + 1}. ${o}`).join("\n")}`;
      chunkRows.push({ syllabus_id, unit_id: null, topic_id: null, content: text });
    }

    const outcomes = (syllabus.course_outcomes ?? []) as string[];
    if (outcomes.length > 0) {
      const text = `Subject: ${syllabus.subject} (${syllabus.code})\nCourse Outcomes:\n${outcomes.map((o, i) => `${i + 1}. ${o}`).join("\n")}`;
      chunkRows.push({ syllabus_id, unit_id: null, topic_id: null, content: text });
    }

    let inserted = 0;
    const errors: string[] = [];

    for (const row of chunkRows) {
      try {
        const embedding = await embed(row.content);
        const { error } = await supabase.from("syllabus_chunks").insert({
          syllabus_id: row.syllabus_id,
          unit_id: row.unit_id,
          topic_id: row.topic_id,
          content: row.content,
          token_count: Math.ceil(row.content.length / 4),
          embedding,
        });
        if (error) errors.push(error.message);
        else inserted++;
      } catch (e) {
        errors.push(String(e));
      }
    }

    return new Response(
      JSON.stringify({ chunks_inserted: inserted, total_attempted: chunkRows.length, errors }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});