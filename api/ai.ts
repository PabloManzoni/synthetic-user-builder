// Vercel serverless function: proxies a request to Google Gemini and returns
// structured, context-aware suggestions for the Synthetic User Builder.
//
// The Gemini API key lives ONLY here (server-side), never in the browser.
// Set it in Vercel → Project → Settings → Environment Variables as GEMINI_API_KEY.
// Optional: GEMINI_MODEL (defaults to a fast, cheap model).
//
// If the key is missing or Gemini errors, this returns a non-200 so the client
// falls back to the deterministic mock — the app keeps working either way.

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

const SYSTEM = `You help UX teams define REUSABLE SYNTHETIC USER PROFILES for a SPECIFIC product.
A synthetic user defines HOW someone thinks, decides, hesitates, trusts, doubts, assumes and gives up.

ROLES — most important: name the REAL kinds of people who actually use THIS product, in the product's
own vocabulary. For a CrossFit gym app that's e.g. "Professional athlete", "Amateur member", "Coach",
"Gym owner", "Front-desk staff". For a bank app: "Everyday account holder", "Small-business owner",
"Fraud-wary saver". NEVER use abstract archetypes like "Status Monitor", "Action Taker" or "Data Reviewer".
Each role = a real audience segment, with a 'description' of how that person behaves and decides.

Tailor EVERYTHING (behaviors, information needs, friction, etc.) to this exact product and its real users
and domain — be concrete and specific to the vertical, not generic.

Hard rules:
- NEVER include task objectives, navigation, or screen-by-screen steps (no "click", "open", "go to", "find X").
- Describe BEHAVIOR and CONSTRAINTS, not how to use a specific product flow.
- Keep each item short (a few words to one sentence). No numbering.
- Forbidden assumptions must start with "Cannot ...".
- ALWAYS write every value in English, even if the product description or any input is in another language.
- Output STRICT JSON only, matching the requested shape. No prose, no markdown.`;

function buildPrompt(ctx: any, pageContent: string): string {
  const common = ctx.commonPools || {};
  const commonText = Object.keys(common).length
    ? "\nCOMMON OPTIONS you may ALSO draw from for 'recommended' if they fit this role:\n" +
      Object.entries(common)
        .map(([k, v]) => `- ${k}: ${(v as string[]).join(" | ")}`)
        .join("\n")
    : "";
  const pageBlock = pageContent
    ? `\nFETCHED PAGE CONTENT (REAL text scraped from the URL(s) the user pasted — base your understanding on THIS, not on guesses):\n"""\n${pageContent}\n"""\n`
    : ctx.manualDescription && /https?:\/\//.test(ctx.manualDescription)
      ? "\nNOTE: The user pasted a URL but its content could NOT be fetched. Do NOT invent specifics — set confidence to 'low' and say the page couldn't be read.\n"
      : "";
  return `${SYSTEM}

PRODUCT CONTEXT (from the user; may be partial):
- Client: ${ctx.clientName || "(unknown)"}
- Product: ${ctx.productName || "(unknown)"}
- Description: ${ctx.manualDescription || "(none)"}
- Primary users: ${ctx.knownPrimaryUsers || "(unknown)"}
- Known risk areas: ${ctx.knownRiskAreas || "(unknown)"}
${pageBlock}${commonText}

Return JSON with EXACTLY this shape:
{
  "summary": "2-3 sentence neutral product understanding",
  "confidence": "low" | "medium" | "high",
  "description": "one concise sentence describing what the product does",
  "primaryUsers": "short comma-separated list of likely user families",
  "riskAreas": "short comma-separated list of what goes wrong if the UI is misread",
  "roles": [
    { "name": "a real user type of THIS product, in its own words (e.g. 'Amateur member', 'Coach')", "description": "who they are + how they decide/behave", "goodFor": "...", "notFor": "...", "confidence": "low|medium|high" }
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

// Give the function room to fetch the page(s) + call Gemini.
export const config = { maxDuration: 30 };

// Fetch a URL and return readable text (title + meta description + stripped body).
async function fetchPageText(url: string): Promise<string> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 7000);
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; SyntheticUserBuilder/1.0)" },
    });
    clearTimeout(timer);
    const ct = res.headers.get("content-type") || "";
    if (!res.ok || !/text\/html|text\/plain/i.test(ct)) return "";
    let html = (await res.text()).slice(0, 200000);
    html = html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ");
    const title = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || "";
    const meta = (html.match(/<meta[^>]+name=["']description["'][^>]*content=["']([^"']+)["']/i) || [])[1] || "";
    const og = (html.match(/<meta[^>]+property=["']og:description["'][^>]*content=["']([^"']+)["']/i) || [])[1] || "";
    const body = html.replace(/<[^>]+>/g, " ").replace(/&[a-z#0-9]+;/gi, " ").replace(/\s+/g, " ").trim();
    return `URL: ${url}\nTITLE: ${title}\nDESCRIPTION: ${meta} ${og}\nBODY: ${body}`.slice(0, 4000);
  } catch {
    return "";
  }
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
    const urls: string[] = ((ctx.manualDescription || "").match(/https?:\/\/[^\s)]+/g) || []).slice(0, 2);
    const pages = urls.length ? (await Promise.all(urls.map(fetchPageText))).filter(Boolean) : [];
    const pageContent = pages.join("\n\n---\n\n");
    const r = await geminiJSON(buildPrompt(ctx, pageContent), 0.7);
    if (!r.ok) {
      res.status(502).json({ error: "gemini_error", status: r.status, detail: (r as any).detail });
      return;
    }
    res.status(200).json(r.data);
  } catch (e: any) {
    res.status(500).json({ error: "server_error", message: String(e?.message || e) });
  }
}
