import { useEffect, useRef, useState } from "react";
import { useProfile, type OptionKey, type SuggestionCategory } from "../state/profileStore";
import { useOptionStep } from "../lib/useOptionStep";
import OptionGroup from "../components/OptionGroup";
import SpectrumSlider from "../components/SpectrumSlider";
import WarningBanner from "../components/WarningBanner";
import { recommendedFor } from "../ai/mockAi";
import { refineField } from "../ai/aiClient";
import type { ProductContext } from "../state/types";

export interface IntensityConfig {
  leftLabel: string;
  rightLabel: string;
  /** One short description per slider stop (low → high). */
  levelDescs: [string, string, string, string, string];
}

// Cumulative bundle sizes for the 5 slider stops, given a pool of n items.
function levelCounts(n: number): number[] {
  if (n <= 1) return [n, n, n, n, n];
  const c = [0.15, 0.3, 0.5, 0.75, 1].map((f) => Math.max(1, Math.round(n * f)));
  for (let i = 1; i < c.length; i++) if (c[i] < c[i - 1]) c[i] = c[i - 1];
  c[c.length - 1] = n;
  return c;
}

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
  intensity,
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
  /** When set, the section leads with an intensity slider and collapses the item lists. */
  intensity?: IntensityConfig;
}) {
  const { profile, dispatch } = useProfile();
  const { slice, selected, custom, toggle, addCustom, removeCustom, setGenerated, setSelected } =
    useOptionStep(stepKey);
  const aiOptions = aiSuggest(profile.productContext);
  const [regenerating, setRegenerating] = useState(false);
  const [showItems, setShowItems] = useState(false);

  // Context-aware regenerate: re-query Gemini using everything chosen so far.
  const regenerate = async () => {
    const cat = RECO_KEY[stepKey] as SuggestionCategory | undefined;
    if (!cat) return;
    setRegenerating(true);
    const res = await refineField(profile, cat);
    if (res?.suggestions) {
      dispatch({
        type: "setCategorySuggestions",
        category: cat,
        suggestions: res.suggestions,
        recommended: res.recommended ?? [],
      });
    }
    setRegenerating(false);
  };

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

  // Intensity slider: 5 stops map to cumulative bundles drawn from the pool
  // (AI-suggested items first, then common). Lets the user set "how much" in one
  // click instead of ticking many boxes; the item lists stay available to fine-tune.
  const pool = Array.from(new Set([...aiOptions, ...common]));
  const counts = levelCounts(pool.length);
  const poolSelected = selected.filter((s) => pool.includes(s)).length;
  let level = counts.indexOf(poolSelected);
  if (level === -1 && poolSelected > 0) {
    level = counts.reduce(
      (best, c, i) => (Math.abs(c - poolSelected) < Math.abs(counts[best] - poolSelected) ? i : best),
      0
    );
  }
  const levelTouched = poolSelected > 0;
  const setLevel = (i: number) => {
    const customSelected = custom.filter((c) => selected.includes(c));
    setSelected([...pool.slice(0, counts[i]), ...customSelected]);
  };

  // AI picks a curated SUBSET (not every option), replacing the selection but
  // keeping custom values the user added that aren't part of the recommendation.
  const selectForMe = () => {
    const recoKey = RECO_KEY[stepKey];
    const chosen = recoKey ? recommendedFor(profile.productContext, recoKey, aiOptions, common) : aiOptions;
    const customStillSelected = custom.filter((c) => selected.includes(c) && !chosen.includes(c));
    setSelected([...chosen, ...customStillSelected]);
  };

  // Pick a random handful from the available pool (works even with no AI context).
  const randomize = () => {
    const pool = Array.from(new Set([...aiOptions, ...common]));
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    const count = Math.min(pool.length, 3 + Math.floor(Math.random() * 3)); // 3–5
    const customStillSelected = custom.filter((c) => selected.includes(c));
    setSelected([...shuffled.slice(0, count), ...customStillSelected]);
  };

  return (
    <>
      {warnIfEmpty && total === 0 && <WarningBanner tone="danger">{warnIfEmpty}</WarningBanner>}

      {intensity ? (
        <>
          <div
            className="rounded-xl border px-4 py-3.5"
            style={{ borderColor: "var(--color-border)", background: "var(--color-surface-2)" }}
          >
            <SpectrumSlider
              leftLabel={intensity.leftLabel}
              rightLabel={intensity.rightLabel}
              value={level === -1 ? 2 : level}
              touched={levelTouched}
              description={
                levelTouched
                  ? `${intensity.levelDescs[level]} · ${poolSelected} selected`
                  : "Set how much this matters in one move — or fine-tune the exact items below."
              }
              onSelect={setLevel}
            />
          </div>

          <div>
            <button
              type="button"
              onClick={() => setShowItems((v) => !v)}
              className="text-[12px] font-medium text-[var(--color-ink-faint)] transition-colors hover:text-[var(--color-ink-soft)]"
            >
              {showItems ? "▾ Hide individual items" : `▸ Fine-tune individual items${total ? ` (${total} selected)` : ""}`}
            </button>
            {showItems && (
              <div className="mt-4">
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
                  onRandomize={common.length > 0 ? randomize : undefined}
                  onRegenerate={RECO_KEY[stepKey] ? regenerate : undefined}
                  regenerating={regenerating}
                  customPlaceholder={customPlaceholder}
                  aiEmptyHint={aiEmptyHint}
                />
              </div>
            )}
          </div>
        </>
      ) : (
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
          onRandomize={common.length > 0 ? randomize : undefined}
          onRegenerate={RECO_KEY[stepKey] ? regenerate : undefined}
          regenerating={regenerating}
          customPlaceholder={customPlaceholder}
          aiEmptyHint={aiEmptyHint}
        />
      )}

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
            rows={Math.min(12, Math.max(5, slice.generated.split("\n").length))}
            className="w-full resize-none bg-transparent text-[13px] leading-relaxed text-[var(--color-ink)] outline-none"
          />
        </div>
      )}
    </>
  );
}
