import { motion } from "framer-motion";
import type { Confidence } from "../state/types";

type Source = "ai" | "common" | "custom";

const tag: Record<Source, { label: string; color: string } | null> = {
  ai: { label: "AI suggested", color: "var(--color-info)" },
  common: { label: "Common", color: "var(--color-ink-faint)" },
  custom: null,
};

export default function SelectableOption({
  label,
  selected,
  onToggle,
  source,
  type = "checkbox",
  confidence,
  onRemove,
}: {
  label: string;
  selected: boolean;
  onToggle: () => void;
  source: Source;
  type?: "checkbox" | "radio";
  confidence?: Confidence;
  onRemove?: () => void;
}) {
  const t = tag[source];
  return (
    <motion.button
      type="button"
      onClick={onToggle}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.12, ease: [0.4, 0, 0.2, 1] }}
      aria-pressed={selected}
      className="group flex w-full items-start gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors"
      style={{
        borderColor: selected ? "var(--color-accent)" : "var(--color-border)",
        background: selected ? "var(--color-accent-soft)" : "var(--color-surface-2)",
      }}
    >
      <span
        className="mt-0.5 flex h-4.5 w-4.5 shrink-0 items-center justify-center border text-[10px]"
        style={{
          borderRadius: type === "radio" ? "999px" : "5px",
          borderColor: selected ? "var(--color-accent)" : "var(--color-border-strong)",
          background: selected ? "var(--color-accent)" : "transparent",
          color: "#0b0d10",
          width: "18px",
          height: "18px",
        }}
        aria-hidden
      >
        {selected ? "✓" : ""}
      </span>
      <span className="flex-1">
        <span className="text-sm text-[var(--color-ink)]">{label}</span>
        <span className="mt-1 flex items-center gap-2">
          {t && (
            <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: t.color }}>
              {t.label}
            </span>
          )}
          {confidence && (
            <span className="text-[10px] uppercase tracking-wide text-[var(--color-ink-faint)]">
              {confidence} confidence
            </span>
          )}
        </span>
      </span>
      {source === "custom" && onRemove && (
        <span
          role="button"
          tabIndex={0}
          onClick={(ev) => {
            ev.stopPropagation();
            onRemove();
          }}
          onKeyDown={(ev) => {
            if (ev.key === "Enter") {
              ev.stopPropagation();
              onRemove();
            }
          }}
          className="shrink-0 rounded-md px-1.5 text-sm text-[var(--color-ink-faint)] hover:text-[var(--color-action)]"
          aria-label={`Remove ${label}`}
        >
          ✕
        </span>
      )}
    </motion.button>
  );
}
