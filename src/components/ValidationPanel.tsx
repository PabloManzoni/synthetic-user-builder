import { useState } from "react";
import { useProfile } from "../state/profileStore";
import { useWizardNav } from "../state/nav";
import { validateProfile } from "../lib/validation";
import { type Verdict, STEP_TITLES } from "../state/types";
import WarningBanner from "./WarningBanner";
import { suggestRoles, generatePrimaryMotivation } from "../ai/mockAi";
import { chooseOptions, chooseExpertise, chooseBehaviorAxes } from "../ai/choose";
import { aiLabel } from "../lib/aiMode";
import {
  GENERIC_ROLES,
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

  const [filling, setFilling] = useState(false);

  // Fill every empty/weak section in one move, AI-first and profile-aware. The fallback
  // when AI is unavailable is deterministic — never random. Never overwrites existing picks.
  const fillBlanks = async () => {
    setFilling(true);
    const p = profile;

    // Role
    if (p.role.selected.length === 0) {
      const aiRoles = suggestRoles(p.productContext);
      if (aiRoles.length) dispatch({ type: "toggleRole", name: aiRoles[0].name, description: aiRoles[0].description });
      else {
        const name = GENERIC_ROLES[0];
        dispatch({ type: "toggleRole", name, description: `A general ${name.toLowerCase()} — shaped for this profile.` });
      }
    }

    // Expertise
    const e = p.expertise;
    if (!e.domainExpertise || !e.technicalProficiency || !e.productTypeFamiliarity || !e.exactProductFamiliarity) {
      const exp = await chooseExpertise(p);
      const ePatch: Record<string, string> = {};
      if (!e.domainExpertise) ePatch.domainExpertise = exp.domainExpertise;
      if (!e.technicalProficiency) ePatch.technicalProficiency = exp.technicalProficiency;
      if (!e.productTypeFamiliarity) ePatch.productTypeFamiliarity = exp.productTypeFamiliarity;
      if (!e.exactProductFamiliarity) ePatch.exactProductFamiliarity = exp.exactProductFamiliarity;
      dispatch({ type: "patchExpertise", patch: ePatch });
    }

    // Decision behavior (via the spectrum axes)
    if (p.decisionBehavior.selected.length === 0) {
      const axes = await chooseBehaviorAxes(p);
      Object.entries(axes).forEach(([key, value]) => dispatch({ type: "setBehaviorAxis", key, value }));
    }

    // Option sections — fill empties and top up the weak ones the validator flags.
    const jobs: Promise<void>[] = [];
    if (p.emotionalBehavior.selected.length === 0)
      jobs.push(chooseOptions(p, "emotionalBehaviors", GENERIC_EMOTIONAL_BEHAVIORS, 3).then((vals) => dispatch({ type: "setSelected", key: "emotionalBehavior", values: vals })));
    if (p.informationNeeds.selected.length === 0)
      jobs.push(chooseOptions(p, "informationNeeds", GENERIC_INFORMATION_NEEDS, 4).then((vals) => dispatch({ type: "setSelected", key: "informationNeeds", values: vals })));
    if (p.constraints.selected.length < 3)
      jobs.push(chooseOptions(p, "constraints", GENERIC_CONSTRAINTS, 3).then((vals) => dispatch({ type: "setSelected", key: "constraints", values: vals })));
    if (p.forbiddenAssumptions.selected.length < 4)
      jobs.push(chooseOptions(p, "forbiddenAssumptions", GENERIC_FORBIDDEN_ASSUMPTIONS, 4).then((vals) => dispatch({ type: "setSelected", key: "forbiddenAssumptions", values: vals })));
    if (p.frictionTriggers.selected.length === 0)
      jobs.push(chooseOptions(p, "frictionTriggers", GENERIC_FRICTION_TRIGGERS, 3).then((vals) => dispatch({ type: "setSelected", key: "frictionTriggers", values: vals })));
    if (p.abandonmentRules.selected.length === 0)
      jobs.push(chooseOptions(p, "abandonmentRules", GENERIC_ABANDONMENT_RULES, 3).then((vals) => dispatch({ type: "setSelected", key: "abandonmentRules", values: vals })));
    await Promise.all(jobs);

    // Task suitability
    if (p.taskSuitability.suitable.length === 0) {
      const [suit, unsuit] = await Promise.all([
        chooseOptions(p, "suitableTasks", GENERIC_SUITABLE_TASKS, 3),
        p.taskSuitability.unsuitable.length === 0
          ? chooseOptions(p, "unsuitableTasks", GENERIC_UNSUITABLE_TASKS, 2)
          : Promise.resolve(p.taskSuitability.unsuitable),
      ]);
      dispatch({ type: "patchTaskSuitability", patch: { suitable: suit, unsuitable: unsuit } });
    }

    // Primary motivation
    if (!p.primaryMotivation.trim()) {
      const roleName = p.role.selected[0] || suggestRoles(p.productContext)[0]?.name || "";
      dispatch({ type: "patchTop", patch: { primaryMotivation: generatePrimaryMotivation(roleName, p.productContext) } });
    }

    setFilling(false);
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
            <div className="text-[13px] font-medium text-[var(--color-ink)]">{aiLabel("Fill the blanks with AI", "Fill the blanks (offline)")}</div>
            <div className="text-[11px] text-[var(--color-ink-faint)]">
              Fills every empty or weak section, coherent with the profile so far. Won't touch what you already set.
            </div>
          </div>
          <button
            type="button"
            onClick={fillBlanks}
            disabled={filling}
            className="shrink-0 rounded-lg px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-60"
            style={{ background: "var(--color-accent)", color: "#0b0d10" }}
          >
            {filling ? "Filling…" : "✨ Fill the blanks"}
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
