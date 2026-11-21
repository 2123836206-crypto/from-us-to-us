import { createClient } from "npm:@supabase/supabase-js@2";

const allowedOrigins = (Deno.env.get("ALLOWED_ORIGINS") ?? "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

function headersFor(origin: string) {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "authorization, apikey, content-type",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Vary": "Origin",
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  };
}

Deno.serve(async (request) => {
  const origin = request.headers.get("origin") ?? "";
  if (!allowedOrigins.includes(origin)) {
    return new Response(JSON.stringify({ error: "This site is not allowed to read the archive." }), {
      status: 403,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  }

  const headers = headersFor(origin);
  if (request.method === "OPTIONS") return new Response("ok", { headers });
  if (request.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed." }), { status: 405, headers });
  }

  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("DATABASE_API_KEY");
  if (!url || !serviceKey) {
    return new Response(JSON.stringify({ error: "The archive database is not configured yet." }), { status: 503, headers });
  }

  const database = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { data, error } = await database
    .from("letters")
    .select("id, sort_order, title, letter, name, programme, cohort, theme, source, submitted_at, published_at")
    .eq("status", "published")
    .order("sort_order", { ascending: true, nullsFirst: false })
    .order("submitted_at", { ascending: false });

  if (error) {
    console.error("Could not load the public archive", error.message);
    return new Response(JSON.stringify({ error: "The archive could not be loaded." }), { status: 500, headers });
  }

  return new Response(JSON.stringify({ letters: data ?? [] }), { status: 200, headers });
});
