// Vercel serverless function: context-aware refine.
// Given the FULL profile so far + a target field/category, asks Gemini to
// produce that piece using everything chosen up to now (context compounds).
//
// Body: { profile, target }
//   target "motivation"           -> { "motivation": "..." }
//   target "<suggestion category>"-> { "suggestions": [...], "recommended": [...] }
//
// Key lives only here (GEMINI_API_KEY). Non-200 → client falls back to the mock.

import { geminiJSON } from "../geminiCall";

const RULES = `Rules: describe BEHAVIOR and LIMITS, never task/navigation steps (no "click", "open", "go to", "find X").
Stay consistent with everything already chosen. Keep items short. Output STRICT JSON only.`;

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
      res.status(502).json({ error: "gemini_error", status: r.status });
      return;
    }
    res.status(200).json(r.data);
  } catch (e: any) {
    res.status(500).json({ error: "server_error", message: String(e?.message || e) });
  }
}
