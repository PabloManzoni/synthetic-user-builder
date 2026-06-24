import SelectableOption from "./SelectableOption";
import CustomOptionInput from "./CustomOptionInput";
import AiFillButton from "./AiFillButton";
import AiEmptyHint from "./AiEmptyHint";

function GroupHeader({
  title,
  action,
  tone,
}: {
  title: string;
  action?: React.ReactNode;
  tone?: string;
}) {
  return (
    <div className="mb-2 flex items-center justify-between">
      <h4 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider"
          style={{ color: tone ?? "var(--color-ink-faint)" }}>
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: tone ?? "var(--color-border-strong)" }} />
        {title}
      </h4>
      {action}
    </div>
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
  onRegenerate,
  onSelectForMe,
  onRandomize,
  regenerating = false,
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
  onRegenerate?: () => void;
  onSelectForMe?: () => void;
  onRandomize?: () => void;
  regenerating?: boolean;
  type?: "checkbox" | "radio";
  customPlaceholder?: string;
  aiEmptyHint?: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      <section>
        <GroupHeader
          title="AI suggested"
          tone="var(--color-info)"
          action={
            <span className="flex items-center gap-3">
              {onSelectForMe && aiOptions.length > 0 && (
                <AiFillButton variant="ai" label="Select for me" onClick={onSelectForMe} />
              )}
              {onRegenerate && (
                <button
                  type="button"
                  onClick={onRegenerate}
                  disabled={regenerating}
                  className="text-[11px] font-medium text-[var(--color-info)] hover:underline disabled:opacity-60"
                  title="Re-query using everything you've chosen so far"
                >
                  {regenerating ? "Regenerating…" : "↻ Regenerate"}
                </button>
              )}
            </span>
          }
        />
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
        <GroupHeader
          title="Common"
          action={
            onRandomize && (
              <AiFillButton variant="random" label="Randomize" onClick={onRandomize} />
            )
          }
        />
        <div className="space-y-2">
          {commonOptions.map((o) => (
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

      <section className="border-t pt-6" style={{ borderColor: "var(--color-border)" }}>
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
    </div>
  );
}
