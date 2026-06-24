// Client-side caller for the /api serverless functions (Gemini).
// Returns null on any failure so callers can fall back to the deterministic mock.

import type { ProductContext, AiSuggestions, SyntheticProfile, GeneratedProfile } from "../state/types";

// POST JSON with a hard timeout so a slow/hung network never spins forever.
async function postJson(url: string, body: unknown, ms = 30000): Promise<any | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
import {
  GENERIC_DECISION_BEHAVIORS,
  GENERIC_INFORMATION_NEEDS,
  GENERIC_FORBIDDEN_ASSUMPTIONS,
  GENERIC_FRICTION_TRIGGERS,
  GENERIC_EMOTIONAL_BEHAVIORS,
  GENERIC_ABANDONMENT_RULES,
  GENERIC_SUITABLE_TASKS,
} from "./genericOptions";

const COMMON_POOLS = {
  decisionBehaviors: GENERIC_DECISION_BEHAVIORS,
  informationNeeds: GENERIC_INFORMATION_NEEDS,
  forbiddenAssumptions: GENERIC_FORBIDDEN_ASSUMPTIONS,
  frictionTriggers: GENERIC_FRICTION_TRIGGERS,
  emotionalBehaviors: GENERIC_EMOTIONAL_BEHAVIORS,
  abandonmentRules: GENERIC_ABANDONMENT_RULES,
  suitableTasks: GENERIC_SUITABLE_TASKS,
};

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
  const data = (await postJson("/api/ai", { ...ctx, commonPools: COMMON_POOLS })) as AiResearchResponse | null;
  if (!data || !data.suggestions || !Array.isArray(data.roles)) return null;
  return data;
}

export type RefineTarget =
  | "motivation"
  | "decisionBehaviors"
  | "informationNeeds"
  | "forbiddenAssumptions"
  | "frictionTriggers"
  | "emotionalBehaviors"
  | "abandonmentRules"
  | "suitableTasks";

export interface RefineResponse {
  motivation?: string;
  suggestions?: string[];
  recommended?: string[];
}

/** Context-aware refine using the full profile so far. Null if unavailable. */
export async function refineField(
  profile: SyntheticProfile,
  target: RefineTarget
): Promise<RefineResponse | null> {
  const data = (await postJson("/api/refine", { profile, target })) as RefineResponse | null;
  if (!data || (!data.motivation && !Array.isArray(data.suggestions))) return null;
  return data;
}

/** "Complete with AI": returns the rich narrative, or null if unavailable. */
export async function completeProfile(profile: SyntheticProfile): Promise<GeneratedProfile | null> {
  const data = (await postJson("/api/complete", profile)) as GeneratedProfile | null;
  if (!data || !data.decisionStyle) return null;
  return data;
}
