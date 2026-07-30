/*
 * Facilitator-only aggregate report. Returns mean pre score, mean post score,
 * average gain, mean confidence shift per statement, and the feedback summary —
 * paired by matching code, never by name.
 *
 * Protected by a shared key. Set FACILITATOR_KEY in your Netlify environment
 * variables; callers pass it as ?key=... or an "x-facilitator-key" header.
 * If FACILITATOR_KEY is unset the endpoint refuses to run (fail closed).
 */

import { getStore } from "@netlify/blobs";

const CONFIDENCE_IDS = ["C1", "C2", "C3", "C4"];

const json = (statusCode, body) =>
  new Response(JSON.stringify(body), {
    status: statusCode,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });

const mean = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null);
const round = (n) => (n === null ? null : Math.round(n * 100) / 100);

export default async (req) => {
  const expected = process.env.FACILITATOR_KEY;
  if (!expected) {
    return json(503, { error: "Reporting is not configured. Set FACILITATOR_KEY in the site environment." });
  }
  const url = new URL(req.url);
  const provided = req.headers.get("x-facilitator-key") || url.searchParams.get("key") || "";
  if (provided !== expected) return json(401, { error: "Unauthorized." });

  const store = getStore("quiz-responses");
  const { blobs } = await store.list();

  const pre = new Map();
  const post = new Map();
  for (const b of blobs) {
    const [kind, ...rest] = b.key.split(":");
    const code = rest.join(":");
    const rec = await store.get(b.key, { type: "json" });
    if (!rec) continue;
    if (kind === "pre") pre.set(code, rec);
    else if (kind === "post") post.set(code, rec);
  }

  const preScores = [...pre.values()].map((r) => r.score);
  const postScores = [...post.values()].map((r) => r.score);

  // Paired analysis (only codes present in both).
  const gains = [];
  const confShift = Object.fromEntries(CONFIDENCE_IDS.map((id) => [id, []]));
  for (const [code, p] of pre) {
    const q = post.get(code);
    if (!q) continue;
    gains.push(q.score - p.score);
    for (const id of CONFIDENCE_IDS) {
      if (p.confidence?.[id] != null && q.confidence?.[id] != null) {
        confShift[id].push(q.confidence[id] - p.confidence[id]);
      }
    }
  }

  // Feedback summary (post only).
  const fb = { F1: [], F2: [], F4: { Yes: 0, Maybe: 0, No: 0 }, F3: [] };
  for (const r of post.values()) {
    if (!r.feedback) continue;
    if (r.feedback.F1 != null) fb.F1.push(r.feedback.F1);
    if (r.feedback.F2 != null) fb.F2.push(r.feedback.F2);
    if (r.feedback.F4 && fb.F4[r.feedback.F4] !== undefined) fb.F4[r.feedback.F4] += 1;
    if (r.feedback.F3) fb.F3.push(r.feedback.F3);
  }

  return json(200, {
    counts: { pre: pre.size, post: post.size, paired: gains.length },
    knowledge: {
      meanPre: round(mean(preScores)),
      meanPost: round(mean(postScores)),
      meanGainPaired: round(mean(gains)),
      outOf: 10,
    },
    confidenceShift: Object.fromEntries(
      CONFIDENCE_IDS.map((id) => [id, round(mean(confShift[id]))])
    ),
    feedback: {
      meanF1: round(mean(fb.F1)),
      meanF2: round(mean(fb.F2)),
      recommend: fb.F4,
      comments: fb.F3,
    },
  });
};
