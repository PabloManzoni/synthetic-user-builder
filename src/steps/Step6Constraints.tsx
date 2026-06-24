import OptionStep from "./OptionStep";
import { suggestForbiddenAssumptions } from "../ai/mockAi";
import { generateConstraintRule, generateForbiddenRule } from "../ai/mockAi";
import { GENERIC_CONSTRAINTS, GENERIC_FORBIDDEN_ASSUMPTIONS } from "../ai/genericOptions";
import { useWizardNav } from "../state/nav";

const joinRules = (fn: (o: string) => string) => (selected: string[], custom: string[]) =>
  [...selected, ...custom].map(fn).join("\n");

export default function Step6Constraints() {
  const go = useWizardNav();
  return (
    <div className="space-y-8">
      <div className="space-y-6">
        <h3 className="text-sm font-semibold text-[var(--color-ink)]">Constraints</h3>
        <p className="-mt-4 text-[12px] text-[var(--color-ink-faint)]">
          What the agent may and may not rely on.
        </p>
        <OptionStep
          stepKey="constraints"
          aiSuggest={() => []}
          common={GENERIC_CONSTRAINTS}
          customPlaceholder="Other constraint…"
          generatedTitle="Generated constraints"
          generate={joinRules(generateConstraintRule)}
        />
      </div>

      <div className="h-px" style={{ background: "var(--color-border)" }} />

      <div className="space-y-6">
        <h3 className="text-sm font-semibold text-[var(--color-ink)]">Forbidden assumptions</h3>
        <p className="-mt-4 text-[12px] text-[var(--color-ink-faint)]">
          The most important step. What the agent cannot know, assume, or infer unless the interface shows it.
        </p>
        <OptionStep
          stepKey="forbiddenAssumptions"
          aiSuggest={suggestForbiddenAssumptions}
          common={GENERIC_FORBIDDEN_ASSUMPTIONS}
          customPlaceholder="Other forbidden assumption…"
          generatedTitle="Generated forbidden rules"
          generate={joinRules(generateForbiddenRule)}
          warnIfEmpty="This profile is likely too weak. Add forbidden assumptions to prevent the synthetic user from compensating for missing interface information."
          aiEmptyHint={
            <>
              No AI suggestions yet — add product context to get tailored ones.{" "}
              <button
                type="button"
                onClick={() => go(0)}
                className="font-medium text-[var(--color-info)] underline underline-offset-2"
              >
                Go to product context
              </button>
            </>
          }
        />
      </div>
    </div>
  );
}
