// Vercel serverless function: context-aware refine.
// Given the FULL profile so far + a target field/category, asks Gemini to
// produce that piece using everything chosen up to now (context compounds).
//
// Body: { profile, target }
//   target "motivation"           -> { "motivation": "..." }
//   target "<suggestion category>"-> { "suggestions": [...], "recommended": [...] }
//
// Key lives only here (GEMINI_API_KEY). Non-200 → client falls back to the mock.

// Resilient Gemini call: retries transient 503/429 and falls back across models.
async function geminiJSON(
  prompt: string,
  temperature = 0.7
): Promise<{ ok: true; data: any } | { ok: false; status: number; detail?: string }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return { ok: false, status: 503 };
  const primary = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const models = Array.from(new Set([primary, "gemini-2.0-flash"]));
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
  let lastStatus = 503;
  let lastDetail = "";
  for (const model of models) {
    for (let a = 0; a < 2; a++) {
      let res: Response;
      try {
        res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { responseMimeType: "application/json", temperature },
            }),
          }
        );
      } catch {
        lastStatus = 599;
        await sleep(400);
        continue;
      }
      if (res.ok) {
        const data = await res.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
        try {
          return { ok: true, data: JSON.parse(text) };
        } catch {
          lastStatus = 502;
          break;
        }
      }
      lastStatus = res.status;
      try { lastDetail = (await res.text()).slice(0, 600); } catch {}
      if (res.status === 503) {
        await sleep(500 * (a + 1));
        continue;
      }
      break;
    }
  }
  return { ok: false, status: lastStatus, detail: lastDetail };
}

const RULES = `Rules: describe BEHAVIOR and LIMITS, never task/navigation steps (no "click", "open", "go to", "find X").
Stay consistent with everything already chosen. Keep items short. ALWAYS write in English, even if the input is in another language. Output STRICT JSON only.`;

function contextOf(p: any): string {
  const ctx = p.productContext || {};
  const L = (a: any) => (Array.isArray(a) ? a.join("; ") : "");
  const roles = (p.role?.selected || []).join(", ");
  return `PRODUCT: ${ctx.clientName || ""} ${ctx.productName || ""} — ${ctx.manualDescription || ctx.aiSummary || ""}
ROLE(S): ${roles || "(none)"}
EXPERTISE: domain=${p.expertise?.domainExpertise}, technical=${p.expertise?.technicalProficiency}, productType=${p.expertise?.productTypeFamiliarity}, thisProduct=${p.expertise?.exactProductFamiliarity}
DECISION BEHAVIORS: ${L(p.decisionBehavior?.selected)}
INFORMATION NEEDS: ${L(p.informationNeeds?.selected)}
CONSTRAINTS: ${L(p.constraints?.selected)}
FORBIDDEN ASSUMPTIONS: ${L(p.forbiddenAssumptions?.selected)}
FRICTION TRIGGERS: ${L(p.frictionTriggers?.selected)}
EMOTIONAL / TRUST: ${L(p.emotionalBehavior?.selected)}
ABANDONMENT / ESCALATION: ${L(p.abandonmentRules?.selected)}
SUITABLE TASKS: ${L(p.taskSuitability?.suitable)}`;
}

const CATEGORY_LABEL: Record<string, string> = {
  decisionBehaviors: "decision behaviors (how this user decides under normal and pressured conditions)",
  informationNeeds: "categories of information this user needs to decide (not task-specific)",
  forbiddenAssumptions: 'forbidden assumptions (each MUST start with "Cannot ...")',
  frictionTriggers: "things that create hesitation, confusion, distrust or fatigue",
  emotionalBehaviors: "how the user's emotional state and trust evolve through friction",
  abandonmentRules: "when the user stops, escalates, asks for help, or finishes with low confidence",
  suitableTasks: "task TYPES this profile is suitable for (not specific tasks)",
  unsuitableTasks: "task TYPES this profile is NOT suitable for (not specific tasks)",
};

function buildPrompt(p: any, target: string): string {
  const context = contextOf(p);
  if (target === "motivation") {
    return `You define a reusable synthetic user (a constrained decision agent). ${RULES}

${context}

Write the user's PRIMARY MOTIVATION — what they are ultimately trying to achieve — in one or two
sentences, consistent with the role(s) and selections above.
Return JSON: { "motivation": "..." }`;
  }
  if (target === "expertise") {
    return `You define a reusable synthetic user (a constrained decision agent). ${RULES}

${context}

Choose the expertise levels that best fit THIS user and product. Pick exactly one value per field from the allowed options:
- domainExpertise: Low | Medium | High | Expert
- technicalProficiency: Low | Medium | High | Power user
- productTypeFamiliarity: First time user | Occasional user | Regular user | Daily user | Power user
- exactProductFamiliarity: Unknown | None | Low | Medium | High
Be coherent with the role(s): e.g. a casual elderly user → low technical proficiency; a domain professional → high domain expertise; someone new to this exact product → None/Low.
Return JSON: { "expertise": { "domainExpertise": "...", "technicalProficiency": "...", "productTypeFamiliarity": "...", "exactProductFamiliarity": "..." } }`;
  }
  if (target === "behaviorAxes") {
    return `You define a reusable synthetic user (a constrained decision agent). ${RULES}

${context}

Choose where this user sits on each behavior axis, as an integer 0-4 (0 = the LEFT pole, 4 = the RIGHT pole, 2 = balanced). Be coherent with the role and expertise above (e.g. a low-tech casual user reads carefully, double-checks, and escalates sooner):
- pace: 0 Skims ↔ 4 Reads thoroughly
- priority: 0 Speed ↔ 4 Accuracy
- verification: 0 Rarely checks ↔ 4 Double-checks
- trust: 0 Trusting ↔ 4 Skeptical
- escalation: 0 Self-reliant ↔ 4 Escalates
Return JSON: { "behaviorAxes": { "pace": 0, "priority": 0, "verification": 0, "trust": 0, "escalation": 0 } }`;
  }
  const label = CATEGORY_LABEL[target] || target;
  return `You define a reusable synthetic user (a constrained decision agent). ${RULES}

${context}

Suggest ${label}, tailored to EVERYTHING chosen above (the more context, the more specific).
Return JSON: { "suggestions": ["..."], "recommended": ["subset of suggestions"] }
Give 5-7 suggestions and a curated "recommended" subset of 2-4 that best fit this specific profile.`;
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(503).json({ error: "no_api_key" });
    return;
  }
  try {
    const body = (typeof req.body === "string" ? JSON.parse(req.body) : req.body) || {};
    const { profile, target } = body;
    if (!target) {
      res.status(400).json({ error: "missing_target" });
      return;
    }
    const r = await geminiJSON(buildPrompt(profile || {}, target), 0.7);
    if (!r.ok) {
      res.status(502).json({ error: "gemini_error", status: r.status, detail: (r as any).detail });
      return;
    }
    res.status(200).json(r.data);
  } catch (e: any) {
    res.status(500).json({ error: "server_error", message: String(e?.message || e) });
  }
}
