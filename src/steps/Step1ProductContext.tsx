import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useProfile } from "../state/profileStore";
import { research } from "../ai/mockAi";
import { randomProfileName } from "../lib/random";
import AiFillButton from "../components/AiFillButton";
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

const RESEARCH_STEPS = [
  "Reading public signals about the product…",
  "Understanding the domain and users…",
  "Inferring likely operational roles…",
  "Tailoring suggestions for every step…",
];

export default function Step1ProductContext() {
  const { profile, dispatch } = useProfile();
  const c = profile.productContext;
  const [loading, setLoading] = useState(false);
  const [msgIndex, setMsgIndex] = useState(0);

  // Cycle the status messages while AI research runs.
  useEffect(() => {
    if (!loading) return;
    setMsgIndex(0);
    const id = setInterval(() => setMsgIndex((i) => (i + 1) % RESEARCH_STEPS.length), 1300);
    return () => clearInterval(id);
  }, [loading]);

  const patch = (p: Partial<typeof c>) => dispatch({ type: "patchProductContext", patch: p });

  const runResearch = async () => {
    setLoading(true);
    const r = await research(c);
    patch({
      aiSummary: r.summary,
      aiConfidence: r.confidence,
      researched: true,
      researchFailed: r.failed,
      aiSuggestions: r.suggestions,
      aiSource: r.source,
      // Fill inferred fields, but never overwrite what the user already typed.
      manualDescription: c.manualDescription || r.description,
      knownPrimaryUsers: c.knownPrimaryUsers || r.primaryUsers,
      knownRiskAreas: c.knownRiskAreas || r.riskAreas,
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
          placeholder="e.g. matthew-reyes-a1e"
        />
      </Labeled>

      <Labeled label="Client">
        <input className={inputCls} style={{ borderColor: "var(--color-border)" }} value={c.clientName}
               onChange={(e) => patch({ clientName: e.target.value })} placeholder="e.g. Netflix, Notion, your company…" />
      </Labeled>

      <div>
        <Labeled label="Product description">
          <textarea className={inputCls} style={{ borderColor: "var(--color-border)" }} rows={7} value={c.manualDescription}
                    onChange={(e) => patch({ manualDescription: e.target.value })}
                    placeholder={"Describe the product, or paste its website, links and any details…\n\ne.g. https://comptrain.co — CrossFit programming & gym management: classes, athlete tracking, leaderboards"} />
        </Labeled>
        <p className="mt-1.5 flex gap-1.5 text-[12px] leading-snug text-[var(--color-ink-faint)]">
          <span aria-hidden>💡</span>
          <span>
            Paste the product's page, links or a detailed description — the more context you give, the more
            accurately the AI researches the <em>real</em> app instead of guessing.
          </span>
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Labeled label="Primary users" optional>
          <input className={inputCls} style={{ borderColor: "var(--color-border)" }} value={c.knownPrimaryUsers}
                 onChange={(e) => patch({ knownPrimaryUsers: e.target.value })} placeholder="Who uses it most?" />
        </Labeled>
        <Labeled label="Known risk areas" optional>
          <input className={inputCls} style={{ borderColor: "var(--color-border)" }} value={c.knownRiskAreas}
                 onChange={(e) => patch({ knownRiskAreas: e.target.value })} placeholder="What goes wrong if misread?" />
        </Labeled>
      </div>

      {c.researchMode !== "skip" && (
        <div className="space-y-2">
          <button
            type="button"
            onClick={runResearch}
            disabled={loading}
            className="relative w-full overflow-hidden rounded-lg px-4 py-2.5 text-sm font-medium transition-colors disabled:cursor-wait"
            style={{ background: "var(--color-accent)", color: "#0b0d10" }}
          >
            {loading && (
              <motion.span
                aria-hidden
                className="absolute inset-0"
                style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent)" }}
                initial={{ x: "-100%" }}
                animate={{ x: "100%" }}
                transition={{ duration: 1.1, repeat: Infinity, ease: "linear" }}
              />
            )}
            <span className="relative flex items-center justify-center gap-2">
              {loading && (
                <motion.span
                  aria-hidden
                  className="inline-block h-3.5 w-3.5 rounded-full border-2 border-current border-t-transparent"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 0.7, repeat: Infinity, ease: "linear" }}
                />
              )}
              {loading ? "Researching with AI…" : c.researched ? "Re-run research" : "Search public context"}
            </span>
          </button>

          <AnimatePresence mode="wait">
            {loading ? (
              <motion.p
                key={msgIndex}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.25 }}
                className="text-center text-[12px] text-[var(--color-info)]"
              >
                {RESEARCH_STEPS[msgIndex]}
              </motion.p>
            ) : (
              <p className="text-center text-[11px] text-[var(--color-ink-faint)]">
                This shapes the roles, behaviors and AI suggestions across every step.
              </p>
            )}
          </AnimatePresence>
        </div>
      )}

      <AnimatePresence>
        {c.researched && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            className="space-y-3"
          >
            {c.researchFailed ? (
              <WarningBanner tone="warn">
                We could not find enough reliable context. Add more detail or links above, or continue with generic options.
              </WarningBanner>
            ) : (
              <div className="rounded-xl border px-4 py-3" style={{ borderColor: "var(--color-border)", background: "var(--color-surface-2)" }}>
                <div className="mb-1.5 flex items-center justify-between">
                  <h4 className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-info)]">
                    AI understanding (editable)
                  </h4>
                  <span className="text-[10px] uppercase tracking-wide text-[var(--color-ink-faint)]">
                    {c.aiSource === "ai" ? "Gemini" : "offline mock"}
                    {c.aiConfidence ? ` · ${c.aiConfidence} confidence` : ""}
                  </span>
                </div>
                <textarea
                  className="w-full resize-none bg-transparent text-[13px] leading-relaxed text-[var(--color-ink)] outline-none"
                  rows={6}
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

      <div className="pt-1 text-center">
        {c.researchMode === "skip" ? (
          <span className="text-[12px] text-[var(--color-ink-faint)]">
            Skipped — using generic options.{" "}
            <button type="button" onClick={() => patch({ researchMode: "search" })} className="text-[var(--color-info)] underline underline-offset-2">
              Undo
            </button>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => patch({ researchMode: "skip" })}
            className="text-[12px] text-[var(--color-ink-faint)] underline underline-offset-2 hover:text-[var(--color-ink-soft)]"
          >
            Skip product context →
          </button>
        )}
      </div>
    </>
  );
}
