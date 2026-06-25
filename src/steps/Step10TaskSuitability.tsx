import { useState } from "react";
import { useProfile } from "../state/profileStore";
import { suggestSuitableTasks } from "../ai/mockAi";
import { chooseOptions } from "../ai/choose";
import { GENERIC_SUITABLE_TASKS, GENERIC_UNSUITABLE_TASKS } from "../ai/genericOptions";
import SelectableOption from "../components/SelectableOption";
import CustomOptionInput from "../components/CustomOptionInput";
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
  const [choosing, setChoosing] = useState(false);

  const toggle = (field: "suitable" | "unsuitable", value: string) =>
    dispatch({ type: "toggleTask", field, value });

  const addCustom = (field: "customSuitable" | "customUnsuitable", value: string) => {
    const v = value.trim();
    if (!v || t[field].includes(v)) return;
    dispatch({ type: "patchTaskSuitability", patch: { [field]: [...t[field], v] } });
  };
  const removeCustom = (field: "customSuitable" | "customUnsuitable", value: string) =>
    dispatch({ type: "patchTaskSuitability", patch: { [field]: t[field].filter((x) => x !== value) } });

  const chooseAll = async () => {
    setChoosing(true);
    const [suit, unsuit] = await Promise.all([
      chooseOptions(profile, "suitableTasks", GENERIC_SUITABLE_TASKS, 3),
      chooseOptions(profile, "unsuitableTasks", GENERIC_UNSUITABLE_TASKS, 2),
    ]);
    dispatch({
      type: "patchTaskSuitability",
      patch: {
        suitable: [...suit, ...t.customSuitable.filter((c) => t.suitable.includes(c))],
        unsuitable: [...unsuit, ...t.customUnsuitable.filter((c) => t.unsuitable.includes(c))],
      },
    });
    setChoosing(false);
  };

  return (
    <MultiSection
      onChoose={chooseAll}
      choosing={choosing}
      sections={[
        {
          key: "suitable",
          title: "Suitable task types",
          titleColor: "var(--color-ok)",
          done: t.suitable.length + t.customSuitable.length > 0,
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
