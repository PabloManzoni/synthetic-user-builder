import { STEP_TITLES } from "../state/types";

export type StepStatus = "unvisited" | "attention" | "ready";

const STATUS_TITLE: Record<StepStatus, string> = {
  unvisited: "not visited yet",
  attention: "needs attention",
  ready: "looks good",
};

export default function Stepper({
  current,
  status,
  onJump,
  collapsed = false,
}: {
  current: number;
  status: StepStatus[];
  onJump: (i: number) => void;
  collapsed?: boolean;
}) {
  return (
    <nav className="flex flex-col gap-0.5" aria-label="Steps">
      {STEP_TITLES.map((title, i) => {
        const active = i === current;
        const st = status[i];
        // Circle color reflects status; the active step always uses the accent.
        const ring =
          active
            ? "var(--color-accent)"
            : st === "ready"
              ? "var(--color-ok)"
              : st === "attention"
                ? "var(--color-risk)"
                : "var(--color-border-strong)";
        const fg = active
          ? "#0b0d10"
          : st === "ready"
            ? "var(--color-ok)"
            : st === "attention"
              ? "var(--color-risk)"
              : "var(--color-ink-faint)";
        const content = active ? i + 1 : st === "ready" ? "✓" : st === "attention" ? "!" : i + 1;
        return (
          <button
            key={title}
            type="button"
            onClick={() => onJump(i)}
            title={collapsed ? `${i + 1}. ${title} — ${STATUS_TITLE[st]}` : STATUS_TITLE[st]}
            className={
              "group flex items-center gap-3 rounded-lg py-2 text-left transition-colors " +
              (collapsed ? "justify-center px-0" : "px-2.5")
            }
            style={{ background: active && !collapsed ? "var(--color-surface-2)" : "transparent" }}
          >
            <span
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold transition-colors"
              style={{ borderColor: ring, background: active ? "var(--color-accent)" : "transparent", color: fg }}
            >
              {content}
            </span>
            {!collapsed && (
              <span
                className="text-[13px] leading-tight transition-colors"
                style={{ color: active ? "var(--color-ink)" : "var(--color-ink-soft)" }}
              >
                {title}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}
