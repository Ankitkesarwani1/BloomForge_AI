import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabase = createClient(
  Deno.env.get("PROJECT_URL")!,
  Deno.env.get("SERVICE_ROLE_KEY")!
);

async function generateQuestionsWithGemini(prompt: string) {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey!,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json" },
      }),
    }
  );

  if (!res.ok) {
    throw new Error(`Gemini generation error: ${res.status} ${await res.text()}`);
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini returned no content");

  // Defensive cleanup in case the model wraps output in fences despite JSON mode
  const cleaned = text.replace(/^```json\s*|```$/g, "").trim();
  return JSON.parse(cleaned);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { syllabus_id, unit_id, bloom_level, question_type, difficulty, count, marks } =
      await req.json();

    if (!syllabus_id || !unit_id || !bloom_level || !question_type || !difficulty || !count || !marks) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Confirm the unit exists
    const { data: unit, error: unitErr } = await supabase
      .from("units")
      .select("id, unit_number, title")
      .eq("id", unit_id)
      .single();

    if (unitErr || !unit) {
      return new Response(JSON.stringify({ error: "Unit not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Fetch ALL chunks for this unit — direct fetch, not similarity search,
    // since the unit is already a tight scope and we want guaranteed full coverage.
    const { data: unitChunks, error: chunksErr } = await supabase
      .from("syllabus_chunks")
      .select("content")
      .eq("unit_id", unit_id);

    if (chunksErr) {
      return new Response(JSON.stringify({ error: chunksErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!unitChunks || unitChunks.length === 0) {
      return new Response(
        JSON.stringify({ error: "No embedded content found for this unit. Re-upload or re-embed the syllabus first." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Add syllabus-level objectives/outcomes as extra grounding context
    const { data: syllabusChunks } = await supabase
      .from("syllabus_chunks")
      .select("content")
      .eq("syllabus_id", syllabus_id)
      .is("unit_id", null);

    const context = [
      ...unitChunks.map((c) => c.content),
      ...(syllabusChunks ?? []).map((c) => c.content),
    ].join("\n\n");

    // 4. Build the grounded generation prompt
    const isMcq = question_type.toLowerCase().includes("mcq");
    const prompt = `You are an exam question setter for a university course. Use ONLY the syllabus context below to write questions — do not introduce facts, terms, or examples that are not present in the context.

SYLLABUS CONTEXT:
${context}

TASK:
Generate exactly ${count} question(s) with these exact specifications:
- Question type: ${question_type}
- Bloom's taxonomy level: ${bloom_level}
- Difficulty: ${difficulty}
- Marks per question: ${marks}

Respond with ONLY a JSON array (no markdown, no code fences, no commentary) where each element has this exact shape:
{
  "question": "the full question text",
  "type": "${question_type}",
  "bloom": "${bloom_level}",
  "difficulty": "${difficulty}",
  "marks": ${marks}${isMcq ? ',\n  "options": ["option A", "option B", "option C", "option D"],\n  "correct_answer": "the correct option text"' : ""}
}`;

    const questions = await generateQuestionsWithGemini(prompt);

    return new Response(JSON.stringify({ questions }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});