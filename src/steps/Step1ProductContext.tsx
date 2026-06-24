import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useProfile } from "../state/profileStore";
import { research } from "../ai/mockAi";
import { randomProfileName } from "../lib/random";
import AiFillButton from "../components/AiFillButton";
import type { ResearchMode } from "../state/types";
import WarningBanner from "../components/WarningBanner";

const Labeled = ({
  label,
  optional = false,
  action,
  children,
}: {
  label: string;
  optional?: boolean;
  action?: React.ReactNode;
  children: React.ReactNode;
}) => (
  <label className="block">
    <span className="mb-1.5 flex items-center justify-between">
      <span className="text-[12px] font-medium text-[var(--color-ink-soft)]">
        {label}
        {optional && (
          <span className="ml-1.5 text-[10px] font-normal uppercase tracking-wide text-[var(--color-ink-faint)]">
            Optional
          </span>
        )}
      </span>
      {action}
    </span>
    {children}
  </label>
);

const inputCls =
  "w-full rounded-lg border bg-[var(--color-surface-2)] px-3 py-2.5 text-sm text-[var(--color-ink)] outline-none focus:border-[var(--color-accent)]";

const MODES: { key: ResearchMode; label: string; hint: string }[] = [
  { key: "search", label: "Search public context", hint: "Let AI infer the product and likely roles" },
  { key: "manual", label: "Describe manually", hint: "Skip AI and fill in the fields yourself" },
  { key: "skip", label: "Skip product context", hint: "Continue with generic options only" },
];

export default function Step1ProductContext() {
  const { profile, dispatch } = useProfile();
  const c = profile.productContext;
  const [loading, setLoading] = useState(false);

  const patch = (p: Partial<typeof c>) => dispatch({ type: "patchProductContext", patch: p });

  const runResearch = async () => {
    setLoading(true);
    const r = await research(c);
    patch({
      aiSummary: r.summary,
      aiConfidence: r.confidence,
      researched: true,
      researchFailed: r.failed,
    });
    setLoading(false);
  };

  return (
    <>
      <Labeled
        label="Profile name"
        optional
        action={
          <AiFillButton
            variant="random"
            label="Randomize"
            onClick={() => dispatch({ type: "patchTop", patch: { profileName: randomProfileName() } })}
          />
        }
      >
        <input
          className={inputCls}
          style={{ borderColor: "var(--color-border)" }}
          value={profile.profileName}
          onChange={(e) => dispatch({ type: "patchTop", patch: { profileName: e.target.value } })}
          placeholder="e.g. matthew-a1b2"
        />
      </Labeled>

      <div className="grid grid-cols-2 gap-3">
        <Labeled label="Client">
          <input className={inputCls} style={{ borderColor: "var(--color-border)" }} value={c.clientName}
                 onChange={(e) => patch({ clientName: e.target.value })} placeholder="e.g. Netflix" />
        </Labeled>
        <Labeled label="Product" optional>
          <input className={inputCls} style={{ borderColor: "var(--color-border)" }} value={c.productName}
                 onChange={(e) => patch({ productName: e.target.value })} placeholder="e.g. Backoffice" />
        </Labeled>
      </div>

      <div>
        <span className="mb-2 block text-[12px] font-medium text-[var(--color-ink-soft)]">How do you want context?</span>
        <div className="space-y-2">
          {MODES.map((m) => (
            <button
              key={m.key}
              type="button"
              onClick={() => patch({ researchMode: m.key })}
              className="flex w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors"
              style={{
                borderColor: c.researchMode === m.key ? "var(--color-accent)" : "var(--color-border)",
                background: c.researchMode === m.key ? "var(--color-accent-soft)" : "var(--color-surface-2)",
              }}
            >
              <span className="mt-0.5 h-4 w-4 shrink-0 rounded-full border"
                    style={{ borderColor: c.researchMode === m.key ? "var(--color-accent)" : "var(--color-border-strong)",
                             background: c.researchMode === m.key ? "var(--color-accent)" : "transparent" }} />
              <span>
                <span className="block text-sm text-[var(--color-ink)]">{m.label}</span>
                <span className="block text-[12px] text-[var(--color-ink-faint)]">{m.hint}</span>
              </span>
            </button>
          ))}
        </div>
      </div>

      {c.researchMode === "search" && (
        <button
          type="button"
          onClick={runResearch}
          disabled={loading}
          className="w-full rounded-lg px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-60"
          style={{ background: "var(--color-accent)", color: "#0b0d10" }}
        >
          {loading ? "Researching…" : c.researched ? "Re-run research" : "Search public context"}
        </button>
      )}

      {(c.researchMode === "manual" || c.researchMode === "search") && (
        <div className="space-y-3">
          <Labeled label="Short product description" optional>
            <textarea className={inputCls} style={{ borderColor: "var(--color-border)" }} rows={3} value={c.manualDescription}
                      onChange={(e) => patch({ manualDescription: e.target.value })}
                      placeholder="What does this product do?" />
          </Labeled>
          <div className="grid grid-cols-1 gap-3">
            <Labeled label="Primary users" optional>
              <input className={inputCls} style={{ borderColor: "var(--color-border)" }} value={c.knownPrimaryUsers}
                     onChange={(e) => patch({ knownPrimaryUsers: e.target.value })} placeholder="Who uses it most?" />
            </Labeled>
            <Labeled label="Known risk areas" optional>
              <input className={inputCls} style={{ borderColor: "var(--color-border)" }} value={c.knownRiskAreas}
                     onChange={(e) => patch({ knownRiskAreas: e.target.value })} placeholder="What goes wrong if misread?" />
            </Labeled>
          </div>
        </div>
      )}

      <AnimatePresence>
        {c.researchMode === "search" && c.researched && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            className="space-y-3"
          >
            {c.researchFailed ? (
              <WarningBanner tone="warn">
                We could not find enough reliable context. You can continue manually or with generic options.
              </WarningBanner>
            ) : (
              <div className="rounded-xl border px-4 py-3" style={{ borderColor: "var(--color-border)", background: "var(--color-surface-2)" }}>
                <div className="mb-1.5 flex items-center justify-between">
                  <h4 className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-info)]">
                    AI understanding (editable)
                  </h4>
                  {c.aiConfidence && (
                    <span className="text-[10px] uppercase tracking-wide text-[var(--color-ink-faint)]">
                      {c.aiConfidence} confidence
                    </span>
                  )}
                </div>
                <textarea
                  className="w-full resize-none bg-transparent text-[13px] leading-relaxed text-[var(--color-ink)] outline-none"
                  rows={4}
                  value={c.aiSummary}
                  onChange={(e) => patch({ aiSummary: e.target.value })}
                />
                <p className="mt-2 text-[11px] text-[var(--color-ink-faint)]">
                  AI suggestions are not facts — edit or reject anything that looks wrong.
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
