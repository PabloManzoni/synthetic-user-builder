// Honest AI labels. The /api serverless functions (Gemini) only exist on the
// hosted deployment — a local run (`npm run dev` / `npm run preview`) has no AI
// backend, and every "AI" action silently falls back to the deterministic rule
// engine. A button that says "AI" while running rules would be lying, so:
// offline runs relabel the buttons to say what they really do and point to the
// hosted builder for real AI suggestions.
export const AI_ONLINE =
  typeof window !== "undefined" &&
  !["localhost", "127.0.0.1", "[::1]"].includes(window.location.hostname);

export const HOSTED_BUILDER_URL = "https://synthetic.tuggsy.com/";

/** Picks the honest label for the current mode. */
export const aiLabel = (online: string, offline: string) => (AI_ONLINE ? online : offline);
