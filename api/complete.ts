// Vercel serverless function: "Complete with AI".
// Takes the user's collected selections and asks Gemini to write the rich
// narrative for the synthetic user profile (decision style, trust pattern, etc.)
// and fill empty fields — WITHOUT inventing task/navigation steps.
//
// Key lives only here (GEMINI_API_KEY). Falls back to non-200 → client keeps
// the deterministic text.

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
  const backoff = (a: number) => sleep(300 * Math.pow(2, a) + Math.floor(Math.random() * 150));
  // Transient statuses worth a retry. A 429 from a monthly spend cap is NOT
  // transient (retrying just burns more quota), so we bail on it explicitly below.
  const RETRYABLE = new Set([429, 500, 502, 503]);
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
        await backoff(a);
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
      // Monthly spend cap / hard quota: retrying or switching model won't help.
      if (res.status === 429 && /spend cap|RESOURCE_EXHAUSTED/i.test(lastDetail)) {
        return { ok: false, status: 429, detail: lastDetail };
      }
      if (RETRYABLE.has(res.status)) {
        await backoff(a);
        continue;
      }
      break;
    }
  }
  return { ok: false, status: lastStatus, detail: lastDetail };
}

const SYSTEM = `You write a REUSABLE SYNTHETIC USER PROFILE — a constrained decision agent, not a persona.
You are given the user's selections. Write rich, coherent, second-or-third-person prose for each field.

Hard rules:
- NEVER include task objectives, navigation, or screen-by-screen steps (no "click", "open", "go to", "find X").
- Describe BEHAVIOR, DECISION-MAKING and LIMITS — not how to use a specific product flow.
- Stay consistent with the provided role, expertise and selected behaviors. Do not contradict them.
- Be specific and grounded in the product domain, but keep the profile task-independent and reusable.
- ALWAYS write every value in English, even if the user's selections or product description are in another language.
- Output STRICT JSON only (no markdown, no prose outside JSON).`;

function buildPrompt(p: any): string {
  const ctx = p.productContext || {};
  const list = (a: any) => (Array.isArray(a) ? a.join("; ") : "");
  return `${SYSTEM}

PRODUCT: ${ctx.clientName || ""} ${ctx.productName || ""} — ${ctx.manualDescription || ctx.aiSummary || "(no description)"}
ROLE(S): ${(p.role?.selected || []).join(", ") || "(none)"} — ${(p.role?.selected || []).map((n: string) => p.role?.descriptions?.[n] || "").join("; ")}
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
    const r = await geminiJSON(buildPrompt(profile), 0.8);
    if (!r.ok) {
      res.status(502).json({ error: "gemini_error", status: r.status, detail: (r as any).detail });
      return;
    }
    res.status(200).json(r.data);
  } catch (e: any) {
    res.status(500).json({ error: "server_error", message: String(e?.message || e) });
  }
}
