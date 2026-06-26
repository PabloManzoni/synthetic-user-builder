// "Auto-build the whole profile" orchestration.
//
// One coherent AI pass (/api/build) designs every selection at once; a fully
// deterministic local plan is the fallback when AI is unavailable (no extra
// network). We then APPLY the plan without ever overwriting what the user already
// set, and write the final narrative (.md) — AI-first, deterministic fallback.

import type { SyntheticProfile } from "../state/types";
import { buildProfile, completeProfile, type BuildResponse } from "./aiClient";
import { recommendedFor, generatePrimaryMotivation } from "./mockAi";
import { axisStatements } from "./behaviorAxes";
import { deterministicNarrative } from "../lib/export";
import {
  GENERIC_INFORMATION_NEEDS,
  GENERIC_CONSTRAINTS,
  GENERIC_FORBIDDEN_ASSUMPTIONS,
  GENERIC_FRICTION_TRIGGERS,
  GENERIC_EMOTIONAL_BEHAVIORS,
  GENERIC_ABANDONMENT_RULES,
  GENERIC_SUITABLE_TASKS,
  GENERIC_UNSUITABLE_TASKS,
  GENERIC_ROLES,
} from "./genericOptions";

const AXES = ["pace", "priority", "verification", "trust", "escalation"];

function hashHex(s: string): string {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16);
}

/**
 * Signature of the user's GENERATION INPUTS — context, role, expertise, axes,
 * every option selection and task choice, plus motivation. Excludes derived/AI
 * text (slice.generated, the narrative) so merely visiting a step never changes
 * it; only real edits do. Used to decide when the auto-build button reappears.
 */
export function profileSignature(p: SyntheticProfile): string {
  const c = p.productContext;
  const e = p.expertise;
  const opt = (s: { selected: string[]; custom: string[] }) => [s.selected, s.custom];
  return hashHex(
    JSON.stringify({
      c: [c.clientName, c.productName, c.manualDescription, c.aiSummary, c.knownPrimaryUsers, c.knownRiskAreas],
      r: [p.role.selected, p.role.custom],
      m: p.primaryMotivation,
      e: [e.domainExpertise, e.technicalProficiency, e.productTypeFamiliarity, e.exactProductFamiliarity],
      x: p.behaviorAxes,
      o: [
        opt(p.decisionBehavior),
        opt(p.informationNeeds),
        opt(p.constraints),
        opt(p.forbiddenAssumptions),
        opt(p.frictionTriggers),
        opt(p.emotionalBehavior),
        opt(p.abandonmentRules),
      ],
      t: [
        p.taskSuitability.suitable,
        p.taskSuitability.unsuitable,
        p.taskSuitability.customSuitable,
        p.taskSuitability.customUnsuitable,
      ],
    })
  );
}
const clampAxis = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.min(4, Math.round(n))) : 2;
};

// Deterministic, profile-aware plan — never random. Prefers the research-time AI
// suggestions stored on the context; otherwise the head of each common pool.
function deterministicPlan(p: SyntheticProfile): BuildResponse {
  const sug = (cat: string): string[] => ((p.productContext.aiSuggestions as any)?.[cat] as string[]) ?? [];
  const pick = (cat: any, common: string[], min: number) => {
    const ai = sug(cat);
    return ai.length ? recommendedFor(p.productContext, cat, ai, common) : common.slice(0, min);
  };
  const roleName = p.role.selected[0] || GENERIC_ROLES[0];
  return {
    expertise: {
      domainExpertise: "Medium",
      technicalProficiency: "Medium",
      productTypeFamiliarity: "Regular user",
      exactProductFamiliarity: "None",
    },
    behaviorAxes: { pace: 2, priority: 2, verification: 2, trust: 2, escalation: 2 },
    informationNeeds: pick("informationNeeds", GENERIC_INFORMATION_NEEDS, 4),
    constraints: GENERIC_CONSTRAINTS.slice(0, 3),
    forbiddenAssumptions: pick("forbiddenAssumptions", GENERIC_FORBIDDEN_ASSUMPTIONS, 4),
    frictionTriggers: pick("frictionTriggers", GENERIC_FRICTION_TRIGGERS, 3),
    emotionalBehaviors: pick("emotionalBehaviors", GENERIC_EMOTIONAL_BEHAVIORS, 3),
    abandonmentRules: pick("abandonmentRules", GENERIC_ABANDONMENT_RULES, 3),
    suitableTasks: pick("suitableTasks", GENERIC_SUITABLE_TASKS, 3),
    unsuitableTasks: GENERIC_UNSUITABLE_TASKS.slice(0, 2),
    primaryMotivation: generatePrimaryMotivation(roleName, p.productContext),
  };
}

