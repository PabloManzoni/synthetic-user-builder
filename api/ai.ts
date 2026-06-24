// Vercel serverless function: proxies a request to Google Gemini and returns
// structured, context-aware suggestions for the Synthetic User Builder.
//
// The Gemini API key lives ONLY here (server-side), never in the browser.
// Set it in Vercel → Project → Settings → Environment Variables as GEMINI_API_KEY.
// Optional: GEMINI_MODEL (defaults to a fast, cheap model).
//
// If the key is missing or Gemini errors, this returns a non-200 so the client
// falls back to the deterministic mock — the app keeps working either way.

import { geminiJSON } from "../geminiCall";

const SYSTEM = `You help UX teams define REUSABLE SYNTHETIC USER PROFILES — constrained decision agents, not personas.
A synthetic user defines HOW someone thinks, decides, hesitates, trusts, doubts, assumes and gives up.

Hard rules for everything you produce:
- NEVER include task objectives, navigation, or screen-by-screen steps (no "click", "open", "go to", "find X").
- Describe BEHAVIOR and CONSTRAINTS, not how to use a specific product flow.
- Keep each item short (a few words to one sentence). No numbering.
- Forbidden assumptions must start with "Cannot ...".
- Output STRICT JSON only, matching the requested shape. No prose, no markdown.`;

function buildPrompt(ctx: any): string {
  const common = ctx.commonPools || {};
  const commonText = Object.keys(common).length
    ? "\nCOMMON OPTIONS you may ALSO draw from for 'recommended' if they fit this role:\n" +
      Object.entries(common)
        .map(([k, v]) => `- ${k}: ${(v as string[]).join(" | ")}`)
        .join("\n")
    : "";
  return `${SYSTEM}

PRODUCT CONTEXT (from the user; may be partial):
- Client: ${ctx.clientName || "(unknown)"}
- Product: ${ctx.productName || "(unknown)"}
- Description: ${ctx.manualDescription || "(none)"}
- Primary users: ${ctx.knownPrimaryUsers || "(unknown)"}
- Known risk areas: ${ctx.knownRiskAreas || "(unknown)"}
${commonText}

Return JSON with EXACTLY this shape:
{
  "summary": "2-3 sentence neutral product understanding",
  "confidence": "low" | "medium" | "high",
  "description": "one concise sentence describing what the product does",
  "primaryUsers": "short comma-separated list of likely user families",
  "riskAreas": "short comma-separated list of what goes wrong if the UI is misread",
  "roles": [
    { "name": "...", "description": "...", "goodFor": "...", "notFor": "...", "confidence": "low|medium|high" }
  ],
  "suggestions": {
    "decisionBehaviors": ["..."],
    "informationNeeds": ["..."],
    "forbiddenAssumptions": ["Cannot ..."],
    "frictionTriggers": ["..."],
    "emotionalBehaviors": ["..."],
    "abandonmentRules": ["..."],
    "suitableTasks": ["..."]
  },
  "recommended": {
    "decisionBehaviors": ["subset of the above"],
    "informationNeeds": ["subset"],
    "forbiddenAssumptions": ["subset"],
    "frictionTriggers": ["subset"],
    "emotionalBehaviors": ["subset"],
    "abandonmentRules": ["subset"],
    "suitableTasks": ["subset"]
  }
}
Provide 3-6 items per suggestion list and 3-5 roles. "recommended" is your CURATED PICK per category —
choose the 2-4 items that together make a STRONG but NOT over-guided profile for this role. Each
recommended item must appear verbatim EITHER in the matching suggestions list OR in the COMMON OPTIONS
above — pick whatever genuinely fits, AI-suggested or common, not just the first ones. If context is
weak, lower the confidence and keep items generic but still behavioral.`;
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  if (!process.env.GEMINI_API_KEY) {
    res.status(503).json({ error: "no_api_key" });
    return;
  }

  try {
    const ctx = (typeof req.body === "string" ? JSON.parse(req.body) : req.body) || {};
    const r = await geminiJSON(buildPrompt(ctx), 0.7);
    if (!r.ok) {
      res.status(502).json({ error: "gemini_error", status: r.status });
      return;
    }
    res.status(200).json(r.data);
  } catch (e: any) {
    res.status(500).json({ error: "server_error", message: String(e?.message || e) });
  }
}
