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

// One silent retry: transient blips (cold start, rate spike, a single dropped
// request) usually clear on a second try, so we retry once before giving up.
// The server already retries Gemini-side; this covers the hop in between.
async function withRetry<T>(fn: () => Promise<T | null>, delayMs = 600): Promise<T | null> {
  const first = await fn();
  if (first != null) return first;
  await new Promise((r) => setTimeout(r, delayMs));
  return fn();
}
import {
  GENERIC_DECISION_BEHAVIORS,
  GENERIC_INFORMATION_NEEDS,
  GENERIC_CONSTRAINTS,
  GENERIC_FORBIDDEN_ASSUMPTIONS,
  GENERIC_FRICTION_TRIGGERS,
  GENERIC_EMOTIONAL_BEHAVIORS,
  GENERIC_ABANDONMENT_RULES,
  GENERIC_SUITABLE_TASKS,
  GENERIC_UNSUITABLE_TASKS,
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

// Pools the auto-build endpoint picks from (a superset of COMMON_POOLS).
const BUILD_POOLS = {
  informationNeeds: GENERIC_INFORMATION_NEEDS,
  constraints: GENERIC_CONSTRAINTS,
  forbiddenAssumptions: GENERIC_FORBIDDEN_ASSUMPTIONS,
  frictionTriggers: GENERIC_FRICTION_TRIGGERS,
  emotionalBehaviors: GENERIC_EMOTIONAL_BEHAVIORS,
  abandonmentRules: GENERIC_ABANDONMENT_RULES,
  suitableTasks: GENERIC_SUITABLE_TASKS,
  unsuitableTasks: GENERIC_UNSUITABLE_TASKS,
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
  return withRetry(async () => {
    const data = (await postJson("/api/ai", { ...ctx, commonPools: COMMON_POOLS })) as AiResearchResponse | null;
    if (!data || !data.suggestions || !Array.isArray(data.roles)) return null;
    return data;
  });
}

export type RefineTarget =
  | "motivation"
  | "decisionBehaviors"
  | "informationNeeds"
  | "constraints"
  | "forbiddenAssumptions"
  | "frictionTriggers"
  | "emotionalBehaviors"
  | "abandonmentRules"
  | "suitableTasks"
  | "unsuitableTasks"
  | "expertise"
  | "behaviorAxes";

export interface RefineResponse {
  motivation?: string;
  suggestions?: string[];
  recommended?: string[];
  expertise?: {
    domainExpertise?: string;
    technicalProficiency?: string;
    productTypeFamiliarity?: string;
    exactProductFamiliarity?: string;
  };
  behaviorAxes?: Record<string, number>;
}

/** Context-aware refine using the full profile so far. Null if unavailable. */
export async function refineField(
  profile: SyntheticProfile,
  target: RefineTarget
): Promise<RefineResponse | null> {
  const data = (await postJson("/api/refine", { profile, target })) as RefineResponse | null;
  if (!data || (!data.motivation && !Array.isArray(data.suggestions) && !data.expertise && !data.behaviorAxes))
    return null;
  return data;
}

/** "Complete with AI": returns the rich narrative, or null if unavailable. */
export async function completeProfile(profile: SyntheticProfile): Promise<GeneratedProfile | null> {
  return withRetry(async () => {
    const data = (await postJson("/api/complete", profile)) as GeneratedProfile | null;
    if (!data || !data.decisionStyle) return null;
    return data;
  });
}

/** Every selection the auto-build endpoint chooses, in one coherent pass. */
export interface BuildResponse {
  expertise: {
    domainExpertise: string;
    technicalProficiency: string;
    productTypeFamiliarity: string;
    exactProductFamiliarity: string;
  };
  behaviorAxes: Record<string, number>;
  informationNeeds: string[];
  constraints: string[];
  forbiddenAssumptions: string[];
  frictionTriggers: string[];
  emotionalBehaviors: string[];
  abandonmentRules: string[];
  suitableTasks: string[];
  unsuitableTasks: string[];
  primaryMotivation: string;
}

/** "Auto-build the whole profile": one coherent pass. Null if AI is unavailable. */
export async function buildProfile(profile: SyntheticProfile): Promise<BuildResponse | null> {
  return withRetry(async () => {
    const data = (await postJson("/api/build", { profile, commonPools: BUILD_POOLS }, 45000)) as
      | BuildResponse
      | null;
    if (!data || !data.expertise || !Array.isArray(data.informationNeeds)) return null;
    return data;
  });
}