/** AI-first full plan; deterministic fields backfill anything the model omits. */
async function planFullProfile(p: SyntheticProfile): Promise<BuildResponse> {
  const fb = deterministicPlan(p);
  const ai = await buildProfile(p);
  if (!ai) return fb;
  const arr = (v: unknown, f: string[]) => (Array.isArray(v) && v.length ? (v as string[]) : f);
  const axes: Record<string, number> = {};
  for (const k of AXES) axes[k] = ai.behaviorAxes?.[k] != null ? clampAxis(ai.behaviorAxes[k]) : fb.behaviorAxes[k];
  return {
    expertise: {
      domainExpertise: ai.expertise?.domainExpertise || fb.expertise.domainExpertise,
      technicalProficiency: ai.expertise?.technicalProficiency || fb.expertise.technicalProficiency,
      productTypeFamiliarity: ai.expertise?.productTypeFamiliarity || fb.expertise.productTypeFamiliarity,
      exactProductFamiliarity: ai.expertise?.exactProductFamiliarity || fb.expertise.exactProductFamiliarity,
    },
    behaviorAxes: axes,
    informationNeeds: arr(ai.informationNeeds, fb.informationNeeds),
    constraints: arr(ai.constraints, fb.constraints),
    forbiddenAssumptions: arr(ai.forbiddenAssumptions, fb.forbiddenAssumptions),
    frictionTriggers: arr(ai.frictionTriggers, fb.frictionTriggers),
    emotionalBehaviors: arr(ai.emotionalBehaviors, fb.emotionalBehaviors),
    abandonmentRules: arr(ai.abandonmentRules, fb.abandonmentRules),
    suitableTasks: arr(ai.suitableTasks, fb.suitableTasks),
    unsuitableTasks: arr(ai.unsuitableTasks, fb.unsuitableTasks),
    primaryMotivation: (ai.primaryMotivation || "").trim() || fb.primaryMotivation,
  };
}

// Apply the plan WITHOUT overwriting anything the user already set.
function applyPlan(p: SyntheticProfile, plan: BuildResponse): SyntheticProfile {
  const e = p.expertise;
  const fillOpt = (slice: SyntheticProfile["informationNeeds"], vals: string[]) =>
    slice.selected.length ? slice : { ...slice, selected: vals };

  const axesEmpty = Object.keys(p.behaviorAxes).length === 0;
  const behaviorAxes = axesEmpty ? plan.behaviorAxes : p.behaviorAxes;
  const decisionSel = axisStatements(behaviorAxes);

  const ts = p.taskSuitability;

  return {
    ...p,
    primaryMotivation: p.primaryMotivation.trim() || plan.primaryMotivation,
    behaviorAxes,
    expertise: {
      ...e,
      domainExpertise: e.domainExpertise || plan.expertise.domainExpertise,
      technicalProficiency: e.technicalProficiency || plan.expertise.technicalProficiency,
      productTypeFamiliarity: e.productTypeFamiliarity || plan.expertise.productTypeFamiliarity,
      exactProductFamiliarity: e.exactProductFamiliarity || plan.expertise.exactProductFamiliarity,
    },
    decisionBehavior: axesEmpty
      ? { ...p.decisionBehavior, selected: decisionSel, generated: decisionSel.join(" ") }
      : p.decisionBehavior,
    informationNeeds: fillOpt(p.informationNeeds, plan.informationNeeds),
    constraints: fillOpt(p.constraints, plan.constraints),
    forbiddenAssumptions: fillOpt(p.forbiddenAssumptions, plan.forbiddenAssumptions),
    frictionTriggers: fillOpt(p.frictionTriggers, plan.frictionTriggers),
    emotionalBehavior: fillOpt(p.emotionalBehavior, plan.emotionalBehaviors),
    abandonmentRules: fillOpt(p.abandonmentRules, plan.abandonmentRules),
    taskSuitability: {
      ...ts,
      suitable: ts.suitable.length ? ts.suitable : plan.suitableTasks,
      unsuitable: ts.unsuitable.length ? ts.unsuitable : plan.unsuitableTasks,
    },
  };
}

/**
 * Builds the entire profile from context + role: fills every empty step coherently,
 * then writes the final narrative. Returns the complete profile (with `generated`
 * set) so the caller can load it and jump to Export. Never overwrites user edits.
 */
export async function generateFullProfile(p: SyntheticProfile): Promise<SyntheticProfile> {
  const plan = await planFullProfile(p);
  const merged = applyPlan(p, plan);
  const generated = (await completeProfile(merged)) ?? deterministicNarrative(merged);
  const full = { ...merged, generated };
  // Stamp the inputs so the button hides until the form changes again.
  return { ...full, builtSignature: profileSignature(full) };
}
