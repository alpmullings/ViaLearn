/*
 * Quiz content — shared by the pre- and post-course pages.
 *
 * IMPORTANT: this file contains question text and options ONLY.
 * The answer key lives server-side (netlify/functions/submit.mjs) so that
 * correct answers are never delivered to the browser and the pre-course
 * score cannot be revealed until the post-course quiz is submitted.
 */

// Section 1 — Confidence check (1 = not at all confident, 5 = very confident).
// Administered identically at both sittings.
const CONFIDENCE = [
  { id: "C1", text: "I understand how AI tools like ChatGPT actually work." },
  { id: "C2", text: "I can tell when an AI answer might be wrong, and I know how to check it." },
  { id: "C3", text: "I know what information is and isn't safe to put into an AI tool." },
  { id: "C4", text: "I know when it is and isn't appropriate to use AI for a work task." },
];

// Section 2 — Knowledge & judgment. One best answer each. Scored /10.
// Administered identically at both sittings.
const KNOWLEDGE = [
  {
    id: "Q1",
    text: "Which best describes how a tool like ChatGPT produces its answers?",
    options: {
      a: "It looks up verified facts in an official government database",
      b: "It predicts likely wording based on patterns in the text it was trained on",
      c: "It is always connected to live, correct information",
      d: "It understands and reasons like a human expert",
    },
  },
  {
    id: "Q2",
    text: "An AI tool gives you a confident, detailed answer with specific figures. You should assume:",
    options: {
      a: "If it's confident and detailed, it's reliable",
      b: "It's correct as long as no error message appears",
      c: "It could be wrong or invented, and should be checked against a real source",
      d: "Longer answers are more trustworthy",
    },
  },
  {
    id: "Q3",
    text: "Which of these is safe to type into a free/public AI tool?",
    options: {
      a: "A citizen's name, address, and case details",
      b: "A colleague's performance record",
      c: "An internal document marked not-for-release",
      d: "A general request that uses no real personal or official information",
    },
  },
  {
    id: "Q4",
    text: "Which is an appropriate use of AI for a public officer?",
    options: {
      a: "Deciding whether someone qualifies for assistance",
      b: "Making the final call on an application",
      c: "Drafting a first version of a routine memo that you will then review",
      d: "Determining a disciplinary outcome",
    },
  },
  {
    id: "Q5",
    text: "A report you submitted was drafted with AI help and contains an error. Who is responsible?",
    options: {
      a: "The company that makes the AI tool",
      b: "No one — the AI made the mistake",
      c: "The IT department",
      d: "You, the officer who submitted it",
    },
  },
  {
    id: "Q6",
    text: "Why can AI output be biased?",
    options: {
      a: "It can reflect biases present in the text it was trained on",
      b: "It is programmed to be fair, so it cannot be biased",
      c: "Bias only happens if you ask a biased question",
      d: "The AI holds personal opinions",
    },
  },
  {
    id: "Q7",
    text: "The best way to check an AI's factual claim is to:",
    options: {
      a: "Ask the same AI whether it's sure",
      b: "Check it against a reliable, independent source",
      c: "Ask a second AI and trust whichever sounds better",
      d: "Assume it's right if it gives the same answer twice",
    },
  },
  {
    id: "Q8",
    text: "You get a vague, unhelpful answer. The most effective next step is to:",
    options: {
      a: "Give up — the tool can't do it",
      b: "Repeat exactly the same prompt",
      c: "Ask again with more context, your role, and the format you want",
      d: "Submit the vague answer as-is",
    },
  },
  {
    id: "Q9",
    text: "Which is the most accurate statement about free versus official/approved AI tools?",
    options: {
      a: "They are identical in how they handle your data",
      b: "What you type into a free tool may be used to train the model; approved tools handle data differently",
      c: "Neither ever stores what you type",
      d: "Only official tools can make mistakes",
    },
  },
  {
    id: "Q10",
    text: "The healthiest way to use AI at work is as:",
    options: {
      a: "A final authority whose answers you submit directly",
      b: "A replacement for your professional judgment",
      c: "A starting point that you review, verify, and improve",
      d: "A private tool you never mention, even when it shaped official work",
    },
  },
];

// Section 3 — Feedback (post-course only, not scored).
const FEEDBACK_SCALE = [
  { id: "F1", text: "This workshop improved my confidence using AI responsibly at work." },
  { id: "F2", text: "I will change something about how I use AI because of today." },
];
