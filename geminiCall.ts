// Shared Gemini caller for the serverless functions in /api.
// Resilient: retries on transient 503/429 with backoff, and falls back across
// models (Gemini "high demand" 503s are common on the newest model).
//
// Returns parsed JSON on success, or { ok:false, status } so the route can
// signal the client to use its deterministic fallback.

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export type GeminiResult = { ok: true; data: any } | { ok: false; status: number };

export async function geminiJSON(prompt: string, temperature = 0.7): Promise<GeminiResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return { ok: false, status: 503 };

  const primary = process.env.GEMINI_MODEL || "gemini-2.0-flash";
  const models = Array.from(new Set([primary, "gemini-2.5-flash", "gemini-1.5-flash"]));

  let lastStatus = 503;
  for (const model of models) {
    for (let attempt = 0; attempt < 3; attempt++) {
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
        await sleep(600 * (attempt + 1));
        continue;
      }

      if (res.ok) {
        const data = await res.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
        try {
          return { ok: true, data: JSON.parse(text) };
        } catch {
          lastStatus = 502;
          break; // bad JSON from this model — try the next model
        }
      }

      lastStatus = res.status;
      if (res.status === 503 || res.status === 429) {
        await sleep(800 * (attempt + 1)); // transient — back off and retry
        continue;
      }
      break; // other errors: don't retry this model
    }
    // fall through to the next model on persistent transient failure
  }
  return { ok: false, status: lastStatus };
}
