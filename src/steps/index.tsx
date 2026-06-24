import OptionStep from "./OptionStep";
import Step1ProductContext from "./Step1ProductContext";
import Step2Role from "./Step2Role";
import Step3Expertise from "./Step3Expertise";
import Step6Constraints from "./Step6Constraints";
import Step10TaskSuitability from "./Step10TaskSuitability";
import ValidationPanel from "../components/ValidationPanel";
import ExportPanel from "../components/ExportPanel";
import {
  suggestDecisionBehaviors,
  suggestInformationNeeds,
  suggestFrictionTriggers,
  suggestEmotionalBehaviors,
  suggestAbandonmentRules,
  generateBehavioralSummary,
  generateRequiredInfo,
  generateFrictionRules,
  generateEmotionalProgression,
  generateAbandonmentRules,
} from "../ai/mockAi";
import {
  GENERIC_DECISION_BEHAVIORS,
  GENERIC_INFORMATION_NEEDS,
  GENERIC_FRICTION_TRIGGERS,
  GENERIC_EMOTIONAL_BEHAVIORS,
  GENERIC_ABANDONMENT_RULES,
} from "../ai/genericOptions";

export interface StepDef {
  title: string;
  helper: string;
  Body: () => JSX.Element;
}

export const STEPS: StepDef[] = [
  {
    title: "Product context",
    helper:
      "Understand the business well enough to suggest relevant roles and friction. You can search, describe it, or skip.",
    Body: Step1ProductContext,
  },
  {
    title: "Role",
    helper: "Pick one reusable operational role — the agent's relationship to the domain, not a task.",
    Body: Step2Role,
  },
  {
    title: "Expertise & familiarity",
    helper: "Define what the user knows and, just as importantly, what they don't.",
    Body: Step3Expertise,
  },
  {
    title: "Decision behavior",
    helper: "How does this user decide under normal conditions and under pressure?",
    Body: () => (
      <OptionStep
        stepKey="decisionBehavior"
        aiSuggest={suggestDecisionBehaviors}
        common={GENERIC_DECISION_BEHAVIORS}
        customPlaceholder="Other behavior…"
        generatedTitle="Behavioral summary"
        generate={generateBehavioralSummary}
      />
    ),
  },
  {
    title: "Information needs",
    helper: "What categories of information does the agent need to make valid decisions? (Not task-specific.)",
    Body: () => (
      <OptionStep
        stepKey="informationNeeds"
        aiSuggest={suggestInformationNeeds}
        common={GENERIC_INFORMATION_NEEDS}
        customPlaceholder="Other required information…"
        generatedTitle="Required explicit information"
        generate={generateRequiredInfo}
      />
    ),
  },
  {
    title: "Constraints & forbidden assumptions",
    helper: "Bound the agent. Define what it cannot know, assume, or infer unless the interface communicates it.",
    Body: Step6Constraints,
  },
  {
    title: "Friction triggers",
    helper: "What creates hesitation, confusion, distrust, or fatigue for this user?",
    Body: () => (
      <OptionStep
        stepKey="frictionTriggers"
        aiSuggest={suggestFrictionTriggers}
        common={GENERIC_FRICTION_TRIGGERS}
        customPlaceholder="Other friction trigger…"
        generatedTitle="Behavioral rules"
        generate={generateFrictionRules}
      />
    ),
  },
  {
    title: "Emotional & trust behavior",
    helper: "How does the user's emotional state evolve through friction?",
    Body: () => (
      <OptionStep
        stepKey="emotionalBehavior"
        aiSuggest={suggestEmotionalBehaviors}
        common={GENERIC_EMOTIONAL_BEHAVIORS}
        customPlaceholder="Other emotional behavior…"
        generatedTitle="Emotional progression rules"
        generate={generateEmotionalProgression}
      />
    ),
  },
  {
    title: "Abandonment & escalation",
    helper: "When does the user stop, escalate, ask for help, or finish with low confidence?",
    Body: () => (
      <OptionStep
        stepKey="abandonmentRules"
        aiSuggest={suggestAbandonmentRules}
        common={GENERIC_ABANDONMENT_RULES}
        customPlaceholder="Other abandonment or escalation rule…"
        generatedTitle="Abandonment & escalation rules"
        generate={generateAbandonmentRules}
      />
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
