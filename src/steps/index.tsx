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
          desc: "Slide each bar toward how this user usually acts.",
          done: Object.keys(profile.behaviorAxes).length > 0,
          render: () => <BehaviorAxes />,
        },
        {
          key: "emotional",
          title: "Emotional & trust",
          desc: "How their mood and trust change as they run into problems.",
          done: hasData(profile.emotionalBehavior),
          render: () => (
            <OptionStep
              stepKey="emotionalBehavior"
              aiSuggest={suggestEmotionalBehaviors}
              common={GENERIC_EMOTIONAL_BEHAVIORS}
              customPlaceholder="Other emotional behavior…"
              generatedTitle="Mood & trust rules"
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
          desc: "How much this user needs to see on screen before they'll act.",
          done: hasData(profile.informationNeeds),
          render: () => (
            <OptionStep
              stepKey="informationNeeds"
              aiSuggest={suggestInformationNeeds}
              common={GENERIC_INFORMATION_NEEDS}
              customPlaceholder="Other thing they need to see…"
              generatedTitle="What they need to see"
              generate={generateRequiredInfo}
              intensity={{
                leftLabel: "Just the basics",
                rightLabel: "Wants everything",
                levelDescs: [
                  "Acts on just a couple of key things.",
                  "Needs a few basics.",
                  "Needs a fair amount before deciding.",
                  "Wants most details spelled out.",
                  "Won't act until everything is spelled out.",
                ],
              }}
            />
          ),
        },
        {
          key: "constraints",
          title: "Limits",
          desc: "How closely this user sticks to only what's on screen.",
          done: hasData(profile.constraints),
          render: () => (
            <OptionStep
              stepKey="constraints"
              aiSuggest={() => []}
              common={GENERIC_CONSTRAINTS}
              customPlaceholder="Other limit…"
              generatedTitle="Their limits"
              generate={joinRules(generateConstraintRule)}
              intensity={{
                leftLabel: "Few limits",
                rightLabel: "Strict limits",
                levelDescs: [
                  "Few limits — fills gaps on their own.",
                  "A few limits.",
                  "Mostly sticks to what's shown.",
                  "Sticks closely to what's shown.",
                  "Uses only what's on screen, nothing else.",
                ],
              }}
            />
          ),
        },
        {
          key: "forbidden",
          title: "What they won't guess",
          desc: "The most important part: what this user should never assume if the screen doesn't show it.",
          done: hasData(profile.forbiddenAssumptions),
          render: () => (
            <OptionStep
              stepKey="forbiddenAssumptions"
              aiSuggest={suggestForbiddenAssumptions}
              common={GENERIC_FORBIDDEN_ASSUMPTIONS}
              customPlaceholder="Other thing they won't guess…"
              generatedTitle="Things they won't guess"
              generate={joinRules(generateForbiddenRule)}
              warnIfEmpty="Without these, the user will just guess to fill the gaps and the test won't be realistic. Add a few things they should never assume."
              aiEmptyHint={<AiEmptyHint what="AI-suggested things they won't guess" />}
              intensity={{
                leftLabel: "Guesses freely",
                rightLabel: "Never guesses",
                levelDescs: [
                  "Guesses freely — only the obvious is off-limits.",
                  "Guesses sometimes.",
                  "Avoids the riskier guesses.",
                  "Rarely guesses anything that isn't shown.",
                  "Never guesses — trusts only what's on screen.",
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
          title: "What trips them up",
          desc: "What makes this user hesitate, get confused, or lose trust.",
          done: hasData(profile.frictionTriggers),
          render: () => (
            <OptionStep
              stepKey="frictionTriggers"
              aiSuggest={suggestFrictionTriggers}
              common={GENERIC_FRICTION_TRIGGERS}
              customPlaceholder="Other thing that trips them up…"
              generatedTitle="How they react"
              generate={generateFrictionRules}
            />
          ),
        },
        {
          key: "abandonment",
          title: "When they stop or ask for help",
          desc: "When they give up, ask for help, or finish unsure.",
          done: hasData(profile.abandonmentRules),
          render: () => (
            <OptionStep
              stepKey="abandonmentRules"
              aiSuggest={suggestAbandonmentRules}
              common={GENERIC_ABANDONMENT_RULES}
              customPlaceholder="Other thing that makes them stop or ask…"
              generatedTitle="When they stop or ask for help"
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
      "Which product will this synthetic user use? Tell us about it so we can predict the right roles and problems. Search for it, describe it, or skip.",
    Body: Step1ProductContext,
  },
  {
    title: "Role",
    helper: "Who is this user? Pick one or more roles — how they relate to the product, not a single task.",
    Body: Step2Role,
  },
  {
    title: "Expertise & familiarity",
    helper: "What this user knows — and, just as important, what they don't.",
    Body: Step3Expertise,
  },
  {
    title: "Behavior & trust",
    helper: "How this user makes decisions, and how their trust and mood change when things get hard.",
    Body: BehaviorStep,
  },
  {
    title: "Information & limits",
    helper: "What this user needs to see on screen, and what they should never guess on their own.",
    Body: InfoLimitsStep,
  },
  {
    title: "Friction & breaking points",
    helper: "What slows this user down or breaks their trust — and when they give up or ask for help.",
    Body: FrictionStep,
  },
  {
    title: "Task suitability",
    helper: "Where does this user fit — and where don't they? This isn't about one specific task.",
    Body: Step10TaskSuitability,
  },
  {
    title: "Validation",
    helper: "A quick health check of your profile. You can always export, even with warnings.",
    Body: ValidationPanel,
  },
  {
    title: "Export",
    helper: "Save and share the profile. It describes the user only — no specific task or screen steps.",
    Body: ExportPanel,
  },
];
