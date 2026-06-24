import { useState } from "react";
import { motion } from "framer-motion";
import { useProfile } from "../state/profileStore";
import { useWizardNav } from "../state/nav";
import { validateProfile } from "../lib/validation";
import { type Verdict, STEP_TITLES } from "../state/types";
import WarningBanner from "./WarningBanner";

const color = (v: Verdict) =>
  v === "strong" ? "var(--color-ok)" : v === "invalid" ? "var(--color-action)" : "var(--color-risk)";
const label = (v: Verdict) =>
  v === "strong" ? "Strong" : v === "invalid" ? "Invalid" : "Needs refinement";

export default function ValidationPanel() {
  const { profile, dispatch } = useProfile();
  const go = useWizardNav();
  const [nonce, setNonce] = useState(0); // for "Regenerate"
  const v = validateProfile(profile);
  void nonce;

  const applyFix = (assumption: string) => {
    dispatch({ type: "addCustom", key: "forbiddenAssumptions", value: assumption });
    dispatch({ type: "toggleOption", key: "forbiddenAssumptions", value: assumption });
  };

  return (
    <div className="space-y-5">
      <div
        className="flex items-center justify-between rounded-xl border px-4 py-3"
        style={{ borderColor: "var(--color-border)", background: "var(--color-surface-2)" }}
      >
        <span className="text-sm text-[var(--color-ink-soft)]">Overall profile quality</span>
        <span className="text-sm font-semibold" style={{ color: color(v.overall) }}>
          {label(v.overall)}
        </span>
      </div>

      <div className="space-y-2">
        {v.dimensions.map((d) => (
          <button
            key={d.key}
            type="button"
            onClick={() => go(d.step)}
            className="w-full rounded-xl border px-4 py-3 text-left transition-colors hover:border-[var(--color-border-strong)]"
            style={{ borderColor: "var(--color-border)" }}
            title={`Edit: ${STEP_TITLES[d.step]}`}
          >
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-[var(--color-ink)]">{d.label}</span>
              <span
                className="inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                style={{ background: "var(--color-surface)", color: color(d.verdict) }}
              >
                {label(d.verdict)}
                <span aria-hidden style={{ opacity: 0.7 }}>↗</span>
              </span>
            </div>
            <p className="mt-1 text-[12px] leading-snug text-[var(--color-ink-soft)]">{d.explanation}</p>
          </button>
        ))}
      </div>

      {v.issues.length > 0 && (
        <div className="space-y-2">
          {v.issues.map((iss) => (
            <WarningBanner key={iss} tone="danger">
              {iss}
            </WarningBanner>
          ))}
        </div>
      )}

      {v.suggestedFixes.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-ink-faint)]">
            Suggested fixes
          </h4>
          {v.suggestedFixes.map((f) => {
            const already = profile.forbiddenAssumptions.custom.includes(f.assumption);
            return (
              <motion.div
                key={f.assumption}
                className="flex items-center justify-between gap-3 rounded-xl border px-4 py-3"
                style={{ borderColor: "var(--color-border)" }}
              >
                <span className="text-[13px] text-[var(--color-ink-soft)]">{f.label}</span>
                <button
                  type="button"
                  disabled={already}
                  onClick={() => applyFix(f.assumption)}
                  className="shrink-0 rounded-lg border px-3 py-1.5 text-[12px] font-medium transition-colors disabled:opacity-40"
                  style={{ borderColor: "var(--color-accent)", color: "var(--color-accent)" }}
                >
                  {already ? "Applied" : "Apply fix"}
                </button>
              </motion.div>
            );
          })}
        </div>
      )}

      <button
        type="button"
        onClick={() => setNonce((n) => n + 1)}
        className="text-[12px] font-medium text-[var(--color-info)] hover:underline"
      >
        ↻ Regenerate validation
      </button>

      {v.overall === "invalid" && (
        <WarningBanner tone="warn">
          This profile is invalid, but you can still export it. Fix the issues above for a simulation-ready profile.
        </WarningBanner>
      )}
    </div>
  );
}
