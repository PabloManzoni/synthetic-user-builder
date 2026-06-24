import OptionStep from "./OptionStep";
import Step1ProductContext from "./Step1ProductContext";
import Step2Role from "./Step2Role";
import Step3Expertise from "./Step3Expertise";
import Step10TaskSuitability from "./Step10TaskSuitability";
import ValidationPanel from "../components/ValidationPanel";
import ExportPanel from "../components/ExportPanel";
import AiEmptyHint from "../components/AiEmptyHint";
import BehaviorAxes from "../components/BehaviorAxes";
import {
  suggestInformationNeeds,
  suggestForbiddenAssumptions,
  suggestFrictionTriggers,
  suggestEmotionalBehaviors,
  suggestAbandonmentRules,
  generateRequiredInfo,
  generateConstraintRule,
  generateForbiddenRule,
  generateFrictionRules,
  generateEmotionalProgression,
  generateAbandonmentRules,
} from "../ai/mockAi";
import {
  GENERIC_INFORMATION_NEEDS,
  GENERIC_CONSTRAINTS,
  GENERIC_FORBIDDEN_ASSUMPTIONS,
  GENERIC_FRICTION_TRIGGERS,
  GENERIC_EMOTIONAL_BEHAVIORS,
  GENERIC_ABANDONMENT_RULES,
} from "../ai/genericOptions";

export interface StepDef {
  title: string;
  helper: string;
  Body: () => JSX.Element;
}

const joinRules = (fn: (o: string) => string) => (selected: string[], custom: string[]) =>
  [...selected, ...custom].map(fn).join("\n");

// Sub-section header used inside merged steps.
function Sub({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-[var(--color-ink)]">{title}</h3>
        {desc && <p className="mt-1 text-[12px] text-[var(--color-ink-faint)]">{desc}</p>}
      </div>
      {children}
    </div>
  );
}

const divider = <div className="h-px" style={{ background: "var(--color-border)" }} />;

export const STEPS: StepDef[] = [
  {
    title: "Product context",
    helper:
      "Understand the business well enough to suggest relevant roles and friction. You can search, describe it, or skip.",
    Body: Step1ProductContext,
  },
  {
    title: "Role",
    helper: "Pick one or more reusable operational roles — the agent's relationship to the domain, not a task.",
    Body: Step2Role,
  },
  {
    title: "Expertise & familiarity",
    helper: "Define what the user knows and, just as importantly, what they don't.",
    Body: Step3Expertise,
  },
  {
    title: "Behavior & trust",
    helper: "How this user decides under pressure, and how their trust and emotions shift through friction.",
    Body: () => (
      <div className="space-y-8">
        <Sub title="Decision behavior" desc="Slide each axis toward how this user tends to act. No contradictory picks.">
          <BehaviorAxes />
        </Sub>
        {divider}
        <Sub title="Emotional & trust" desc="How their emotional state and trust evolve through friction.">
          <OptionStep
            stepKey="emotionalBehavior"
            aiSuggest={suggestEmotionalBehaviors}
            common={GENERIC_EMOTIONAL_BEHAVIORS}
            customPlaceholder="Other emotional behavior…"
            generatedTitle="Emotional progression rules"
            generate={generateEmotionalProgression}
          />
        </Sub>
      </div>
    ),
  },
  {
    title: "Information & limits",
    helper: "What the agent must see, what bounds it, and what it can't assume unless the interface shows it.",
    Body: () => (
      <div className="space-y-8">
        <Sub title="Information needs" desc="Categories of information the agent needs to decide (not task-specific).">
          <OptionStep
            stepKey="informationNeeds"
            aiSuggest={suggestInformationNeeds}
            common={GENERIC_INFORMATION_NEEDS}
            customPlaceholder="Other required information…"
            generatedTitle="Required explicit information"
            generate={generateRequiredInfo}
          />
        </Sub>
        {divider}
        <Sub title="Constraints" desc="What the agent may and may not rely on.">
          <OptionStep
            stepKey="constraints"
            aiSuggest={() => []}
            common={GENERIC_CONSTRAINTS}
            customPlaceholder="Other constraint…"
            generatedTitle="Generated constraints"
            generate={joinRules(generateConstraintRule)}
            aiEmptyHint={
              <p
                className="rounded-lg border border-dashed px-3 py-2.5 text-xs leading-snug text-[var(--color-ink-faint)]"
                style={{ borderColor: "var(--color-border)" }}
              >
                Constraints come from the common list below — pick the ones that bound this agent.
              </p>
            }
          />
        </Sub>
        {divider}
        <Sub
          title="Forbidden assumptions"
          desc="The most important part: what the agent cannot know, assume, or infer unless the interface shows it."
        >
          <OptionStep
            stepKey="forbiddenAssumptions"
            aiSuggest={suggestForbiddenAssumptions}
            common={GENERIC_FORBIDDEN_ASSUMPTIONS}
            customPlaceholder="Other forbidden assumption…"
            generatedTitle="Generated forbidden rules"
            generate={joinRules(generateForbiddenRule)}
            warnIfEmpty="This profile is likely too weak. Add forbidden assumptions to prevent the synthetic user from compensating for missing interface information."
            aiEmptyHint={<AiEmptyHint what="AI-suggested forbidden assumptions" />}
          />
        </Sub>
      </div>
    ),
  },
  {
    title: "Friction & breaking points",
    helper: "What creates hesitation or distrust — and when the user stops, escalates, or finishes unsure.",
    Body: () => (
      <div className="space-y-8">
        <Sub title="Friction triggers" desc="What creates hesitation, confusion, distrust, or fatigue.">
          <OptionStep
            stepKey="frictionTriggers"
            aiSuggest={suggestFrictionTriggers}
            common={GENERIC_FRICTION_TRIGGERS}
            customPlaceholder="Other friction trigger…"
            generatedTitle="Behavioral rules"
            generate={generateFrictionRules}
          />
        </Sub>
        {divider}
        <Sub title="Abandonment & escalation" desc="When they stop, escalate, ask for help, or finish with low confidence.">
          <OptionStep
            stepKey="abandonmentRules"
            aiSuggest={suggestAbandonmentRules}
            common={GENERIC_ABANDONMENT_RULES}
            customPlaceholder="Other abandonment or escalation rule…"
            generatedTitle="Abandonment & escalation rules"
            generate={generateAbandonmentRules}
          />
        </Sub>
      </div>
    ),
  },
  {
    title: "Task suitability",
    helper: "Where should this profile be used — and not used? This is not the same as defining a task.",
    Body: Step10TaskSuitability,
  },
  {
    title: "Validation",
    helper: "Check whether the profile is strong enough to drive a meaningful simulation. Export is never blocked.",
    Body: ValidationPanel,
  },
  {
    title: "Export",
    helper: "Export the reusable profile. No task objective, no navigation steps.",
    Body: ExportPanel,
  },
];
