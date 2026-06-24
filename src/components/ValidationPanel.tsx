import { useState } from "react";
import { useProfile } from "../state/profileStore";
import { useWizardNav } from "../state/nav";
import { validateProfile } from "../lib/validation";
import { type Verdict, STEP_TITLES } from "../state/types";
import WarningBanner from "./WarningBanner";
import { suggestRoles, recommendedFor, generatePrimaryMotivation } from "../ai/mockAi";
import { BEHAVIOR_AXES } from "../ai/behaviorAxes";
import { randomSubset, randomFrom } from "../lib/random";
import {
  GENERIC_ROLES,
  DOMAIN_EXPERTISE_LEVELS,
  TECHNICAL_LEVELS,
  PRODUCT_TYPE_FAMILIARITY,
  EXACT_PRODUCT_FAMILIARITY,
  GENERIC_EMOTIONAL_BEHAVIORS,
  GENERIC_INFORMATION_NEEDS,
  GENERIC_CONSTRAINTS,
  GENERIC_FORBIDDEN_ASSUMPTIONS,
  GENERIC_FRICTION_TRIGGERS,
  GENERIC_ABANDONMENT_RULES,
  GENERIC_SUITABLE_TASKS,
  GENERIC_UNSUITABLE_TASKS,
} from "../ai/genericOptions";

const color = (v: Verdict) =>
  v === "strong"
    ? "var(--color-ok)"
    : v === "invalid"
      ? "var(--color-action)"
      : v === "incomplete"
        ? "var(--color-ink-faint)"
        : "var(--color-risk)";
const label = (v: Verdict) =>
  v === "strong"
    ? "Good"
    : v === "invalid"
      ? "Has problems"
      : v === "incomplete"
        ? "Not filled yet"
        : "Could be better";

