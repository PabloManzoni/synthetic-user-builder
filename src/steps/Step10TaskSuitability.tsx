import { useState } from "react";
import { useProfile } from "../state/profileStore";
import { suggestSuitableTasks, recommendedFor } from "../ai/mockAi";
import { refineField } from "../ai/aiClient";
import { GENERIC_SUITABLE_TASKS, GENERIC_UNSUITABLE_TASKS } from "../ai/genericOptions";
import SelectableOption from "../components/SelectableOption";
import CustomOptionInput from "../components/CustomOptionInput";
import AiFillButton from "../components/AiFillButton";
import AiEmptyHint from "../components/AiEmptyHint";
import MultiSection from "../components/MultiSection";

function GroupLabel({ label, tone }: { label: string; tone?: string }) {
  return (
    <div
      className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider"
      style={{ color: tone ?? "var(--color-ink-faint)" }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: tone ?? "var(--color-border-strong)" }} />
      {label}
    </div>
  );
}

export default function Step10TaskSuitability() {
  const { profile, dispatch } = useProfile();
  const t = profile.taskSuitability;
  const aiSuitable = suggestSuitableTasks(profile.productContext);
  const [regenerating, setRegenerating] = useState(false);

  const regenerateSuitable = async () => {
    setRegenerating(true);
    const res = await refineField(profile, "suitableTasks");
    if (res?.suggestions) {
      dispatch({
        type: "setCategorySuggestions",
        category: "suitableTasks",
        suggestions: res.suggestions,
        recommended: res.recommended ?? [],
      });
    }
    setRegenerating(false);
  };

  const toggle = (field: "suitable" | "unsuitable", value: string) =>
    dispatch({ type: "toggleTask", field, value });

  const addCustom = (field: "customSuitable" | "customUnsuitable", value: string) => {
    const v = value.trim();
    if (!v || t[field].includes(v)) return;
    dispatch({ type: "patchTaskSuitability", patch: { [field]: [...t[field], v] } });
  };
  const removeCustom = (field: "customSuitable" | "customUnsuitable", value: string) =>
    dispatch({ type: "patchTaskSuitability", patch: { [field]: t[field].filter((x) => x !== value) } });

  const suitableActions = (
    <div className="flex items-center gap-3">
      <AiFillButton
        variant="random"
        label="Randomize"
        onClick={() => {
          const pool = [...GENERIC_SUITABLE_TASKS].sort(() => Math.random() - 0.5).slice(0, 3 + Math.floor(Math.random() * 2));
          dispatch({ type: "patchTaskSuitability", patch: { suitable: [...pool, ...t.customSuitable.filter((c) => t.suitable.includes(c))] } });
        }}
      />
      {aiSuitable.length > 0 && (
        <button
          type="button"
          onClick={regenerateSuitable}
          disabled={regenerating}
          className="text-[11px] font-medium text-[var(--color-info)] hover:underline disabled:opacity-60"
          title="Re-query using everything you've chosen so far"
        >
          {regenerating ? "Regenerating…" : "↻ Regenerate"}
        </button>
      )}
      {aiSuitable.length > 0 && (
        <AiFillButton
          variant="ai"
          label="Select for me"
          onClick={() => {
            const chosen = recommendedFor(profile.productContext, "suitableTasks", aiSuitable, GENERIC_SUITABLE_TASKS);
            dispatch({
              type: "patchTaskSuitability",
              patch: { suitable: [...chosen, ...t.customSuitable.filter((c) => t.suitable.includes(c))] },
            });
          }}
        />
      )}
    </div>
  );

  return (
    <MultiSection
      sections={[
        {
          key: "suitable",
          title: "Suitable task types",
          titleColor: "var(--color-ok)",
          done: t.suitable.length + t.customSuitable.length > 0,
          actions: suitableActions,
          render: () => (
            <div className="space-y-3">
              <GroupLabel label="Custom" />
              {t.customSuitable.map((o) => (
                <SelectableOption key={o} label={o} source="custom" selected onToggle={() => removeCustom("customSuitable", o)} onRemove={() => removeCustom("customSuitable", o)} />
              ))}
              <CustomOptionInput placeholder="Other suitable task type…" onAdd={(v) => addCustom("customSuitable", v)} />
              <div className="border-t pt-4" style={{ borderColor: "var(--color-border)" }}>
                <GroupLabel label="AI suggested" tone="var(--color-info)" />
                {aiSuitable.length > 0 ? (
                  <div className="space-y-2">
                    {aiSuitable.map((o) => (
                      <SelectableOption key={o} label={o} source="ai" selected={t.suitable.includes(o)} onToggle={() => toggle("suitable", o)} />
                    ))}
                  </div>
                ) : (
                  <AiEmptyHint what="AI-suggested task types" />
                )}
              </div>
              <div className="border-t pt-4" style={{ borderColor: "var(--color-border)" }}>
                <GroupLabel label="Common" />
                <div className="space-y-2">
                  {GENERIC_SUITABLE_TASKS.filter((o) => !aiSuitable.includes(o)).map((o) => (
                    <SelectableOption key={o} label={o} source="common" selected={t.suitable.includes(o)} onToggle={() => toggle("suitable", o)} />
                  ))}
                </div>
              </div>
            </div>
          ),
        },
        {
          key: "unsuitable",
          title: "Unsuitable task types",
          titleColor: "var(--color-ink-soft)",
          done: t.unsuitable.length + t.customUnsuitable.length > 0,
          render: () => (
            <div className="space-y-3">
              <GroupLabel label="Custom" />
              {t.customUnsuitable.map((o) => (
                <SelectableOption key={o} label={o} source="custom" selected onToggle={() => removeCustom("customUnsuitable", o)} onRemove={() => removeCustom("customUnsuitable", o)} />
              ))}
              <CustomOptionInput placeholder="Other unsuitable task type…" onAdd={(v) => addCustom("customUnsuitable", v)} />
              <div className="border-t pt-4" style={{ borderColor: "var(--color-border)" }}>
                <GroupLabel label="Common" />
                <div className="space-y-2">
                  {GENERIC_UNSUITABLE_TASKS.map((o) => (
                    <SelectableOption key={o} label={o} source="common" selected={t.unsuitable.includes(o)} onToggle={() => toggle("unsuitable", o)} />
                  ))}
                </div>
              </div>
            </div>
          ),
        },
      ]}
    />
  );
}
