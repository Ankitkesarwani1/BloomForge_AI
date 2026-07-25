import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabase = createClient(
  Deno.env.get("PROJECT_URL")!,
  Deno.env.get("SERVICE_ROLE_KEY")!
);

const bloomVerbGuide: Record<string, string> = {
  Remember: "define, list, state, identify, name",
  Understand: "explain, describe, summarize, illustrate, classify",
  Apply: "apply, solve, demonstrate, use, implement, compute",
  Analyze: "differentiate, compare, analyze, break down, examine",
  Evaluate: "evaluate, justify, critique, assess, argue",
  Create: "design, formulate, propose, construct, devise",
};

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

    const { data: syllabusChunks } = await supabase
      .from("syllabus_chunks")
      .select("content")
      .eq("syllabus_id", syllabus_id)
      .is("unit_id", null);

    const context = [
      ...unitChunks.map((c) => c.content),
      ...(syllabusChunks ?? []).map((c) => c.content),
    ].join("\n\n");

    const isMcq = question_type.toLowerCase().includes("mcq");

    // KEY CHANGE: the syllabus context is scope guidance only — the model
    // must use its own subject-matter knowledge to construct a genuine,
    // real-exam-quality question, not a question about the document itself.
    const prompt = `You are an experienced university professor setting questions for a semester-end exam paper in an Artificial Intelligence & Data Science / Computer Engineering program (in the style of Indian university autonomous-institute exams).

SCOPE — use this ONLY to know which topic area you are allowed to draw the question from. Do NOT copy this text into the question, and do NOT mention "syllabus", "unit", "module", "topic", "course outcome", or any numbering anywhere in the question itself:
${context}

Draw on your own full subject-matter expertise on this topic to write a rigorous, genuinely testable exam question — the kind that would appear in a real semester-end question paper, NOT a question that asks about the syllabus document itself.

Write exactly ${count} question(s) with these specifications:
- Question type: ${question_type}
- Bloom's taxonomy level: ${bloom_level} (use verbs like: ${bloomVerbGuide[bloom_level] ?? bloom_level})
- Difficulty: ${difficulty}
- Marks per question: ${marks}

STRICT RULES:
1. Never mention "syllabus", "unit", "module", "topic", "course outcome", or any numbering (e.g. "Topic 3.2") in the question text. Write it exactly as it would appear on a real exam paper.
2. For Numerical, Case Study, or Application-based questions, invent concrete, realistic data (numbers, scenarios, small worked examples) yourself — you may assume suitable data if necessary, exactly as real exam papers instruct students to do.
3. For questions worth 8 or more marks, structure them with 2–3 sub-parts — (i), (ii), (iii) or (a), (b) — within the single question text, the way real long-answer and case-study questions are structured.
4. For Long Answer or Analytical questions on algorithms/proofs (e.g. resolution, alpha-beta pruning, Bayesian inference, HMM), include a fully worked mini-example with actual values and steps, not just an abstract description.
5. The question must be fully self-contained — a student reading only the question, with no access to the syllabus, must be able to attempt it.

Respond with ONLY a JSON array (no markdown, no code fences, no commentary) where each element has this exact shape:
{
  "question": "the full question text, including sub-parts if applicable",
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