// A 5-stop spectrum control between two poles. Shared by the behavior axes and
// the Information & limits intensity sliders so they look and feel identical.
export default function SpectrumSlider({
  leftLabel,
  rightLabel,
  value,
  onSelect,
  description,
  touched = true,
}: {
  leftLabel: string;
  rightLabel: string;
  value: number;
  onSelect: (i: number) => void;
  description?: string;
  touched?: boolean;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-[12px] font-medium text-[var(--color-ink-soft)]">
        <span>{leftLabel}</span>
        <span>{rightLabel}</span>
      </div>
      <div className="flex items-center gap-1.5">
        {[0, 1, 2, 3, 4].map((i) => {
          const active = touched && i === value;
          return (
            <button
              key={i}
              type="button"
              onClick={() => onSelect(i)}
              aria-label={`${leftLabel}–${rightLabel}: ${i + 1} of 5`}
              className="group flex h-7 flex-1 items-center justify-center rounded-md border transition-colors"
              style={{
                borderColor: active ? "var(--color-accent)" : "var(--color-border)",
                background: active ? "var(--color-accent)" : "var(--color-surface-2)",
              }}
            >
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ background: active ? "#0b0d10" : "var(--color-border-strong)" }}
              />
            </button>
          );
        })}
      </div>
      {description && (
        <p
          className="mt-1.5 text-[12px] leading-snug"
          style={{ color: touched ? "var(--color-ink-soft)" : "var(--color-ink-faint)" }}
        >
          {description}
        </p>
      )}
    </div>
  );
}
