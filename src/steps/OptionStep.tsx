import { useEffect, useRef } from "react";
import { useProfile, type OptionKey } from "../state/profileStore";
import { useOptionStep } from "../lib/useOptionStep";
import OptionGroup from "../components/OptionGroup";
import WarningBanner from "../components/WarningBanner";
import { recommendedFor } from "../ai/mockAi";
import type { ProductContext } from "../state/types";

// Map the step's slice key to the AI suggestion category for "Select for me".
const RECO_KEY: Record<string, Parameters<typeof recommendedFor>[1] | undefined> = {
  decisionBehavior: "decisionBehaviors",
  informationNeeds: "informationNeeds",
  forbiddenAssumptions: "forbiddenAssumptions",
  frictionTriggers: "frictionTriggers",
  emotionalBehavior: "emotionalBehaviors",
  abandonmentRules: "abandonmentRules",
};

export default function OptionStep({
  stepKey,
  aiSuggest,
  common,
  customPlaceholder,
  generatedTitle,
  generate,
  type = "checkbox",
  warnIfEmpty,
  aiEmptyHint,
}: {
  stepKey: OptionKey;
  aiSuggest: (ctx: ProductContext) => string[];
  common: string[];
  customPlaceholder: string;
  generatedTitle: string;
  generate: (selected: string[], custom: string[]) => string;
  type?: "checkbox" | "radio";
  warnIfEmpty?: string;
  aiEmptyHint?: React.ReactNode;
}) {
  const { profile } = useProfile();
  const { slice, selected, custom, toggle, addCustom, removeCustom, setGenerated, setSelected } =
    useOptionStep(stepKey);
  const aiOptions = aiSuggest(profile.productContext);

  // Keep generated text in sync with selections, but never clobber manual edits.
  // Generate only from selected values (custom chips count once they are selected).
  const effective = Array.from(new Set(selected));
  const lastAuto = useRef(slice.generated);
  useEffect(() => {
    const next = generate(effective, []);
    if (slice.generated === lastAuto.current || slice.generated === "") {
      setGenerated(next);
      lastAuto.current = next;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected.join("|")]);

  const total = effective.length;

  // AI picks a curated SUBSET (not every option), replacing the selection but
  // keeping custom values the user added that aren't part of the recommendation.
  const selectForMe = () => {
    const recoKey = RECO_KEY[stepKey];
    const chosen = recoKey ? recommendedFor(profile.productContext, recoKey, aiOptions) : aiOptions;
    const customStillSelected = custom.filter((c) => selected.includes(c) && !chosen.includes(c));
    setSelected([...chosen, ...customStillSelected]);
  };

  return (
    <>
      {warnIfEmpty && total === 0 && <WarningBanner tone="danger">{warnIfEmpty}</WarningBanner>}

      <OptionGroup
        aiOptions={aiOptions}
        commonOptions={common}
        selected={selected}
        custom={custom}
        type={type}
        onToggle={toggle}
        onAddCustom={addCustom}
        onRemoveCustom={removeCustom}
        onSelectForMe={aiOptions.length > 0 ? selectForMe : undefined}
        onRegenerate={() => { /* mock: suggestions are deterministic per context */ }}
        customPlaceholder={customPlaceholder}
        aiEmptyHint={aiEmptyHint}
      />

      {total > 0 && (
        <div className="rounded-xl border px-4 py-3" style={{ borderColor: "var(--color-border)", background: "var(--color-surface-2)" }}>
          <div className="mb-1.5 flex items-center justify-between">
            <h4 className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-info)]">
              {generatedTitle}
            </h4>
            <button
              type="button"
              onClick={() => {
                const next = generate(effective, []);
                setGenerated(next);
                lastAuto.current = next;
              }}
              className="text-[11px] font-medium text-[var(--color-info)] hover:underline"
            >
              ↻ Regenerate
            </button>
          </div>
          <textarea
            value={slice.generated}
            onChange={(e) => setGenerated(e.target.value)}
            rows={Math.min(8, Math.max(3, slice.generated.split("\n").length))}
            className="w-full resize-none bg-transparent text-[13px] leading-relaxed text-[var(--color-ink)] outline-none"
          />
        </div>
      )}
    </>
  );
}
