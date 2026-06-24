import { useProfile } from "../state/profileStore";
import { suggestSuitableTasks } from "../ai/mockAi";
import { GENERIC_SUITABLE_TASKS, GENERIC_UNSUITABLE_TASKS } from "../ai/genericOptions";
import SelectableOption from "../components/SelectableOption";
import CustomOptionInput from "../components/CustomOptionInput";
import AiFillButton from "../components/AiFillButton";

export default function Step10TaskSuitability() {
  const { profile, dispatch } = useProfile();
  const t = profile.taskSuitability;
  const aiSuitable = suggestSuitableTasks(profile.productContext);

  const toggle = (field: "suitable" | "unsuitable", value: string) =>
    dispatch({ type: "toggleTask", field, value });

  const addCustom = (field: "customSuitable" | "customUnsuitable", value: string) => {
    const v = value.trim();
    if (!v || t[field].includes(v)) return;
    dispatch({ type: "patchTaskSuitability", patch: { [field]: [...t[field], v] } });
  };
  const removeCustom = (field: "customSuitable" | "customUnsuitable", value: string) =>
    dispatch({ type: "patchTaskSuitability", patch: { [field]: t[field].filter((x) => x !== value) } });

  return (
    <div className="space-y-7">
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold" style={{ color: "var(--color-ok)" }}>Suitable task types</h3>
          {aiSuitable.length > 0 && (
            <AiFillButton
              variant="ai"
              label="Select for me"
              onClick={() =>
                dispatch({
                  type: "patchTaskSuitability",
                  patch: { suitable: [...aiSuitable, ...t.customSuitable.filter((c) => t.suitable.includes(c))] },
                })
              }
            />
          )}
        </div>
        {aiSuitable.length > 0 && (
          <div className="space-y-2">
            {aiSuitable.map((o) => (
              <SelectableOption key={o} label={o} source="ai" selected={t.suitable.includes(o)} onToggle={() => toggle("suitable", o)} />
            ))}
          </div>
        )}
        <div className="space-y-2">
          {GENERIC_SUITABLE_TASKS.map((o) => (
            <SelectableOption key={o} label={o} source="common" selected={t.suitable.includes(o)} onToggle={() => toggle("suitable", o)} />
          ))}
        </div>
        {t.customSuitable.map((o) => (
          <SelectableOption key={o} label={o} source="custom" selected onToggle={() => removeCustom("customSuitable", o)} onRemove={() => removeCustom("customSuitable", o)} />
        ))}
        <CustomOptionInput placeholder="Other suitable task type…" onAdd={(v) => addCustom("customSuitable", v)} />
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-[var(--color-ink-soft)]">Unsuitable task types</h3>
        <div className="space-y-2">
          {GENERIC_UNSUITABLE_TASKS.map((o) => (
            <SelectableOption key={o} label={o} source="common" selected={t.unsuitable.includes(o)} onToggle={() => toggle("unsuitable", o)} />
          ))}
        </div>
        {t.customUnsuitable.map((o) => (
          <SelectableOption key={o} label={o} source="custom" selected onToggle={() => removeCustom("customUnsuitable", o)} onRemove={() => removeCustom("customUnsuitable", o)} />
        ))}
        <CustomOptionInput placeholder="Other unsuitable task type…" onAdd={(v) => addCustom("customUnsuitable", v)} />
      </section>
    </div>
  );
}
