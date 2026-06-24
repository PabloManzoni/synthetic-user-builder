import OptionStep from "./OptionStep";
import Step1ProductContext from "./Step1ProductContext";
import Step2Role from "./Step2Role";
import Step3Expertise from "./Step3Expertise";
import Step10TaskSuitability from "./Step10TaskSuitability";
import ValidationPanel from "../components/ValidationPanel";
import ExportPanel from "../components/ExportPanel";
import AiEmptyHint from "../components/AiEmptyHint";
import BehaviorAxes from "../components/BehaviorAxes";
import MultiSection from "../components/MultiSection";
import { useProfile } from "../state/profileStore";
import { BEHAVIOR_AXES } from "../ai/behaviorAxes";
import { randomSubset } from "../lib/random";
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

const hasData = (s: { selected: string[]; custom: string[] }) => s.selected.length > 0 || s.custom.length > 0;

function BehaviorStep() {
  const { profile, dispatch } = useProfile();
  const randomizeAll = () => {
    BEHAVIOR_AXES.forEach((a) =>
      dispatch({ type: "setBehaviorAxis", key: a.key, value: Math.floor(Math.random() * 5) })
    );
    dispatch({ type: "setSelected", key: "emotionalBehavior", values: randomSubset(GENERIC_EMOTIONAL_BEHAVIORS) });
  };
  return (
    <MultiSection
      onRandomize={randomizeAll}
      sections={[
        {
          key: "decision",
          title: "Decision behavior",
          desc: "Slide each axis toward how this user tends to act. No contradictory picks.",
          done: Object.keys(profile.behaviorAxes).length > 0,
          render: () => <BehaviorAxes />,
        },
        {
          key: "emotional",
          title: "Emotional & trust",
          desc: "How their emotional state and trust evolve through friction.",
          done: hasData(profile.emotionalBehavior),
          render: () => (
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
      ]}
    />
  );
}

function InfoLimitsStep() {
  const { profile, dispatch } = useProfile();
  const randomizeAll = () => {
    dispatch({ type: "setSelected", key: "informationNeeds", values: randomSubset(GENERIC_INFORMATION_NEEDS) });
    dispatch({ type: "setSelected", key: "constraints", values: randomSubset(GENERIC_CONSTRAINTS, 2, 4) });
    dispatch({ type: "setSelected", key: "forbiddenAssumptions", values: randomSubset(GENERIC_FORBIDDEN_ASSUMPTIONS, 4, 7) });
  };
  return (
    <MultiSection
      onRandomize={randomizeAll}
      sections={[
        {
          key: "info",
          title: "Information needs",
          desc: "How much explicit information the agent needs before it will decide.",
          done: hasData(profile.informationNeeds),
          render: () => (
            <OptionStep
              stepKey="informationNeeds"
              aiSuggest={suggestInformationNeeds}
              common={GENERIC_INFORMATION_NEEDS}
              customPlaceholder="Other required information…"
              generatedTitle="Required explicit information"
              generate={generateRequiredInfo}
              intensity={{
                leftLabel: "Just essentials",
                rightLabel: "Full context",
                levelDescs: [
                  "Decides on a couple of key signals.",
                  "Needs a light set of core information.",
                  "Needs a balanced set to decide confidently.",
                  "Wants most relevant information made explicit.",
                  "Demands comprehensive, fully explicit information.",
                ],
              }}
            />
          ),
        },
        {
          key: "constraints",
          title: "Constraints",
          desc: "How tightly the agent is bound to what's on screen.",
          done: hasData(profile.constraints),
          render: () => (
            <OptionStep
              stepKey="constraints"
              aiSuggest={() => []}
              common={GENERIC_CONSTRAINTS}
              customPlaceholder="Other constraint…"
              generatedTitle="Generated constraints"
              generate={joinRules(generateConstraintRule)}
              intensity={{
                leftLabel: "Loosely bound",
                rightLabel: "Fully bound",
                levelDescs: [
                  "Loosely bound — few hard limits.",
                  "Lightly bound.",
                  "Moderately bound to visible information.",
                  "Tightly bound to what the screen shows.",
                  "Fully bound — decides only from on-screen information.",
                ],
              }}
            />
          ),
        },
        {
          key: "forbidden",
          title: "Forbidden assumptions",
          desc: "The most important part: how strict the agent is about not assuming what isn't shown.",
          done: hasData(profile.forbiddenAssumptions),
          render: () => (
            <OptionStep
              stepKey="forbiddenAssumptions"
              aiSuggest={suggestForbiddenAssumptions}
              common={GENERIC_FORBIDDEN_ASSUMPTIONS}
              customPlaceholder="Other forbidden assumption…"
              generatedTitle="Generated forbidden rules"
              generate={joinRules(generateForbiddenRule)}
              warnIfEmpty="This profile is likely too weak. Add forbidden assumptions to prevent the synthetic user from compensating for missing interface information."
              aiEmptyHint={<AiEmptyHint what="AI-suggested forbidden assumptions" />}
              intensity={{
                leftLabel: "Lenient",
                rightLabel: "Maximally strict",
                levelDescs: [
                  "Lenient — only the most basic things can't be assumed.",
                  "Light guardrails on assumptions.",
                  "Balanced — won't assume the common risky things.",
                  "Strict — assumes almost nothing that isn't shown.",
                  "Maximally strict — assumes nothing the interface doesn't show.",
                ],
              }}
            />
          ),
        },
      ]}
    />
  );
}

function FrictionStep() {
  const { profile, dispatch } = useProfile();
  const randomizeAll = () => {
    dispatch({ type: "setSelected", key: "frictionTriggers", values: randomSubset(GENERIC_FRICTION_TRIGGERS) });
    dispatch({ type: "setSelected", key: "abandonmentRules", values: randomSubset(GENERIC_ABANDONMENT_RULES) });
  };
  return (
    <MultiSection
      onRandomize={randomizeAll}
      sections={[
        {
          key: "friction",
          title: "Friction triggers",
          desc: "What creates hesitation, confusion, distrust, or fatigue.",
          done: hasData(profile.frictionTriggers),
          render: () => (
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
          key: "abandonment",
          title: "Abandonment & escalation",
          desc: "When they stop, escalate, ask for help, or finish with low confidence.",
          done: hasData(profile.abandonmentRules),
          render: () => (
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
      ]}
    />
  );
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
    Body: BehaviorStep,
  },
  {
    title: "Information & limits",
    helper: "What the agent must see, what bounds it, and what it can't assume unless the interface shows it.",
    Body: InfoLimitsStep,
  },
  {
    title: "Friction & breaking points",
    helper: "What creates hesitation or distrust — and when the user stops, escalates, or finishes unsure.",
    Body: FrictionStep,
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