export default function ValidationPanel() {
  const { profile, dispatch } = useProfile();
  const go = useWizardNav();
  const [nonce, setNonce] = useState(0); // for "Regenerate"
  const v = validateProfile(profile);
  void nonce;

  // Fill every empty/weak section in one move: AI suggestions where we have them,
  // sensible random data otherwise. Never overwrites what the user already set.
  const fixEverything = () => {
    const p = profile;
    const ctx = p.productContext;
    const ai = ctx.aiSuggestions;
    // Choose items that satisfy the validator's minimum: start from AI's recommended
    // subset (most relevant), then top up from the pool — AI suggestions first, then
    // common — until we hit `min`. The recommended subset alone is often too small.
    const pick = (
      cat: Parameters<typeof recommendedFor>[1],
      aiArr: string[],
      common: string[],
      min: number,
      max: number
    ): string[] => {
      const chosen = aiArr.length ? [...recommendedFor(ctx, cat, aiArr, common)] : randomSubset(common, min, max);
      if (chosen.length < min) {
        for (const item of [...aiArr, ...common]) {
          if (chosen.length >= min) break;
          if (!chosen.includes(item)) chosen.push(item);
        }
      }
      return chosen;
    };

    // Role
    let roleName = p.role.selected[0] ?? "";
    if (p.role.selected.length === 0) {
      const aiRoles = suggestRoles(ctx);
      if (aiRoles.length) {
        roleName = aiRoles[0].name;
        dispatch({ type: "toggleRole", name: aiRoles[0].name, description: aiRoles[0].description });
      } else {
        roleName = randomFrom(GENERIC_ROLES);
        dispatch({ type: "toggleRole", name: roleName, description: `A general ${roleName.toLowerCase()} — shaped for this profile.` });
      }
    }

    // Expertise
    const e = p.expertise;
    const ePatch: Record<string, string> = {};
    if (!e.domainExpertise) ePatch.domainExpertise = randomFrom(DOMAIN_EXPERTISE_LEVELS);
    if (!e.technicalProficiency) ePatch.technicalProficiency = randomFrom(TECHNICAL_LEVELS);
    if (!e.productTypeFamiliarity) ePatch.productTypeFamiliarity = randomFrom(PRODUCT_TYPE_FAMILIARITY);
    if (!e.exactProductFamiliarity) ePatch.exactProductFamiliarity = randomFrom(EXACT_PRODUCT_FAMILIARITY);
    if (Object.keys(ePatch).length) dispatch({ type: "patchExpertise", patch: ePatch });

    // Decision behavior (via the spectrum axes)
    if (p.decisionBehavior.selected.length === 0)
      BEHAVIOR_AXES.forEach((a) => dispatch({ type: "setBehaviorAxis", key: a.key, value: Math.floor(Math.random() * 5) }));

    // Option sections — fill empties, and top up the weak ones the validator flags.
    if (p.emotionalBehavior.selected.length === 0)
      dispatch({ type: "setSelected", key: "emotionalBehavior", values: pick("emotionalBehaviors", ai?.emotionalBehaviors ?? [], GENERIC_EMOTIONAL_BEHAVIORS, 3, 5) });
    if (p.informationNeeds.selected.length === 0)
      dispatch({ type: "setSelected", key: "informationNeeds", values: pick("informationNeeds", ai?.informationNeeds ?? [], GENERIC_INFORMATION_NEEDS, 4, 6) });
    if (p.constraints.selected.length < 3)
      dispatch({ type: "setSelected", key: "constraints", values: randomSubset(GENERIC_CONSTRAINTS, 3, 5) });
    if (p.forbiddenAssumptions.selected.length < 4)
      dispatch({ type: "setSelected", key: "forbiddenAssumptions", values: pick("forbiddenAssumptions", ai?.forbiddenAssumptions ?? [], GENERIC_FORBIDDEN_ASSUMPTIONS, 4, 7) });
    if (p.frictionTriggers.selected.length === 0)
      dispatch({ type: "setSelected", key: "frictionTriggers", values: pick("frictionTriggers", ai?.frictionTriggers ?? [], GENERIC_FRICTION_TRIGGERS, 3, 5) });
    if (p.abandonmentRules.selected.length === 0)
      dispatch({ type: "setSelected", key: "abandonmentRules", values: pick("abandonmentRules", ai?.abandonmentRules ?? [], GENERIC_ABANDONMENT_RULES, 3, 5) });

    // Task suitability
    if (p.taskSuitability.suitable.length === 0)
      dispatch({
        type: "patchTaskSuitability",
        patch: {
          suitable: pick("suitableTasks", ai?.suitableTasks ?? [], GENERIC_SUITABLE_TASKS, 3, 5),
          unsuitable: p.taskSuitability.unsuitable.length === 0 ? randomSubset(GENERIC_UNSUITABLE_TASKS, 2, 4) : p.taskSuitability.unsuitable,
        },
      });

    // Primary motivation
    if (!p.primaryMotivation.trim())
      dispatch({ type: "patchTop", patch: { primaryMotivation: generatePrimaryMotivation(roleName, ctx) } });
  };

  return (
    <div className="space-y-5">
      <div
        className="flex items-center justify-between rounded-xl border px-4 py-3"
        style={{ borderColor: "var(--color-border)", background: "var(--color-surface-2)" }}
      >
        <span className="text-sm text-[var(--color-ink-soft)]">Overall</span>
        <span className="text-sm font-semibold" style={{ color: color(v.overall) }}>
          {label(v.overall)}
        </span>
      </div>

      <div className="space-y-2">
        {v.dimensions.map((d) => (
          <button
            key={d.key}
            type="button"
            onClick={() => go(d.step)}
            className="w-full rounded-xl border px-4 py-3 text-left transition-colors hover:border-[var(--color-border-strong)]"
            style={{ borderColor: "var(--color-border)" }}
            title={`Edit: ${STEP_TITLES[d.step]}`}
          >
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-[var(--color-ink)]">{d.label}</span>
              <span
                className="inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                style={{ background: "var(--color-surface)", color: color(d.verdict) }}
              >
                {label(d.verdict)}
                <span aria-hidden style={{ opacity: 0.7 }}>↗</span>
              </span>
            </div>
            <p className="mt-1 text-[12px] leading-snug text-[var(--color-ink-soft)]">{d.explanation}</p>
          </button>
        ))}
      </div>

      {v.issues.length > 0 && (
        <div className="space-y-2">
          {v.issues.map((iss) => (
            <WarningBanner key={iss} tone={/task or navigation/i.test(iss) ? "danger" : "warn"}>
              {iss}
            </WarningBanner>
          ))}
        </div>
      )}

      {v.overall !== "strong" && (
        <div
          className="flex items-center justify-between gap-3 rounded-xl border px-4 py-3"
          style={{ borderColor: "var(--color-accent)", background: "var(--color-surface-2)" }}
        >
          <div>
            <div className="text-[13px] font-medium text-[var(--color-ink)]">Fill the blanks with AI</div>
            <div className="text-[11px] text-[var(--color-ink-faint)]">
              Fills every empty or weak section with AI suggestions (and sensible random data). Won't touch what you already set.
            </div>
          </div>
          <button
            type="button"
            onClick={fixEverything}
            className="shrink-0 rounded-lg px-4 py-2 text-sm font-semibold transition-colors"
            style={{ background: "var(--color-accent)", color: "#0b0d10" }}
          >
            ✨ Fill the blanks
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={() => setNonce((n) => n + 1)}
        className="text-[12px] font-medium text-[var(--color-info)] hover:underline"
      >
        ↻ Re-check
      </button>

      {v.overall === "invalid" && (
        <WarningBanner tone="warn">
          This profile has problems, but you can still export it. Fix the items above to make it ready to use.
        </WarningBanner>
      )}
    </div>
  );
}
