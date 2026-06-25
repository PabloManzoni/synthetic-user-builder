// "Choose with AI" — picks selections coherent with the WHOLE profile built so far,
// calling the real AI (refine, which receives the full profile). The fallback when AI
// is unavailable is DETERMINISTIC and profile-aware — never random.

import type { SyntheticProfile } from "../state/types";
import { refineField, type RefineTarget } from "./aiClient";
import { recommendedFor } from "./mockAi";

const uniq = (a: string[]) => Array.from(new Set(a));

/** Contextual pick for an option category. AI first; deterministic fallback. */
export async function chooseOptions(
  profile: SyntheticProfile,
  category: RefineTarget,
  common: string[],
  min = 3
): Promise<string[]> {
  const res = await refineField(profile, category);
  let chosen = res?.recommended?.length ? res.recommended : res?.suggestions ?? [];
  if (!chosen.length) {
    // No AI: prefer the research-time suggestions (deterministic curation), else the
    // head of the common pool. Both are stable — no shuffling.
    const ai = ((profile.productContext.aiSuggestions as any)?.[category] as string[]) ?? [];
    chosen = ai.length ? recommendedFor(profile.productContext, category as any, ai, common) : common.slice(0, min);
  }
  // Top up deterministically (in pool order) so weak picks still meet the minimum.
  if (chosen.length < min) {
    for (const item of common) {
      if (chosen.length >= min) break;
      if (!chosen.includes(item)) chosen.push(item);
    }
  }
  return uniq(chosen);
}

const EXPERTISE_FALLBACK = {
  domainExpertise: "Medium",
  technicalProficiency: "Medium",
  productTypeFamiliarity: "Regular user",
  exactProductFamiliarity: "None",
};

/** Expertise levels coherent with the role/product. AI first; sensible deterministic default. */
export async function chooseExpertise(profile: SyntheticProfile) {
  const e = (await refineField(profile, "expertise"))?.expertise;
  return {
    domainExpertise: e?.domainExpertise || EXPERTISE_FALLBACK.domainExpertise,
    technicalProficiency: e?.technicalProficiency || EXPERTISE_FALLBACK.technicalProficiency,
    productTypeFamiliarity: e?.productTypeFamiliarity || EXPERTISE_FALLBACK.productTypeFamiliarity,
    exactProductFamiliarity: e?.exactProductFamiliarity || EXPERTISE_FALLBACK.exactProductFamiliarity,
  };
}

const AXES = ["pace", "priority", "verification", "trust", "escalation"];

/** Behavior spectrum positions (0-4) coherent with role/expertise. AI first; balanced fallback. */
export async function chooseBehaviorAxes(profile: SyntheticProfile): Promise<Record<string, number>> {
  const a = (await refineField(profile, "behaviorAxes"))?.behaviorAxes || {};
  const out: Record<string, number> = {};
  for (const k of AXES) {
    const v = Number(a[k]);
    out[k] = Number.isFinite(v) ? Math.max(0, Math.min(4, Math.round(v))) : 2;
  }
  return out;
}
