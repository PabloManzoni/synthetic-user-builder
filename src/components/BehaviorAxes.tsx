import { useProfile } from "../state/profileStore";
import { BEHAVIOR_AXES } from "../ai/behaviorAxes";

// Each behavior axis is a 5-stop spectrum (slider) between two poles — no more
// contradictory checkboxes. Moving any slider commits all axes (others stay balanced).
export default function BehaviorAxes() {
  const { profile, dispatch } = useProfile();
  const axes = profile.behaviorAxes;

  return (
    <div className="space-y-6">
      {BEHAVIOR_AXES.map((a) => {
        const value = axes[a.key] ?? 2;
        const touched = a.key in axes;
        return (
          <div key={a.key}>
            <div className="mb-1.5 flex items-center justify-between text-[12px] font-medium text-[var(--color-ink-soft)]">
              <span>{a.left}</span>
              <span>{a.right}</span>
            </div>
            <div className="flex items-center gap-1.5">
              {[0, 1, 2, 3, 4].map((i) => {
                const active = touched && i === value;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => dispatch({ type: "setBehaviorAxis", key: a.key, value: i })}
                    aria-label={`${a.left}–${a.right}: ${i + 1} of 5`}
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
            <p className="mt-1.5 text-[12px] leading-snug" style={{ color: touched ? "var(--color-ink-soft)" : "var(--color-ink-faint)" }}>
              {a.statements[value]}
            </p>
          </div>
        );
      })}
    </div>
  );
}
