import { motion } from "framer-motion";

const STEPS = [
  "Product context",
  "Role",
  "Expertise",
  "Behavior & trust",
  "Information & limits",
  "Friction & breaking points",
  "Task suitability",
  "Validation",
  "Export",
];

// Explains what a synthetic user is, the framework behind the wizard, and where
// the approach comes from. Read-only; mirrors the ImportModal/NewProfileModal shell.
export default function AboutModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.6)" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.16 }}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[80vh] w-full max-w-2xl overflow-auto rounded-2xl border p-6"
        style={{ background: "var(--color-bg)", borderColor: "var(--color-border-strong)" }}
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-base font-semibold text-[var(--color-ink)]">About Synthetic User Builder</h2>
            <p className="mt-1 text-[12px] text-[var(--color-ink-faint)]">
              What this tool builds, and the framework behind it.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-2 py-1 text-[var(--color-ink-faint)] transition-colors hover:text-[var(--color-ink)]"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="mt-5 space-y-5 text-[13px] leading-relaxed text-[var(--color-ink-soft)]">
          <section>
            <h3 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-info)]">
              What it is
            </h3>
            <p>
              A synthetic user is a <strong className="text-[var(--color-ink)]">constrained decision agent</strong>,
              not a persona. It defines <em>how</em> a person thinks, decides, hesitates, trusts, doubts, assumes
              and gives up — their behavior and limits, never a specific task or screen-by-screen steps. The result
              is reusable: you pair it later with a task objective in a separate simulation tool.
            </p>
          </section>

          <section>
            <h3 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-info)]">
              The framework — 9 steps
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {STEPS.map((s, i) => (
                <span
                  key={s}
                  className="rounded-md border px-2 py-1 text-[12px]"
                  style={{ borderColor: "var(--color-border)", background: "var(--color-surface-2)" }}
                >
                  <span className="text-[var(--color-ink-faint)]">{i + 1}.</span>{" "}
                  <span className="text-[var(--color-ink)]">{s}</span>
                </span>
              ))}
            </div>
            <p className="mt-2">
              Each step adds one dimension of behavior. A health check then scores the profile and flags weak
              spots (for example, no forbidden assumptions) — but export is never blocked.
            </p>
          </section>

          <section>
            <h3 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-info)]">
              Why it's built this way
            </h3>
            <p>
              Most "users" in testing are demographic personas that say nothing about decisions. This tool enforces
              the opposite discipline: describe behavior and constraints, and actively warn when the input drifts
              into navigation or task instructions. That keeps each profile portable across products and tasks.
            </p>
          </section>

          <section>
            <h3 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-info)]">
              Where it comes from
            </h3>
            <p>
              The framework was put together by <strong className="text-[var(--color-ink)]">Pablo</strong>, reading
              across research on synthetic users, constrained decision agents and how real people behave under
              uncertainty — then turning that into a practical, usable implementation. It started as a proof of
              concept and grew by iterating fast with real use.
            </p>
          </section>

          <div className="flex items-center gap-3 border-t pt-4 text-[12px]" style={{ borderColor: "var(--color-border)" }}>
            <a
              href="https://github.com/PabloManzoni/synthetic-user-builder"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--color-info)] underline underline-offset-2 hover:text-[var(--color-ink)]"
            >
              GitHub
            </a>
            <span style={{ color: "var(--color-border)" }}>·</span>
            <a
              href="https://github.com/PabloManzoni/user-simulation"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--color-info)] underline underline-offset-2 hover:text-[var(--color-ink)]"
            >
              Run a profile in the Claude simulator →
            </a>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
