import { useWizardNav } from "../state/nav";

/**
 * Shown where AI suggestions would appear but are empty because an earlier step
 * (product context) wasn't filled. Links back to that step.
 */
export default function AiEmptyHint({ what = "AI suggestions" }: { what?: string }) {
  const go = useWizardNav();
  return (
    <p
      className="rounded-lg border border-dashed px-3 py-2.5 text-xs leading-snug text-[var(--color-ink-faint)]"
      style={{ borderColor: "var(--color-border)" }}
    >
      Add a product in{" "}
      <button
        type="button"
        onClick={() => go(0)}
        className="font-medium text-[var(--color-info)] underline underline-offset-2"
      >
        Product context
      </button>{" "}
      to see {what} here. You can also use the common options below.
    </p>
  );
}
