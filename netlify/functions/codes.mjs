/*
 * Facilitator-only code management. Codes are issued here, stored in Netlify
 * Blobs, and submit.mjs refuses any submission whose code wasn't issued.
 *
 * POST { count } — generate that many new codes (1–200 per call).
 * GET          — list all issued codes with pre/post completion status.
 *
 * Both require FACILITATOR_KEY (x-facilitator-key header or ?key=).
 */

import { getStore } from "@netlify/blobs";

// No 0/O/1/I/L — codes must survive being read aloud or retyped from email.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

const json = (statusCode, body) =>
  new Response(JSON.stringify(body), {
    status: statusCode,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });

// Stored/compared without the hyphen; displayed as VL-XXXX.
function generateCode() {
  let suffix = "";
  for (let i = 0; i < 4; i++) {
    suffix += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return "VL" + suffix;
}

const display = (code) => code.replace(/^VL/, "VL-");

export default async (req) => {
  const expected = process.env.FACILITATOR_KEY;
  if (!expected) {
    return json(503, { error: "Not configured. Set FACILITATOR_KEY in the site environment." });
  }
  const url = new URL(req.url);
  const provided = req.headers.get("x-facilitator-key") || url.searchParams.get("key") || "";
  if (provided !== expected) return json(401, { error: "Unauthorized." });

  const codes = getStore("issued-codes");

  if (req.method === "POST") {
    let count = 0;
    try {
      count = Number((await req.json()).count);
    } catch {
      return json(400, { error: "Invalid request body." });
    }
    if (!Number.isInteger(count) || count < 1 || count > 200) {
      return json(400, { error: "Count must be between 1 and 200." });
    }

    const existing = new Set((await codes.list()).blobs.map((b) => b.key));
    const created = [];
    while (created.length < count) {
      const code = generateCode();
      if (existing.has(code)) continue; // collision — roll again
      existing.add(code);
      await codes.setJSON(code, { issuedAt: new Date().toISOString() });
      created.push(display(code));
    }
    return json(200, { ok: true, created });
  }

  if (req.method === "GET") {
    const responses = getStore("quiz-responses");
    const responseKeys = new Set((await responses.list()).blobs.map((b) => b.key));
    const list = (await codes.list()).blobs
      .map((b) => ({
        code: display(b.key),
        pre: responseKeys.has(`pre:${b.key}`),
        post: responseKeys.has(`post:${b.key}`),
      }))
      .sort((a, b) => a.code.localeCompare(b.code));
    return json(200, { codes: list });
  }

  return json(405, { error: "Method not allowed" });
};
