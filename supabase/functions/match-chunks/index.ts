import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
  try {
    const { query, unit_id, syllabus_id, match_count } = await req.json();
    if (!query) {
      return new Response(JSON.stringify({ error: "query is required" }), { status: 400 });
    }

    const queryEmbedding = await embed(query);

    const { data, error } = await supabase.rpc("match_syllabus_chunks", {
      query_embedding: queryEmbedding,
      filter_unit_id: unit_id ?? null,
      filter_syllabus_id: syllabus_id ?? null,
      match_count: match_count ?? 5,
    });

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }

    return new Response(JSON.stringify({ results: data }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
  }
});