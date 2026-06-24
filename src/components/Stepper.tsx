import { STEP_TITLES } from "../state/types";

export default function Stepper({
  current,
  done,
  onJump,
}: {
  current: number;
  done: boolean[];
  onJump: (i: number) => void;
}) {
  return (
    <nav className="flex flex-col gap-0.5" aria-label="Steps">
      {STEP_TITLES.map((title, i) => {
        const active = i === current;
        const complete = done[i];
        return (
          <button
            key={title}
            type="button"
            onClick={() => onJump(i)}
            className="group flex items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors"
            style={{ background: active ? "var(--color-surface-2)" : "transparent" }}
          >
            <span
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold transition-colors"
              style={{
                borderColor: active
                  ? "var(--color-accent)"
                  : complete
                    ? "var(--color-ok)"
                    : "var(--color-border-strong)",
                background: active ? "var(--color-accent)" : "transparent",
                color: active ? "#0b0d10" : complete ? "var(--color-ok)" : "var(--color-ink-faint)",
              }}
            >
              {complete && !active ? "✓" : i + 1}
            </span>
            <span
              className="text-[13px] leading-tight transition-colors"
              style={{ color: active ? "var(--color-ink)" : "var(--color-ink-soft)" }}
            >
              {title}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
