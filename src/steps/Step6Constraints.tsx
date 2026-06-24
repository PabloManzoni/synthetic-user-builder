import OptionStep from "./OptionStep";
import { suggestForbiddenAssumptions } from "../ai/mockAi";
import { generateConstraintRule, generateForbiddenRule } from "../ai/mockAi";
import { GENERIC_CONSTRAINTS, GENERIC_FORBIDDEN_ASSUMPTIONS } from "../ai/genericOptions";
import AiEmptyHint from "../components/AiEmptyHint";

const joinRules = (fn: (o: string) => string) => (selected: string[], custom: string[]) =>
  [...selected, ...custom].map(fn).join("\n");

export default function Step6Constraints() {
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
          aiEmptyHint={
            <p
              className="rounded-lg border border-dashed px-3 py-2.5 text-xs leading-snug text-[var(--color-ink-faint)]"
              style={{ borderColor: "var(--color-border)" }}
            >
              Constraints come from the common list below — pick the ones that bound this agent.
            </p>
          }
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
          aiEmptyHint={<AiEmptyHint what="AI-suggested forbidden assumptions" />}
        />
      </div>
    </div>
  );
}
