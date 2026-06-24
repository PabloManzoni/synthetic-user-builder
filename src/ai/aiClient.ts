// Client-side caller for the /api/ai serverless function (Gemini).
// Returns null on any failure so callers can fall back to the deterministic mock.

import type { ProductContext, AiSuggestions, SyntheticProfile, GeneratedProfile } from "../state/types";

export interface AiResearchResponse {
  summary: string;
  confidence: "low" | "medium" | "high";
  description: string;
  primaryUsers: string;
  riskAreas: string;
  roles: AiSuggestions["roles"];
  suggestions: Omit<AiSuggestions, "roles" | "recommended">;
  recommended?: AiSuggestions["recommended"];
}

export async function callAi(ctx: ProductContext): Promise<AiResearchResponse | null> {
  try {
    const res = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(ctx),
    });
    if (!res.ok) return null; // 503 (no key), 502 (gemini error), etc. → fall back to mock
    const data = (await res.json()) as AiResearchResponse;
    if (!data || !data.suggestions || !Array.isArray(data.roles)) return null;
    return data;
  } catch {
    return null;
  }
}

/** "Complete with AI": returns the rich narrative, or null if unavailable. */
export async function completeProfile(profile: SyntheticProfile): Promise<GeneratedProfile | null> {
  try {
    const res = await fetch("/api/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profile),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as GeneratedProfile;
    if (!data || !data.decisionStyle) return null;
    return data;
  } catch {
    return null;
  }
}
