const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// NOTE: unlike generate-questions, this function doesn't need a Supabase
// client — everything it needs (question text, marks, bloom level,
// difficulty, unit) is already passed in the request body from the client,
// with no DB lookups required. If you later want a feedback loop like
// generate-questions has (pulling previously human-edited answers as
// few-shot examples), re-add:
//   import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
//   const supabase = createClient(Deno.env.get("PROJECT_URL")!, Deno.env.get("SERVICE_ROLE_KEY")!);

// Rough guidance so answer depth actually scales with marks, rather than
// the model producing a uniform-length answer regardless of weight.
function depthGuidance(marks: number): string {
  if (marks <= 2) return "very short — 2 to 4 sentences or a short labeled list, no sub-headings.";
  if (marks <= 5) return "short — a focused paragraph or a small labeled list covering the key points, 6-10 sentences total.";
  if (marks <= 10) return "moderate length — structured with sub-points or short paragraphs per concept, include a worked example or diagram description if relevant.";
  return "comprehensive — structured with clear sub-headings/sections covering every part of the question, include worked examples, diagrams-in-words, and edge cases where relevant.";
}

async function callGemini(prompt: string) {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  const models = ["gemini-2.0-flash", "gemini-1.5-flash-latest", "gemini-1.5-flash", "gemini-2.5-flash"];
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
              maxOutputTokens: 4096, // headroom for long-answer model answers with worked examples
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

async function callChatGPT(prompt: string, customApiKey?: string) {
  const apiKey = customApiKey || Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: "You are an experienced university examiner writing official answer keys in JSON format.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.7,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`ChatGPT generation error: ${res.status} ${errText}`);
  }

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error("ChatGPT returned no text response");
  return text;
}

interface AnswerKeyResult {
  modelAnswer: string;
  markingScheme: { point: string; marks: number }[];
  rubric: string;
}

async function generateAnswerKeyWithRetry(
  prompt: string,
  provider?: string,
  openaiKey?: string
): Promise<AnswerKeyResult> {
  let lastErr: unknown;
  const preferredChatGPT = provider === "chatgpt" || Boolean(openaiKey || Deno.env.get("OPENAI_API_KEY"));

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      let text: string;
      if (preferredChatGPT) {
        try {
          text = await callChatGPT(prompt, openaiKey);
        } catch (chatGptErr) {
          console.warn(`ChatGPT attempt ${attempt} failed, falling back to Gemini:`, chatGptErr);
          text = await callGemini(prompt);
        }
      } else {
        text = await callGemini(prompt);
      }

      const cleaned = text.replace(/^```json\s*|```$/g, "").trim();
      const parsed = JSON.parse(cleaned);
      if (
        typeof parsed.modelAnswer === "string" &&
        Array.isArray(parsed.markingScheme) &&
        typeof parsed.rubric === "string"
      ) {
        return parsed as AnswerKeyResult;
      }
      throw new Error("Response JSON did not match the expected shape");
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
    const { question, marks, bloom_level, difficulty, unit, exam_format, provider, openai_api_key } = await req.json();

    if (!question || !marks) {
      return new Response(JSON.stringify({ error: "question and marks are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const prompt = `You are an experienced university examiner writing an official answer key for an Artificial Intelligence & Data Science / Computer Engineering program (in the style of Indian university autonomous-institute exams).

Question (worth ${marks} marks): "${question}"
${unit ? `Syllabus unit: ${unit}` : ""}
${bloom_level ? `Bloom's taxonomy level: ${bloom_level}` : ""}
${difficulty ? `Difficulty: ${difficulty}` : ""}
${exam_format ? `Exam type: ${exam_format}` : ""}

Write:
1. A model answer whose length and depth is ${depthGuidance(marks)} If the question has sub-parts (i), (ii), (iii) or (a), (b), answer each sub-part separately and clearly labeled.
2. A marking scheme: a breakdown of specific points/steps an examiner should award marks for. The "marks" values in this breakdown MUST sum to exactly ${marks}.
3. A short rubric (2-4 sentences) explaining how to award partial credit and what disqualifies full marks.

Respond with ONLY valid JSON (no markdown, no code fences, no commentary) in exactly this shape:
{
  "modelAnswer": "the full model answer, using \\n for line breaks and plain text for any code/formulas",
  "markingScheme": [{ "point": "string", "marks": number }, ...],
  "rubric": "string"
}`;

    const result = await generateAnswerKeyWithRetry(prompt, provider, openai_api_key);

    // Safety net: if the marking scheme doesn't sum to the question's
    // marks, scale it proportionally rather than shipping a mismatched
    // scheme (the client also flags this visually either way).
    const schemeSum = result.markingScheme.reduce((s, item) => s + (item.marks || 0), 0);
    if (schemeSum > 0 && schemeSum !== marks) {
      const scale = marks / schemeSum;
      let running = 0;
      result.markingScheme = result.markingScheme.map((item, i) => {
        const isLast = i === result.markingScheme.length - 1;
        const scaledMarks = isLast ? marks - running : Math.round(item.marks * scale);
        running += scaledMarks;
        return { ...item, marks: scaledMarks };
      });
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});