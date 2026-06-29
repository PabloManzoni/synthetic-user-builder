// Vercel serverless function: "Auto-build the entire profile".
// Given the product context + role(s), asks Gemini to design the WHOLE
// constrained decision agent in ONE coherent pass — expertise, behavior axes,
// and every option category at once, so the pieces never contradict each other.
//
// Body: { profile, commonPools }  (commonPools = the option chips the UI offers)
// Returns one object with every selection (see SHAPE below). Non-200 → client
// falls back to a deterministic local plan.

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

const RULES = `Rules: describe BEHAVIOR and LIMITS, never task/navigation steps (no "click", "open", "go to", "find X").
Every piece MUST be coherent with the role, context and the OTHER pieces — design one consistent person
(e.g. a casual elderly user → low technical proficiency, reads carefully, double-checks, escalates sooner;
a domain professional → high domain expertise, fewer needs, more self-reliant).
ALWAYS write in English, even if the input is in another language. Output STRICT JSON only.`;

function contextOf(p: any): string {
  const ctx = p.productContext || {};
  const roles = (p.role?.selected || []).join(", ");
  const roleDescs = (p.role?.selected || [])
    .map((n: string) => p.role?.descriptions?.[n])
    .filter(Boolean)
    .join("; ");
  return `PRODUCT: ${ctx.clientName || ""} ${ctx.productName || ""} — ${ctx.manualDescription || ctx.aiSummary || ""}
PRIMARY USERS: ${ctx.knownPrimaryUsers || "(unknown)"}
RISK AREAS: ${ctx.knownRiskAreas || "(unknown)"}
ROLE(S): ${roles || "(none)"}${roleDescs ? ` — ${roleDescs}` : ""}`;
}

const pool = (arr: any): string[] => (Array.isArray(arr) ? arr : []);

function buildPrompt(p: any, common: any): string {
  const context = contextOf(p);
  const opt = (key: string) => pool(common?.[key]).map((o) => `- ${o}`).join("\n");
  return `You design a REUSABLE SYNTHETIC USER PROFILE — a constrained decision agent, not a persona. ${RULES}

${context}

Design the COMPLETE profile in one coherent pass. For each option list below, pick the items that best fit
THIS user — choose ONLY from the provided options (return them verbatim). Pick a focused, realistic subset,
not everything. Then set the expertise levels, the behavior axes (0-4 integers), and the primary motivation.

INFORMATION NEEDS — pick 3-6:
${opt("informationNeeds")}

LIMITS (constraints) — pick 2-4:
${opt("constraints")}

FORBIDDEN ASSUMPTIONS — pick 3-6:
${opt("forbiddenAssumptions")}

FRICTION TRIGGERS — pick 3-6:
${opt("frictionTriggers")}

EMOTIONAL / TRUST BEHAVIORS — pick 3-5:
${opt("emotionalBehaviors")}

ABANDONMENT / ESCALATION RULES — pick 2-4:
${opt("abandonmentRules")}

SUITABLE TASK TYPES — pick 3-5:
${opt("suitableTasks")}

UNSUITABLE TASK TYPES — pick 2-4:
${opt("unsuitableTasks")}

EXPERTISE — pick exactly one value per field:
- domainExpertise: Low | Medium | High | Expert
- technicalProficiency: Low | Medium | High | Power user
- productTypeFamiliarity: First time user | Occasional user | Regular user | Daily user | Power user
- exactProductFamiliarity: Unknown | None | Low | Medium | High

BEHAVIOR AXES — for each, an integer 0-4 (0 = far LEFT pole, 2 = balanced, 4 = far RIGHT pole):
- pace: 0 Skims ↔ 4 Reads thoroughly
- priority: 0 Speed ↔ 4 Accuracy
- verification: 0 Rarely checks ↔ 4 Double-checks
- trust: 0 Trusting ↔ 4 Skeptical
- escalation: 0 Self-reliant ↔ 4 Escalates
Use the FULL range and make the five values VARIED — a believable person is a MIX, never all-high
or all-low. Most axes should land on 1, 2 or 3; reserve 0 and 4 for genuinely extreme traits, and do
NOT set every axis to the same number. Emotions don't all point one way: e.g. an anxious novice may read
thoroughly (pace 3) yet rush for speed (priority 1), distrust the screen (trust 4) but rarely double-check
(verification 1), and escalate fast (escalation 4).

Return JSON with EXACTLY this shape:
{
  "expertise": { "domainExpertise": "...", "technicalProficiency": "...", "productTypeFamiliarity": "...", "exactProductFamiliarity": "..." },
  "behaviorAxes": { "pace": 0, "priority": 0, "verification": 0, "trust": 0, "escalation": 0 },
  "informationNeeds": ["..."],
  "constraints": ["..."],
  "forbiddenAssumptions": ["..."],
  "frictionTriggers": ["..."],
  "emotionalBehaviors": ["..."],
  "abandonmentRules": ["..."],
  "suitableTasks": ["..."],
  "unsuitableTasks": ["..."],
  "primaryMotivation": "one or two sentences on what this user is ultimately trying to achieve"
}`;
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
    const { profile, commonPools } = body;
    const r = await geminiJSON(buildPrompt(profile || {}, commonPools || {}), 0.7);
    if (!r.ok) {
      res.status(502).json({ error: "gemini_error", status: r.status, detail: (r as any).detail });
      return;
    }
    res.status(200).json(r.data);
  } catch (e: any) {
    res.status(500).json({ error: "server_error", message: String(e?.message || e) });
  }
}
