/*
 * Renders the quiz for a given mode ("pre" or "post"), collects answers,
 * submits them to the serverless function, and shows the appropriate result.
 *
 * Pre-course: on success the participant sees ONLY a confirmation that their
 * results are locked until the post-course quiz is completed — no score.
 * Post-course: the function returns the paired before/after result, which we
 * render as the reveal.
 */

(function () {
  const root = document.getElementById("quiz-root");
  if (!root) return;
  const MODE = root.dataset.mode; // "pre" or "post"

  const el = (tag, attrs = {}, children = []) => {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === "class") node.className = v;
      else if (k === "html") node.innerHTML = v;
      else node.setAttribute(k, v);
    }
    for (const c of [].concat(children)) {
      node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    }
    return node;
  };

  // ---- Build the form ---------------------------------------------------
  const form = el("form", { class: "quiz-form", novalidate: "novalidate" });

  // Workshop code — issued by the facilitator and emailed to each participant.
  // Links can carry it as ?code=VL-7XK4, in which case we pre-fill the field.
  const linkedCode = new URLSearchParams(location.search).get("code") || "";
  const codeSection = el("section", { class: "card" }, [
    el("h2", {}, "Your workshop code"),
    el("p", { class: "muted" }, [
      "Your code was emailed to you before the workshop — if you opened this page from that email, it's already filled in below. Use the ",
      el("strong", {}, "same code"),
      " on both the pre- and post-course quiz. It lets us pair your two quizzes without collecting your name.",
    ]),
    el("label", { class: "code-label", for: "matching-code" }, "My code"),
    el("input", {
      id: "matching-code",
      name: "matchingCode",
      type: "text",
      class: "code-input",
      autocomplete: "off",
      autocapitalize: "characters",
      spellcheck: "false",
      placeholder: "e.g. VL-7XK4",
      required: "required",
      value: linkedCode,
    }),
    el("p", { class: "field-error", id: "code-error", "aria-live": "polite" }, ""),
  ]);
  form.appendChild(codeSection);

  // Section 1 — Confidence
  const confSection = el("section", { class: "card" }, [
    el("h2", {}, "Section 1 — Confidence check"),
    el("p", { class: "muted" }, "Choose the number that best fits, where 1 = not at all confident and 5 = very confident."),
  ]);
  CONFIDENCE.forEach((item) => {
    confSection.appendChild(buildScale(item.id, item.text, "confidence"));
  });
  form.appendChild(confSection);

  // Section 2 — Knowledge
  const knowSection = el("section", { class: "card" }, [
    el("h2", {}, "Section 2 — Knowledge & judgment"),
    el("p", { class: "muted" }, "Choose the one best answer for each. There's no penalty for a wrong answer."),
  ]);
  KNOWLEDGE.forEach((q, i) => {
    knowSection.appendChild(buildChoice(q, i + 1));
  });
  form.appendChild(knowSection);

  // Section 3 — Feedback (post only)
  if (MODE === "post") {
    const fbSection = el("section", { class: "card" }, [
      el("h2", {}, "Section 3 — Feedback"),
      el("p", { class: "muted" }, "Post-course only, and not scored — it helps us refine the next workshop."),
    ]);
    FEEDBACK_SCALE.forEach((item) => {
      fbSection.appendChild(buildScale(item.id, item.text, "feedback", ["Strongly disagree", "Strongly agree"]));
    });
    // F3 — free text
    fbSection.appendChild(el("div", { class: "question" }, [
      el("label", { class: "q-text", for: "F3" }, "One thing you'll use or do differently after today:"),
      el("textarea", { id: "F3", name: "F3", class: "text-input", rows: "3", placeholder: "Optional" }),
    ]));
    // F4 — recommend
    const f4 = el("fieldset", { class: "question", "data-qid": "F4" }, [el("legend", { class: "q-text" }, "Would you recommend this workshop to a colleague?")]);
    ["Yes", "Maybe", "No"].forEach((opt) => {
      const id = `F4-${opt}`;
      f4.appendChild(el("label", { class: "option pill", for: id }, [
        el("input", { type: "radio", id, name: "F4", value: opt }),
        el("span", {}, opt),
      ]));
    });
    fbSection.appendChild(f4);
    form.appendChild(fbSection);
  }

  // Submit
  const submitRow = el("div", { class: "submit-row" }, [
    el("button", { type: "submit", class: "btn btn-primary" }, MODE === "pre" ? "Submit pre-course quiz" : "Submit post-course quiz"),
    el("p", { class: "field-error", id: "form-error", "aria-live": "polite" }, ""),
  ]);
  form.appendChild(submitRow);

  root.appendChild(form);

  // ---- Builders ---------------------------------------------------------
  function buildScale(id, text, group, labels = ["Not confident", "Very confident"]) {
    const fs = el("fieldset", { class: "question scale-q", "data-qid": id }, [
      el("legend", { class: "q-text" }, `${text}`),
    ]);
    const scale = el("div", { class: "scale" });
    for (let n = 1; n <= 5; n++) {
      const optId = `${id}-${n}`;
      scale.appendChild(el("label", { class: "scale-option", for: optId }, [
        el("input", { type: "radio", id: optId, name: id, value: String(n), "data-group": group }),
        el("span", { class: "scale-num" }, String(n)),
      ]));
    }
    fs.appendChild(scale);
    fs.appendChild(el("div", { class: "scale-legend" }, [
      el("span", {}, labels[0]),
      el("span", {}, labels[1]),
    ]));
    return fs;
  }

  function buildChoice(q, num) {
    const fs = el("fieldset", { class: "question choice-q", "data-qid": q.id }, [
      el("legend", { class: "q-text" }, [el("span", { class: "q-num" }, `${num}.`), " ", q.text]),
    ]);
    for (const [letter, label] of Object.entries(q.options)) {
      const optId = `${q.id}-${letter}`;
      fs.appendChild(el("label", { class: "option", for: optId }, [
        el("input", { type: "radio", id: optId, name: q.id, value: letter }),
        el("span", { class: "option-marker" }, letter),
        el("span", { class: "option-text" }, label),
      ]));
    }
    return fs;
  }

  // ---- Submit handling --------------------------------------------------
  let warnedAboutMissing = false;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearErrors();

    const code = normalizeCode(form.matchingCode.value);
    if (!code || code.length < 4) {
      showError("code-error", "Please enter the workshop code from your email (e.g. VL-7XK4).");
      form.matchingCode.focus();
      return;
    }

    // Collect answers; unanswered questions are allowed, but only after an
    // explicit warning that names each one.
    const confidence = {};
    const missing = [];
    for (const item of CONFIDENCE) {
      const v = form.elements[item.id]?.value;
      if (v) confidence[item.id] = Number(v);
      else missing.push({ id: item.id, label: `Section 1 — statement ${item.id}`, text: item.text });
    }
    const answers = {};
    KNOWLEDGE.forEach((q, i) => {
      const v = form.elements[q.id]?.value;
      if (v) answers[q.id] = v;
      else missing.push({ id: q.id, label: `Section 2 — question ${i + 1}`, text: q.text });
    });
    if (MODE === "post") {
      FEEDBACK_SCALE.forEach((item) => {
        if (!form.elements[item.id]?.value) {
          missing.push({ id: item.id, label: `Section 3 — statement ${item.id}`, text: item.text });
        }
      });
      if (!form.elements["F4"]?.value) {
        missing.push({ id: "F4", label: "Section 3 — F4", text: "Would you recommend this workshop to a colleague?" });
      }
    }

    // Radio choices can only be added, never cleared, so the missing set only
    // shrinks after a warning — one warning always covers everything unanswered.
    if (missing.length && !warnedAboutMissing) {
      warnedAboutMissing = true;
      showUnansweredWarning(missing);
      return;
    }

    const payload = { mode: MODE, code, confidence, answers };

    if (MODE === "post") {
      payload.feedback = {
        F1: numOrNull(form.elements["F1"]?.value),
        F2: numOrNull(form.elements["F2"]?.value),
        F3: (form.elements["F3"]?.value || "").trim(),
        F4: form.elements["F4"]?.value || "",
      };
    }

    const btn = form.querySelector("button[type=submit]");
    btn.disabled = true;
    btn.textContent = "Submitting…";

    try {
      const res = await fetch("/.netlify/functions/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Something went wrong (${res.status}).`);
      renderResult(data);
    } catch (err) {
      showError("form-error", err.message || "Could not submit. Please check your connection and try again.");
      btn.disabled = false;
      btn.textContent = MODE === "pre" ? "Submit pre-course quiz" : "Submit post-course quiz";
    }
  });

  function showUnansweredWarning(missing) {
    document.getElementById("unanswered-warning")?.remove();

    const items = missing.map((m) => {
      const link = el("a", { href: "#", class: "warn-link" }, m.label);
      link.addEventListener("click", (e) => {
        e.preventDefault();
        const fs = form.querySelector(`fieldset[data-qid="${m.id}"]`);
        fs?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
      return el("li", { "data-missing-id": m.id }, [
        link,
        el("span", { class: "muted" }, ` — ${m.text.length > 70 ? m.text.slice(0, 70) + "…" : m.text}`),
      ]);
    });

    const box = el("div", { class: "warn-box", id: "unanswered-warning", role: "alert" }, [
      el("p", { class: "warn-title" }, [
        el("strong", {}, `Are you sure you want to submit without answering? `),
        `You haven't answered ${missing.length === 1 ? "this question" : `these ${missing.length} questions`}:`,
      ]),
      el("ul", { class: "warn-list" }, items),
      el("p", { class: "muted small", style: "margin:8px 0 0" },
        "Click a question above to jump to it, or press the button again to submit as-is — unanswered questions simply won't count."),
    ]);

    // Highlight the unanswered fieldsets themselves.
    for (const m of missing) {
      form.querySelector(`fieldset[data-qid="${m.id}"]`)?.classList.add("unanswered");
    }

    const submitRowNode = form.querySelector(".submit-row");
    submitRowNode.parentNode.insertBefore(box, submitRowNode);
    form.querySelector("button[type=submit]").textContent = "Submit anyway";
    box.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  // As unanswered questions get answered, clear their highlight and warning
  // entry; if everything is answered, restore the normal submit button.
  form.addEventListener("change", (e) => {
    const fs = e.target.closest?.("fieldset.question.unanswered");
    if (!fs) return;
    fs.classList.remove("unanswered");
    const box = document.getElementById("unanswered-warning");
    if (!box) return;
    box.querySelector(`li[data-missing-id="${fs.dataset.qid}"]`)?.remove();
    if (!box.querySelector("li")) {
      box.remove();
      form.querySelector("button[type=submit]").textContent =
        MODE === "pre" ? "Submit pre-course quiz" : "Submit post-course quiz";
    }
  });

  // ---- Result rendering -------------------------------------------------
  function renderResult(data) {
    root.innerHTML = "";
    if (MODE === "pre") {
      root.appendChild(el("section", { class: "card result-card" }, [
        el("div", { class: "result-icon locked", "aria-hidden": "true" }, "🔒"),
        el("h2", {}, "Thank you — your pre-course answers are saved."),
        el("p", {}, [
          "Your results are ",
          el("strong", {}, "locked on purpose"),
          ". They'll be revealed at the end of the day, once you complete the post-course quiz using the same code — that's how we show you what changed.",
        ]),
        el("div", { class: "code-echo" }, [el("span", { class: "muted" }, "Your workshop code"), el("strong", {}, data.code || "")]),
        el("p", { class: "muted small" }, "Use the same email link (or code) this afternoon. Enjoy the workshop!"),
      ]));
      return;
    }

    // POST reveal
    const card = el("section", { class: "card result-card" });
    card.appendChild(el("div", { class: "result-icon", "aria-hidden": "true" }, "🎯"));
    card.appendChild(el("h2", {}, "Here's what changed today"));

    if (data.paired && data.pre) {
      const gain = data.post.score - data.pre.score;
      const gainClass = gain > 0 ? "gain-up" : gain < 0 ? "gain-down" : "gain-flat";
      card.appendChild(el("div", { class: "score-grid" }, [
        scoreTile("Pre-course", data.pre.score, 10),
        scoreTile("Post-course", data.post.score, 10),
        el("div", { class: `score-tile ${gainClass}` }, [
          el("span", { class: "score-label" }, "Change"),
          el("span", { class: "score-value" }, `${gain > 0 ? "+" : ""}${gain}`),
          el("span", { class: "score-max" }, "marks"),
        ]),
      ]));

      // Confidence shift
      const rows = CONFIDENCE.map((item) => {
        const before = data.pre.confidence?.[item.id];
        const after = data.post.confidence?.[item.id];
        const diff = before != null && after != null ? after - before : null;
        return el("tr", {}, [
          el("td", {}, item.text),
          el("td", { class: "num" }, String(before ?? "—")),
          el("td", { class: "num" }, String(after ?? "—")),
          el("td", { class: `num ${diff > 0 ? "gain-up" : diff < 0 ? "gain-down" : ""}` },
            diff === null ? "—" : `${diff > 0 ? "+" : ""}${diff}`),
        ]);
      });
      card.appendChild(el("h3", {}, "Your confidence, before and after"));
      card.appendChild(el("div", { class: "table-scroll" }, [
        el("table", { class: "shift-table" }, [
          el("thead", {}, el("tr", {}, [
            el("th", {}, "Statement"), el("th", { class: "num" }, "Before"), el("th", { class: "num" }, "After"), el("th", { class: "num" }, "Δ"),
          ])),
          el("tbody", {}, rows),
        ]),
      ]));
    } else {
      // No matching pre found — show post score only, explain.
      card.appendChild(el("div", { class: "score-grid" }, [scoreTile("Post-course", data.post.score, 10)]));
      card.appendChild(el("p", { class: "muted" }, "We couldn't find a pre-course quiz saved under this code, so we can't show a before/after comparison. That's usually because a different code was used this morning. Your facilitator can help pair them up."));
    }

    card.appendChild(el("p", { class: "muted small" }, "Thank you for completing the workshop and sharing your feedback."));
    root.appendChild(card);
  }

  function scoreTile(label, value, max) {
    return el("div", { class: "score-tile" }, [
      el("span", { class: "score-label" }, label),
      el("span", { class: "score-value" }, String(value)),
      el("span", { class: "score-max" }, `/ ${max}`),
    ]);
  }

  // ---- Helpers ----------------------------------------------------------
  // Must mirror the server: hyphen/spacing-insensitive, uppercase.
  function normalizeCode(v) {
    return (v || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  }
  function numOrNull(v) {
    return v ? Number(v) : null;
  }
  function showError(id, msg) {
    const node = document.getElementById(id);
    if (node) node.textContent = msg;
  }
  function clearErrors() {
    document.querySelectorAll(".field-error").forEach((n) => (n.textContent = ""));
  }
})();
