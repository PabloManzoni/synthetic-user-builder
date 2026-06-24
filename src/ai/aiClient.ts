// Client-side caller for the /api/ai serverless function (Gemini).
// Returns null on any failure so callers can fall back to the deterministic mock.

import type { ProductContext, AiSuggestions, SyntheticProfile, GeneratedProfile } from "../state/types";
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
  try {
    const res = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...ctx, commonPools: COMMON_POOLS }),
    });
    if (!res.ok) return null; // 503 (no key), 502 (gemini error), etc. → fall back to mock
    const data = (await res.json()) as AiResearchResponse;
    if (!data || !data.suggestions || !Array.isArray(data.roles)) return null;
    return data;
  } catch {
    return null;
  }
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
  try {
    const res = await fetch("/api/refine", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profile, target }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as RefineResponse;
    if (!data || (!data.motivation && !Array.isArray(data.suggestions))) return null;
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
