import { AI_ONLINE, HOSTED_BUILDER_URL } from "../lib/aiMode";

/**
 * Thin notice shown only on local runs, where the AI backend doesn't exist and
 * suggestion buttons run the deterministic rule engine instead. Keeps the UI
 * honest and offers the one-click path to real AI suggestions.
 */
export default function OfflineAiBanner() {
  if (AI_ONLINE) return null;
  return (
    <div
      className="flex items-center justify-center gap-2 border-b px-4 py-1.5 text-[11px]"
      style={{
        borderColor: "var(--color-border)",
        background: "var(--color-surface-2)",
        color: "var(--color-ink-faint)",
      }}
    >
      <span aria-hidden>⚡</span>
      <span>
        Running locally — suggestion buttons use the built-in rule engine, not AI.
      </span>
      <a
        href={HOSTED_BUILDER_URL}
        target="_blank"
        rel="noreferrer"
        className="font-medium underline underline-offset-2"
        style={{ color: "var(--color-info)" }}
      >
        Open the online builder for AI suggestions →
      </a>
    </div>
  );
}
