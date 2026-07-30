/*
 * Receives a quiz submission, scores Section 2 server-side (the answer key
 * lives here and is never sent to the browser), stores the record in Netlify
 * Blobs keyed by the participant's matching code, and — only for the
 * post-course submission — returns the paired before/after result.
 *
 * A pre-course submission NEVER returns a score, so results stay locked
 * until the post-course quiz is completed under the same matching code.
 */

import { getStore } from "@netlify/blobs";

// Section 2 answer key — server-side only.
const ANSWER_KEY = {
  Q1: "b", Q2: "c", Q3: "d", Q4: "c", Q5: "d",
  Q6: "a", Q7: "b", Q8: "c", Q9: "b", Q10: "c",
};

const CONFIDENCE_IDS = ["C1", "C2", "C3", "C4"];

const json = (statusCode, body) =>
  new Response(JSON.stringify(body), {
    status: statusCode,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });

function score(answers) {
  let s = 0;
  for (const [id, correct] of Object.entries(ANSWER_KEY)) {
    if (answers?.[id] === correct) s += 1;
  }
  return s;
}

// Codes are issued by the facilitator (see codes.mjs) and stored without the
// hyphen, so VL-7XK4, vl 7xk4, and VL7XK4 all normalize to the same key.
function normalizeCode(v) {
  return String(v || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function cleanConfidence(obj) {
  const out = {};
  for (const id of CONFIDENCE_IDS) {
    const n = Number(obj?.[id]);
    out[id] = Number.isFinite(n) && n >= 1 && n <= 5 ? n : null;
  }
  return out;
}

export default async (req) => {
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  let payload;
  try {
    payload = await req.json();
  } catch {
    return json(400, { error: "Invalid request body." });
  }

  const mode = payload.mode === "post" ? "post" : payload.mode === "pre" ? "pre" : null;
  const code = normalizeCode(payload.code);
  if (!mode) return json(400, { error: "Missing quiz mode." });
  if (code.length < 4) return json(400, { error: "Please enter your quiz code." });

  // Unanswered questions are allowed (the client warns before submitting);
  // answered ones must be known option letters. Missing answers score 0 and
  // skipped confidence items are stored as null.
  const answers = {};
  for (const id of Object.keys(ANSWER_KEY)) {
    const raw = payload.answers?.[id];
    if (raw == null || raw === "") continue;
    const v = String(raw).toLowerCase();
    if (!["a", "b", "c", "d"].includes(v)) {
      return json(400, { error: "Invalid answer value." });
    }
    answers[id] = v;
  }
  const confidence = cleanConfidence(payload.confidence);

  const store = getStore("quiz-responses");
  const now = new Date().toISOString();
  const s = score(answers);

  const record = { code, mode, score: s, answers, confidence, submittedAt: now };

  if (mode === "pre") {
    // Store (do not overwrite an existing pre unless resubmitting the same day).
    await store.setJSON(`pre:${code}`, record);
    // Pre-course response is intentionally opaque — no score returned.
    return json(200, { ok: true, mode: "pre", code });
  }

  // POST: store feedback too, then reveal the paired result.
  record.feedback = sanitizeFeedback(payload.feedback);
  await store.setJSON(`post:${code}`, record);

  const preRaw = await store.get(`pre:${code}`, { type: "json" });
  if (preRaw) {
    return json(200, {
      ok: true,
      mode: "post",
      paired: true,
      pre: { score: preRaw.score, confidence: preRaw.confidence },
      post: { score: s, confidence },
    });
  }
  // No matching pre-course record found.
  return json(200, { ok: true, mode: "post", paired: false, post: { score: s, confidence } });
};

function sanitizeFeedback(fb) {
  if (!fb || typeof fb !== "object") return null;
  const scaleOrNull = (v) => {
    const n = Number(v);
    return Number.isFinite(n) && n >= 1 && n <= 5 ? n : null;
  };
  return {
    F1: scaleOrNull(fb.F1),
    F2: scaleOrNull(fb.F2),
    F3: String(fb.F3 || "").slice(0, 1000),
    F4: ["Yes", "Maybe", "No"].includes(fb.F4) ? fb.F4 : "",
  };
}
