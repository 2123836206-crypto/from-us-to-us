import { createClient } from "npm:@supabase/supabase-js@2";

const allowedOrigins = (Deno.env.get("ALLOWED_ORIGINS") ?? "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

function headersFor(origin: string) {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "authorization, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  };
}

function reply(origin: string, payload: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(payload), { status, headers: headersFor(origin) });
}

function text(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value.trim();
  return cleaned || null;
}

function makeTitle(letter: string): string {
  const firstSentence = letter.split(/(?<=[.!?])\s+/)[0].trim();
  const source = firstSentence || letter;
  if (source.length <= 85) return source.replace(/[.!?]+$/, "");
  return `${source.slice(0, 82).trimEnd()}…`;
}

Deno.serve(async (request) => {
  const origin = request.headers.get("origin") ?? "";
  if (!allowedOrigins.includes(origin)) {
    return new Response(JSON.stringify({ error: "This site is not allowed to submit letters." }), {
      status: 403,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  }

  if (request.method === "OPTIONS") return new Response("ok", { headers: headersFor(origin) });
  if (request.method !== "POST") return reply(origin, { error: "Method not allowed." }, 405);

  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (contentLength > 30000) return reply(origin, { error: "This letter is too long to submit." }, 413);

  let input: Record<string, unknown>;
  try {
    input = await request.json();
  } catch {
    return reply(origin, { error: "The submission could not be read." }, 400);
  }

  // Quietly accept honeypot submissions without storing them.
  if (text(input.website)) return reply(origin, { ok: true, message: "Thank you. Your letter was received for review." }, 201);

  const letter = text(input.letter);
  if (!letter) return reply(origin, { error: "Please write a letter before submitting." }, 400);
  if (letter.length > 12000) return reply(origin, { error: "Please keep the letter under 12,000 characters." }, 400);

  const suppliedTitle = text(input.title);
  if (suppliedTitle && suppliedTitle.length > 160) return reply(origin, { error: "Please keep the title under 160 characters." }, 400);
  const title = suppliedTitle || makeTitle(letter);
  const rawName = text(input.name);
  if (rawName && rawName.length > 120) return reply(origin, { error: "Please keep the signature under 120 characters." }, 400);
  const name = rawName && rawName.toLowerCase() !== "anonymous" ? rawName : null;
  const email = text(input.email);
  if (email && email.length > 254) return reply(origin, { error: "Please use an email address under 255 characters, or leave it blank." }, 400);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return reply(origin, { error: "Please check the email address, or leave it blank." }, 400);
  }

  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("DATABASE_API_KEY");
  if (!url || !serviceKey) return reply(origin, { error: "The submission service is not configured yet." }, 503);

  const programme = text(input.programme);
  const cohort = text(input.cohort);
  const theme = text(input.theme);
  if (programme && programme.length > 160) return reply(origin, { error: "Please keep the programme field under 160 characters." }, 400);
  if (cohort && cohort.length > 80) return reply(origin, { error: "Please keep the cohort field under 80 characters." }, 400);
  if (theme && theme.length > 100) return reply(origin, { error: "Please keep the theme field under 100 characters." }, 400);

  const database = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { error } = await database.from("letters").insert({
    title,
    letter,
    name,
    email,
    programme,
    cohort,
    theme,
    source: "web",
    status: "pending",
    consent_to_publish: input.consent_to_publish === true,
  });

  if (error) {
    console.error("Could not save letter submission", error.message);
    return reply(origin, { error: "We could not save your letter. Please try again later." }, 500);
  }

  return reply(origin, {
    ok: true,
    status: "pending",
    message: "Thank you. Your letter has been received for review and will not appear in the archive automatically.",
  }, 201);
});
