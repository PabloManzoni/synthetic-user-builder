import SelectableOption from "./SelectableOption";
import CustomOptionInput from "./CustomOptionInput";
import AiEmptyHint from "./AiEmptyHint";

function GroupHeader({ title, tone }: { title: string; tone?: string }) {
  return (
    <h4
      className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider"
      style={{ color: tone ?? "var(--color-ink-faint)" }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: tone ?? "var(--color-border-strong)" }} />
      {title}
    </h4>
  );
}

export default function OptionGroup({
  aiOptions,
  commonOptions,
  selected,
  custom,
  onToggle,
  onAddCustom,
  onRemoveCustom,
  type = "checkbox",
  customPlaceholder = "Add your own…",
  aiEmptyHint,
}: {
  aiOptions: string[];
  commonOptions: string[];
  selected: string[];
  custom: string[];
  onToggle: (value: string) => void;
  onAddCustom: (value: string) => void;
  onRemoveCustom: (value: string) => void;
  type?: "checkbox" | "radio";
  customPlaceholder?: string;
  aiEmptyHint?: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      <section>
        <GroupHeader title="Custom" />
        {custom.length > 0 && (
          <div className="mb-2 space-y-2">
            {custom.map((o) => (
              <SelectableOption
                key={o}
                label={o}
                source="custom"
                type={type}
                selected={selected.includes(o)}
                onToggle={() => onToggle(o)}
                onRemove={() => onRemoveCustom(o)}
              />
            ))}
          </div>
        )}
        <CustomOptionInput placeholder={customPlaceholder} onAdd={onAddCustom} />
      </section>

      <section className="border-t pt-6" style={{ borderColor: "var(--color-border)" }}>
        <GroupHeader title="AI suggested" tone="var(--color-info)" />
        {aiOptions.length ? (
          <div className="space-y-2">
            {aiOptions.map((o) => (
              <SelectableOption
                key={o}
                label={o}
                source="ai"
                type={type}
                selected={selected.includes(o)}
                onToggle={() => onToggle(o)}
              />
            ))}
          </div>
        ) : (
          aiEmptyHint ?? <AiEmptyHint />
        )}
      </section>

      <section className="border-t pt-6" style={{ borderColor: "var(--color-border)" }}>
        <GroupHeader title="Common" />
        <div className="space-y-2">
          {commonOptions
            .filter((o) => !aiOptions.includes(o))
            .map((o) => (
              <SelectableOption
                key={o}
                label={o}
                source="common"
                type={type}
                selected={selected.includes(o)}
                onToggle={() => onToggle(o)}
              />
            ))}
        </div>
      </section>
    </div>
  );
}
