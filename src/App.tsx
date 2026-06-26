import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useProfile, DRAFT_KEY } from "./state/profileStore";
import { WizardNavContext } from "./state/nav";
import Stepper from "./components/Stepper";
import StepShell from "./components/StepShell";
import LiveProfilePreview from "./components/LiveProfilePreview";
import Toast from "./components/Toast";
import ImportModal from "./components/ImportModal";
import NewProfileModal from "./components/NewProfileModal";
import { profileCompleteness, validateProfile } from "./lib/validation";
import { generateFullProfile } from "./ai/buildAll";
import { toProfileFile, parseProfileFile, download } from "./lib/export";
import type { StepStatus } from "./components/Stepper";
import { STEPS } from "./steps";

const DownloadIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3v12" /><path d="m7 10 5 5 5-5" /><path d="M5 21h14" />
  </svg>
);
const UploadIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 21V9" /><path d="m7 14 5-5 5 5" /><path d="M5 3h14" />
  </svg>
);

const EASE = [0.4, 0, 0.2, 1] as const;
const LAST = STEPS.length - 1;

export default function App() {
  const { profile, dispatch } = useProfile();
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [visited, setVisited] = useState<Set<number>>(new Set([0]));
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [importing, setImporting] = useState(false);
  const [confirmingNew, setConfirmingNew] = useState(false);
  const [building, setBuilding] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>();
  const mainRef = useRef<HTMLElement>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2200);
  };

  // Reset scroll to the top whenever the step changes.
  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 });
  }, [step]);

  // Autosave: every change is persisted, so there's no manual "save" to remember.
  useEffect(() => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(profile));
  }, [profile]);

  // Reflect builder state in the tab title.
  const pct = profileCompleteness(profile).pct;
  useEffect(() => {
    const tag = pct >= 100 ? "Complete ✓" : `${pct}%`;
    document.title = profile.profileName
      ? `SUB · ${profile.profileName} · ${tag}`
      : `Synthetic User Builder · ${tag}`;
  }, [pct, profile.profileName]);

  const go = (next: number) => {
    if (next < 0 || next > LAST) return;
    setDir(next > step ? 1 : -1);
    setStep(next);
    setVisited((v) => new Set(v).add(next));
  };

  // Export the full editable profile as one portable file (silent — just a toast).
  const exportProfile = () => {
    const slug = profile.profileName ? "-" + profile.profileName.toLowerCase().replace(/\s+/g, "-") : "";
    download(`synthetic-user${slug}.profile.json`, toProfileFile(profile), "application/json");
    showToast("Profile exported");
  };

  // Import replaces the current profile entirely with the uploaded one.
  const importProfile = (text: string) => {
    const parsed = parseProfileFile(text);
    if (!parsed) {
      showToast("That file isn't a valid profile");
      return;
    }
    dispatch({ type: "loadProfile", profile: parsed });
    setImporting(false);
    setStep(0);
    setVisited(new Set([0]));
    showToast("Profile imported");
  };

  const c = profile.productContext;
  const count = (s: { selected: string[] }) => s.selected.length;
  const validation = useMemo(() => validateProfile(profile), [profile]);
  const done = useMemo<boolean[]>(
    () => [
      c.researched || c.researchMode === "skip" || !!(c.clientName || c.manualDescription),
      profile.role.selected.length > 0,
      !!profile.expertise.domainExpertise,
      count(profile.decisionBehavior) > 0 || count(profile.emotionalBehavior) > 0, // Behavior & trust
      count(profile.informationNeeds) > 0 || count(profile.forbiddenAssumptions) > 0, // Information & limits
      count(profile.frictionTriggers) > 0 || count(profile.abandonmentRules) > 0, // Friction & breaking points
      profile.taskSuitability.suitable.length + profile.taskSuitability.customSuitable.length > 0,
      validation.overall === "strong", // Validation — green only when the profile actually passes
      !!profile.generated, // Export — green only when a synthetic user has been generated
    ],
    [profile, c, validation]
  );

  // Per-step status for the index:
  //   neutral  → not interacted with (even if visited)
  //   amber !  → interacted but incomplete or has an invalid validation issue
  //   green ✓  → complete and valid
  const status = useMemo<StepStatus[]>(() => {
    const invalidSteps = new Set(validation.dimensions.filter((d) => d.verdict === "invalid").map((d) => d.step));
    const anyData = (s: { selected: string[]; custom: string[] }) => s.selected.length > 0 || s.custom.length > 0;
    const e = profile.expertise;
    const ts = profile.taskSuitability;
    const touched = [
      c.researched || !!(c.clientName || c.productName || c.manualDescription || c.knownPrimaryUsers || c.knownRiskAreas),
      profile.role.selected.length > 0 || profile.role.custom.length > 0,
      !!(e.domainExpertise || e.technicalProficiency || e.productTypeFamiliarity || e.exactProductFamiliarity),
      anyData(profile.decisionBehavior) || anyData(profile.emotionalBehavior),
      anyData(profile.informationNeeds) || anyData(profile.constraints) || anyData(profile.forbiddenAssumptions),
      anyData(profile.frictionTriggers) || anyData(profile.abandonmentRules),
      ts.suitable.length + ts.customSuitable.length + ts.unsuitable.length + ts.customUnsuitable.length > 0,
      false, // Validation — action step, never "attention"
      false, // Export — action step, never "attention"
    ];
    return done.map((filled, i) => {
      if (filled && !invalidSteps.has(i)) return "ready";
      return touched[i] ? "attention" : "unvisited";
    });
  }, [profile, c, done, validation]);

  const current = STEPS[step];
  const completeness = profileCompleteness(profile);
  // On the Export step, once a synthetic user is generated, "New profile" becomes the
  // single prominent CTA and the footer nav steps out of the way.
  const finished = step === LAST && !!profile.generated;

  // Auto-build shortcut: on the Role step, once context + a role exist, the footer shows
  // a "Build the entire user with AI" button that fills every step and jumps to Export.
  const hasContext = c.researched || c.researchMode === "skip" || !!(c.clientName || c.manualDescription);
  const canAutoBuild = step === 1 && hasContext && profile.role.selected.length > 0;
  const autoBuild = async () => {
    setBuilding(true);
    const full = await generateFullProfile(profile);
    dispatch({ type: "loadProfile", profile: full });
    setBuilding(false);
    go(LAST); // Export
  };

  return (
    <WizardNavContext.Provider value={go}>
    <div className="flex h-screen flex-col bg-[var(--color-bg)]">
      {/* Header */}
      <header className="flex items-center justify-between border-b px-6 py-3.5" style={{ borderColor: "var(--color-border)" }}>
        <button
          type="button"
          onClick={() => go(0)}
          title="Back to step 1"
          className="flex items-center gap-2.5 rounded-md transition-opacity hover:opacity-80"
        >
          <span className="flex h-6 w-6 items-center justify-center rounded-md text-[12px] font-bold"
                style={{ background: "var(--color-accent)", color: "#0b0d10" }}>S</span>
          <h1 className="text-sm font-semibold text-[var(--color-ink)]">Synthetic User Builder</h1>
        </button>
        <div className="flex items-center gap-4">
          {profile.profileName && (
            <div className="flex items-center gap-2 text-right">
              <div className="leading-tight">
                <div className="text-[13px] font-medium text-[var(--color-ink)]">{profile.profileName}</div>
                <div className="text-[10px] uppercase tracking-wide text-[var(--color-ink-faint)]">
                  {pct >= 100 ? "Complete" : "In progress"}
                </div>
              </div>
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: completeness.color }}
                title={`${completeness.filled}/${completeness.total} sections`}
              />
            </div>
          )}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={exportProfile}
              title="Export profile to a file"
              aria-label="Export profile"
              className="rounded-md border p-1.5 text-[var(--color-ink-faint)] transition-colors hover:text-[var(--color-ink)]"
              style={{ borderColor: "var(--color-border)" }}
            >
              <DownloadIcon />
            </button>
            <button
              type="button"
              onClick={() => setImporting(true)}
              title="Import profile from a file"
              aria-label="Import profile"
              className="rounded-md border p-1.5 text-[var(--color-ink-faint)] transition-colors hover:text-[var(--color-ink)]"
              style={{ borderColor: "var(--color-border)" }}
            >
              <UploadIcon />
            </button>
          </div>
          <button
            type="button"
            onClick={() => setConfirmingNew(true)}
            className={
              finished
                ? "rounded-md px-4 py-1.5 text-[13px] font-semibold transition-colors"
                : "rounded-md border px-3 py-1.5 text-[12px] font-medium text-[var(--color-ink-faint)] transition-colors hover:text-[var(--color-ink-soft)]"
            }
            style={finished ? { background: "var(--color-accent)", color: "#0b0d10" } : { borderColor: "var(--color-border)" }}
          >
            New profile
          </button>
        </div>
      </header>

      {/* Body: 3 panes */}
      <div className="flex min-h-0 flex-1">
        {/* Stepper */}
        <aside
          className="shrink-0 overflow-y-auto border-r px-3 py-5 transition-[width] duration-200"
          style={{ borderColor: "var(--color-border)", width: leftCollapsed ? 56 : 256 }}
        >
          <button
            type="button"
            onClick={() => setLeftCollapsed((v) => !v)}
            title={leftCollapsed ? "Expand steps" : "Collapse steps"}
            className={"mb-3 flex w-full items-center rounded-md py-1 text-[var(--color-ink-faint)] hover:text-[var(--color-ink)] " + (leftCollapsed ? "justify-center" : "justify-end px-1")}
          >
            {leftCollapsed ? "»" : "«"}
          </button>
          <Stepper current={step} status={status} onJump={go} collapsed={leftCollapsed} />
        </aside>

        {/* Step body */}
        <main ref={mainRef} id="step-scroll" className="min-w-0 flex-1 overflow-y-auto px-8 pb-8">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: dir * 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.22, ease: EASE }}
            className="pt-8"
          >
            <StepShell step={step} title={current.title} helper={current.helper}>
              <current.Body />
            </StepShell>
          </motion.div>
        </main>

        {/* Live preview (collapsible) */}
        {rightCollapsed ? (
          <button
            type="button"
            onClick={() => setRightCollapsed(false)}
            title="Show live profile"
            className="flex w-9 shrink-0 items-center justify-center border-l text-[var(--color-ink-faint)] hover:text-[var(--color-ink)]"
            style={{ borderColor: "var(--color-border)" }}
          >
            <span style={{ writingMode: "vertical-rl" }} className="text-[11px] uppercase tracking-wide">
              ‹ Live profile
            </span>
          </button>
        ) : (
          <aside className="w-80 shrink-0 border-l" style={{ borderColor: "var(--color-border)" }}>
            <LiveProfilePreview activeStep={step} onCollapse={() => setRightCollapsed(true)} />
          </aside>
        )}
      </div>

      {/* Bottom bar — hidden once the user has generated on the final step */}
      {!finished && (
      <footer className="flex items-center justify-between gap-3 border-t px-6 py-3" style={{ borderColor: "var(--color-border)" }}>
        <button
          type="button"
          onClick={() => go(step - 1)}
          disabled={step === 0}
          className="rounded-lg border px-4 py-2 text-sm font-medium transition-colors disabled:opacity-40"
          style={{ borderColor: "var(--color-border-strong)", color: "var(--color-ink-soft)" }}
        >
          Back
        </button>

        {canAutoBuild && (
          <button
            type="button"
            onClick={autoBuild}
            disabled={building}
            title="Fills every step from this role & context. You can tweak anything after."
            className="relative overflow-hidden rounded-lg px-5 py-2 text-sm font-semibold transition-colors disabled:cursor-wait"
            style={{ background: "var(--color-accent)", color: "#0b0d10" }}
          >
            {building && (
              <motion.span
                aria-hidden
                className="absolute inset-0"
                style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent)" }}
                initial={{ x: "-100%" }}
                animate={{ x: "100%" }}
                transition={{ duration: 1.1, repeat: Infinity, ease: "linear" }}
              />
            )}
            <span className="relative flex items-center gap-2">
              {building ? (
                <motion.span
                  aria-hidden
                  className="inline-block h-4 w-4 rounded-full border-2 border-current border-t-transparent"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 0.7, repeat: Infinity, ease: "linear" }}
                />
              ) : (
                <span aria-hidden>✨</span>
              )}
              {building ? "Building the whole user…" : "Build the entire user with AI"}
              {!building && <span aria-hidden>→</span>}
            </span>
          </button>
        )}

        <div className="flex items-center gap-2">
          {step !== LAST && (
            <button
              type="button"
              onClick={() => go(LAST)}
              className="rounded-lg border px-4 py-2 text-sm font-medium transition-colors"
              style={{ borderColor: "var(--color-border-strong)", color: "var(--color-ink-soft)" }}
            >
              Export
            </button>
          )}
          {step !== LAST ? (
            <button
              type="button"
              onClick={() => go(step + 1)}
              className="rounded-lg px-5 py-2 text-sm font-semibold transition-colors"
              style={{ background: "var(--color-accent)", color: "#0b0d10" }}
            >
              Continue
            </button>
          ) : (
            <button
              type="button"
              onClick={() => go(0)}
              className="rounded-lg px-5 py-2 text-sm font-semibold transition-colors"
              style={{ background: "var(--color-accent)", color: "#0b0d10" }}
            >
              Back to start
            </button>
          )}
        </div>
      </footer>
      )}

      {importing && <ImportModal onClose={() => setImporting(false)} onFile={importProfile} />}
      {confirmingNew && (
        <NewProfileModal
          onClose={() => setConfirmingNew(false)}
          onBackup={exportProfile}
          onConfirm={() => {
            localStorage.removeItem(DRAFT_KEY);
            dispatch({ type: "reset" });
            setStep(0);
            setVisited(new Set([0]));
            setConfirmingNew(false);
          }}
        />
      )}
      <Toast message={toast} />
    </div>
    </WizardNavContext.Provider>
  );
}
