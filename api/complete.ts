// Vercel serverless function: "Complete with AI".
// Takes the user's collected selections and asks Gemini to write the rich
// narrative for the synthetic user profile (decision style, trust pattern, etc.)
// and fill empty fields — WITHOUT inventing task/navigation steps.
//
// Key lives only here (GEMINI_API_KEY). Falls back to non-200 → client keeps
// the deterministic text.

const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

const SYSTEM = `You write a REUSABLE SYNTHETIC USER PROFILE — a constrained decision agent, not a persona.
You are given the user's selections. Write rich, coherent, second-or-third-person prose for each field.

Hard rules:
- NEVER include task objectives, navigation, or screen-by-screen steps (no "click", "open", "go to", "find X").
- Describe BEHAVIOR, DECISION-MAKING and LIMITS — not how to use a specific product flow.
- Stay consistent with the provided role, expertise and selected behaviors. Do not contradict them.
- Be specific and grounded in the product domain, but keep the profile task-independent and reusable.
- Output STRICT JSON only (no markdown, no prose outside JSON).`;

function buildPrompt(p: any): string {
  const ctx = p.productContext || {};
  const list = (a: any) => (Array.isArray(a) ? a.join("; ") : "");
  return `${SYSTEM}

PRODUCT: ${ctx.clientName || ""} ${ctx.productName || ""} — ${ctx.manualDescription || ctx.aiSummary || "(no description)"}
ROLE: ${p.role?.selectedRole || "(none)"} — ${p.role?.roleDescription || ""}
EXPERTISE: domain=${p.expertise?.domainExpertise}, technical=${p.expertise?.technicalProficiency}, productType=${p.expertise?.productTypeFamiliarity}, thisProduct=${p.expertise?.exactProductFamiliarity}
DECISION BEHAVIORS: ${list(p.decisionBehavior?.selected)}
INFORMATION NEEDS: ${list(p.informationNeeds?.selected)}
CONSTRAINTS: ${list(p.constraints?.selected)}
FORBIDDEN ASSUMPTIONS: ${list(p.forbiddenAssumptions?.selected)}
FRICTION TRIGGERS: ${list(p.frictionTriggers?.selected)}
EMOTIONAL / TRUST: ${list(p.emotionalBehavior?.selected)}
ABANDONMENT / ESCALATION: ${list(p.abandonmentRules?.selected)}
SUITABLE TASKS: ${list(p.taskSuitability?.suitable)}
UNSUITABLE TASKS (may be empty): ${list(p.taskSuitability?.unsuitable)}
CURRENT MOTIVATION (may be empty): ${p.primaryMotivation || ""}

Return JSON with EXACTLY this shape, each value rich and consistent (2-4 sentences for prose fields):
{
  "primaryMotivation": "what this user is ultimately trying to achieve (one or two sentences)",
  "decisionStyle": "...",
  "attentionPattern": "...",
  "trustPattern": "...",
  "behaviorUnderPressure": "...",
  "toleranceForAmbiguity": "...",
  "commonWrongAssumptions": ["domain-specific guesses this user might make when info is missing"],
  "calibrationNotes": "1-2 sentences on what this profile is designed to reveal in a simulation",
  "unsuitableTaskTypes": ["task types this profile should NOT be used for"]
}
Give 3-5 items for the array fields. commonWrongAssumptions must be concrete and domain-relevant
(not just restatements of the forbidden assumptions).`;
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
    const profile = (typeof req.body === "string" ? JSON.parse(req.body) : req.body) || {};
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`;
    const gemini = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: buildPrompt(profile) }] }],
        generationConfig: { responseMimeType: "application/json", temperature: 0.8 },
      }),
    });
    if (!gemini.ok) {
      res.status(502).json({ error: "gemini_error", status: gemini.status });
      return;
    }
    const data = await gemini.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      res.status(502).json({ error: "bad_json", raw: text.slice(0, 500) });
      return;
    }
    res.status(200).json(parsed);
  } catch (e: any) {
    res.status(500).json({ error: "server_error", message: String(e?.message || e) });
  }
}
