/*
 * Facilitator-only code management. Codes are issued here, stored in Netlify
 * Blobs, and submit.mjs refuses any submission whose code wasn't issued.
 *
 * POST { count } — generate that many new codes (1–200 per call).
 * POST { codes } — import a caller-supplied list (codes already prepared or
 *                  emailed out); invalid/duplicate entries are skipped.
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

// 6-char keys render as XX-XXXX (covers generated VL-XXXX and typical
// imported codes); anything else renders as stored.
const display = (code) => (code.length === 6 ? code.slice(0, 2) + "-" + code.slice(2) : code);

export default async (req) => {
  const expected = process.env.FACILITATOR_KEY;
  if (!expected) {
    return json(503, { error: "Not configured. Set FACILITATOR_KEY in the site environment." });
  }
  const url = new URL(req.url);
  const provided = req.headers.get("x-facilitator-key") || url.searchParams.get("key") || "";
  if (provided !== expected) return json(401, { error: "Unauthorized." });

  // Strong consistency: an imported code must be immediately valid for the
  // quiz, not "valid within a minute or so" (the Blobs default is eventual).
  const codes = getStore({ name: "issued-codes", consistency: "strong" });

  if (req.method === "POST") {
    let body;
    try {
      body = await req.json();
    } catch {
      return json(400, { error: "Invalid request body." });
    }

    // Import mode: caller supplies the exact codes to make valid. Stored
    // normalized (uppercase, alphanumeric only) so hyphens/case never matter.
    if (Array.isArray(body.codes)) {
      if (body.codes.length > 500) return json(400, { error: "At most 500 codes per import." });
      const imported = [];
      const skipped = [];
      const seen = new Set();
      for (const raw of body.codes) {
        const key = String(raw || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
        if (key.length < 4 || key.length > 12 || seen.has(key)) {
          skipped.push(String(raw));
          continue;
        }
        seen.add(key);
        await codes.setJSON(key, { issuedAt: new Date().toISOString(), imported: true });
        imported.push(display(key));
      }
      if (!imported.length) return json(400, { error: "No valid codes to import (4–12 letters/digits each)." });
      return json(200, { ok: true, imported, skipped });
    }

    const count = Number(body.count);
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
    // Diagnostic: ?check=SOME-CODE reports whether that exact code is issued,
    // resolving "the quiz says my code isn't recognized" without guesswork.
    const check = url.searchParams.get("check");
    if (check) {
      const key = String(check).toUpperCase().replace(/[^A-Z0-9]/g, "");
      const record = await codes.get(key, { type: "json" });
      const total = (await codes.list()).blobs.length;
      return json(200, {
        input: check,
        normalizedTo: key,
        issued: Boolean(record),
        issuedAt: record?.issuedAt ?? null,
        totalIssued: total,
      });
    }

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
