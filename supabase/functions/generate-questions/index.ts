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

const questionTypeToEnum: Record<string, string> = {
  "MCQ": "mcq", "Short Answer": "short_answer", "Long Answer": "long_answer",
  "Numerical": "numerical", "Case Study": "case_study",
  "Application Based": "application", "Analytical": "analytical",
};
const bloomToEnum: Record<string, string> = {
  Remember: "remember", Understand: "understand", Apply: "apply",
  Analyze: "analyze", Evaluate: "evaluate", Create: "create",
};

// Pulls real accepted questions to use as style exemplars — this is the
// feedback loop: questions actually used in a finalized paper are the
// strongest quality signal; approved-but-unused ones are the fallback.
async function fetchFewShotExamples(syllabusId: string, questionTypeEnum: string, bloomEnum: string) {
  try {
    const { data: usedInPapers } = await supabase
      .from("question_paper_items")
      .select("questions!inner(question_text, marks, question_type, bloom_level, subject_id)")
      .eq("questions.subject_id", syllabusId)
      .eq("questions.question_type", questionTypeEnum)
      .eq("questions.bloom_level", bloomEnum)
      .limit(3);

    if (usedInPapers && usedInPapers.length > 0) {
      return usedInPapers.map((row: any) => row.questions.question_text);
    }
  } catch {
    // relationship/join issue — fall through to the simpler query below
  }

  const { data: approved } = await supabase
    .from("questions")
    .select("question_text")
    .eq("subject_id", syllabusId)
    .eq("approved", true)
    .eq("question_type", questionTypeEnum)
    .eq("bloom_level", bloomEnum)
    .order("created_at", { ascending: false })
    .limit(3);

  return (approved ?? []).map((q) => q.question_text);
}

async function callGemini(prompt: string) {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  const models = ["gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-3.5-flash-lite"];
  let lastError: Error | null = null;

  for (const model of models) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey! },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              responseMimeType: "application/json",
              maxOutputTokens: 8192,
            },
          }),
        }
      );

      if (!res.ok) {
        const errText = await res.text();
        lastError = new Error(`Gemini generation error (${model}): ${res.status} ${errText}`);
        console.warn(`Model ${model} failed:`, res.status, errText);
        continue;
      }

      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        lastError = new Error(`Gemini (${model}) returned no content (likely blocked by safety filters or empty response)`);
        continue;
      }
      return text;
    } catch (err: any) {
      lastError = err;
      console.warn(`Attempt with ${model} failed with exception:`, err);
    }
  }

  throw lastError || new Error("All Gemini model attempts failed.");
}

async function generateQuestionsWithRetry(prompt: string) {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const text = await callGemini(prompt);
      const cleaned = text.replace(/^```json\s*|```$/g, "").trim();
      return JSON.parse(cleaned);
    } catch (e) {
      lastErr = e;
      console.error(`Generation attempt ${attempt} failed:`, e);
    }
  }
  throw new Error(`Model output could not be parsed after 2 attempts: ${lastErr}`);
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

    // Feedback loop: pull real accepted examples for this exact type+bloom combo
    const questionTypeEnum = questionTypeToEnum[question_type] ?? "short_answer";
    const bloomEnum = bloomToEnum[bloom_level] ?? "understand";
    const examples = await fetchFewShotExamples(syllabus_id, questionTypeEnum, bloomEnum);

    const exampleBlock = examples.length > 0
      ? `\nHere are examples of previously approved/used questions for this exact course, type, and Bloom's level — match this style, phrasing, and rigor level (but do NOT repeat their content):\n${examples.map((e, i) => `${i + 1}. ${e}`).join("\n")}\n`
      : "";

    const prompt = `You are an experienced university professor setting questions for a semester-end exam paper in an Artificial Intelligence & Data Science / Computer Engineering program (in the style of Indian university autonomous-institute exams).

SCOPE — use this ONLY to know which topic area you are allowed to draw the question from. Do NOT copy this text into the question, and do NOT mention "syllabus", "unit", "module", "topic", "course outcome", or any numbering anywhere in the question itself:
${context}
${exampleBlock}
Draw on your own full subject-matter expertise on this topic to write a rigorous, genuinely testable exam question — the kind that would appear in a real semester-end question paper, NOT a question that asks about the syllabus document itself.

Write exactly ${count} question(s) with these specifications:
- Question type: ${question_type}
- Bloom's taxonomy level: ${bloom_level} (use verbs like: ${bloomVerbGuide[bloom_level] ?? bloom_level})
- Difficulty: ${difficulty}
- Marks per question: ${marks}

STRICT RULES:
1. Never mention "syllabus", "unit", "module", "topic", "course outcome", or any numbering (e.g. "Topic 3.2") in the question text.
2. For Numerical, Case Study, or Application-based questions, invent concrete, realistic data yourself — you may assume suitable data if necessary.
3. For questions worth 8 or more marks, structure them with 2–3 sub-parts — (i), (ii), (iii) or (a), (b).
4. For Long Answer or Analytical questions on algorithms/proofs, include a fully worked mini-example with actual values and steps.
5. The question must be fully self-contained.

Respond with ONLY a JSON array (no markdown, no code fences, no commentary) where each element has this exact shape:
{
  "question": "the full question text, including sub-parts if applicable",
  "type": "${question_type}",
  "bloom": "${bloom_level}",
  "difficulty": "${difficulty}",
  "marks": ${marks}${isMcq ? ',\n  "options": ["option A", "option B", "option C", "option D"],\n  "correct_answer": "the correct option text"' : ""}
}`;

    const questions = await generateQuestionsWithRetry(prompt);

    return new Response(JSON.stringify({ questions, examples_used: examples.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});