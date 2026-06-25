import { useState } from "react";
import { motion } from "framer-motion";
import { useProfile } from "../state/profileStore";
import { useWizardNav } from "../state/nav";
import { suggestRoles, generatePrimaryMotivation } from "../ai/mockAi";
import { refineField } from "../ai/aiClient";
import { generateFullProfile } from "../ai/buildAll";
import { GENERIC_ROLES } from "../ai/genericOptions";
import { detectDemographicOnly } from "../lib/validation";
import WarningBanner from "../components/WarningBanner";
import AiFillButton from "../components/AiFillButton";
import AiEmptyHint from "../components/AiEmptyHint";
import { STEP_TITLES, type SuggestedRole } from "../state/types";

export default function Step2Role() {
  const { profile, dispatch } = useProfile();
  const r = profile.role;
  const aiRoles = suggestRoles(profile.productContext);
  const [customName, setCustomName] = useState("");
  const [customDesc, setCustomDesc] = useState("");
  const [fillingMotivation, setFillingMotivation] = useState(false);

  const toggleRole = (name: string, description: string) =>
    dispatch({ type: "toggleRole", name, description });
  const isOn = (name: string) => r.selected.includes(name);

  // Context-aware: real Gemini using the full profile so far, with mock fallback.
  const fillMotivation = async () => {
    setFillingMotivation(true);
    const res = await refineField(profile, "motivation");
    const value = res?.motivation || generatePrimaryMotivation(r.selected[0] || "", profile.productContext);
    dispatch({ type: "patchTop", patch: { primaryMotivation: value } });
    setFillingMotivation(false);
  };

  const RoleCard = ({ role }: { role: SuggestedRole }) => {
    const active = isOn(role.name);
    return (
      <button
        type="button"
        onClick={() => toggleRole(role.name, role.description)}
        className="w-full rounded-xl border px-4 py-3.5 text-left transition-colors"
        style={{
          borderColor: active ? "var(--color-accent)" : "var(--color-border)",
          background: active ? "var(--color-accent-soft)" : "var(--color-surface-2)",
        }}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-2 text-sm font-medium text-[var(--color-ink)]">
            <span
              className="flex h-4 w-4 items-center justify-center rounded border text-[9px]"
              style={{
                borderColor: active ? "var(--color-accent)" : "var(--color-border-strong)",
                background: active ? "var(--color-accent)" : "transparent",
                color: "#0b0d10",
              }}
            >
              {active ? "✓" : ""}
            </span>
            {role.name}
          </span>
          <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-info)]">
            AI · {role.confidence}
          </span>
        </div>
        <p className="mt-1 text-[12px] leading-snug text-[var(--color-ink-soft)]">{role.description}</p>
        <div className="mt-2 grid grid-cols-1 gap-1 text-[11px] leading-snug">
          <span style={{ color: "var(--color-ok)" }}>Good for: {role.goodFor}</span>
          <span style={{ color: "var(--color-ink-faint)" }}>Not for: {role.notFor}</span>
        </div>
      </button>
    );
  };

  const selectedDescriptions = r.selected.map((n) => r.descriptions[n] || "").join(" ");

  // Choose with AI: fill the whole step — pick the top AI role (deterministic fallback)
  // and write the primary motivation if it's still empty.
  const [choosing, setChoosing] = useState(false);
  const chooseWithAi = async () => {
    setChoosing(true);
    let roleName = r.selected[0] || "";
    if (r.selected.length === 0) {
      const top = aiRoles[0];
      if (top) {
        roleName = top.name;
        toggleRole(top.name, top.description);
      } else {
        roleName = GENERIC_ROLES[0];
        toggleRole(roleName, `A general ${roleName.toLowerCase()} — shaped for this profile.`);
      }
    }
    if (!profile.primaryMotivation.trim()) {
      const res = await refineField(profile, "motivation");
      const value = res?.motivation || generatePrimaryMotivation(roleName, profile.productContext);
      dispatch({ type: "patchTop", patch: { primaryMotivation: value } });
    }
    setChoosing(false);
  };

  // Auto-build the WHOLE profile from context + role in one coherent pass, then jump
  // to Export with the .md ready. Respects anything already set; never overwrites edits.
  const go = useWizardNav();
  const c = profile.productContext;
  const hasContext = c.researched || c.researchMode === "skip" || !!(c.clientName || c.manualDescription);
  const canAutoBuild = hasContext && r.selected.length > 0;
  const [building, setBuilding] = useState(false);
  const autoBuild = async () => {
    setBuilding(true);
    const full = await generateFullProfile(profile);
    dispatch({ type: "loadProfile", profile: full });
    setBuilding(false);
    go(STEP_TITLES.length - 1); // Export
  };

  return (
    <>
      <div className="-mt-2 flex items-center justify-between gap-3">
        <p className="text-[12px] text-[var(--color-ink-faint)]">You can pick more than one role.</p>
        <AiFillButton variant="ai" label={choosing ? "Choosing…" : "Choose with AI"} onClick={chooseWithAi} disabled={choosing} />
      </div>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h4 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--color-info)" }}>
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--color-info)" }} />
            AI suggested
          </h4>
        </div>
        {aiRoles.length > 0 ? (
          <div className="space-y-2">
            {aiRoles.map((role) => (
              <RoleCard key={role.name} role={role} />
            ))}
          </div>
        ) : (
          <AiEmptyHint what="AI-suggested roles" />
        )}
      </section>

      <section className="space-y-2 border-t pt-6" style={{ borderColor: "var(--color-border)" }}>
        <h4 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-ink-faint)]">
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--color-border-strong)" }} />
          Custom role
        </h4>
        {r.custom.length > 0 && (
          <div className="mb-1 flex flex-wrap gap-1.5">
            {r.custom.map((name) => (
              <span
                key={name}
                className="flex items-center gap-1.5 rounded-md px-2 py-1 text-[12px]"
                style={{ background: "var(--color-accent-soft)", color: "var(--color-ink)" }}
              >
                {name}
                <button
                  type="button"
                  onClick={() => dispatch({ type: "removeCustomRole", name })}
                  className="text-[var(--color-ink-faint)] hover:text-[var(--color-action)]"
                  aria-label={`Remove ${name}`}
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
        )}
        <input
          value={customName}
          onChange={(e) => setCustomName(e.target.value)}
          placeholder="Custom role name"
          className="w-full rounded-lg border bg-[var(--color-surface-2)] px-3 py-2.5 text-sm text-[var(--color-ink)] outline-none focus:border-[var(--color-accent)]"
          style={{ borderColor: "var(--color-border)" }}
        />
        <textarea
          value={customDesc}
          onChange={(e) => setCustomDesc(e.target.value)}
          placeholder="What does this person usually do? (their role, not a single task)"
          rows={3}
          className="w-full rounded-lg border bg-[var(--color-surface-2)] px-3 py-2.5 text-sm text-[var(--color-ink)] outline-none focus:border-[var(--color-accent)]"
          style={{ borderColor: "var(--color-border)" }}
        />
        <button
          type="button"
          disabled={!customName.trim()}
          onClick={() => {
            dispatch({ type: "addCustomRole", name: customName.trim(), description: customDesc.trim() });
            setCustomName("");
            setCustomDesc("");
          }}
          className="rounded-lg border px-4 py-2 text-sm font-medium transition-colors disabled:opacity-40"
          style={{ borderColor: "var(--color-border-strong)", color: "var(--color-ink-soft)" }}
        >
          Add role
        </button>
      </section>

      <section className="border-t pt-6" style={{ borderColor: "var(--color-border)" }}>
        <div className="mb-2 flex items-center justify-between">
          <h4 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-ink-faint)]">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--color-border-strong)" }} />
            Common roles
          </h4>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {GENERIC_ROLES.map((name) => {
            const active = isOn(name);
            return (
              <button
                key={name}
                type="button"
                onClick={() => toggleRole(name, `A general ${name.toLowerCase()} — you'll shape this in the next steps.`)}
                className="flex items-center gap-2 rounded-lg border px-3 py-2.5 text-left text-[13px] transition-colors"
                style={{
                  borderColor: active ? "var(--color-accent)" : "var(--color-border)",
                  background: active ? "var(--color-accent-soft)" : "var(--color-surface-2)",
                  color: "var(--color-ink)",
                }}
              >
                <span
                  className="flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[9px]"
                  style={{
                    borderColor: active ? "var(--color-accent)" : "var(--color-border-strong)",
                    background: active ? "var(--color-accent)" : "transparent",
                    color: "#0b0d10",
                  }}
                >
                  {active ? "✓" : ""}
                </span>
                {name}
              </button>
            );
          })}
        </div>
      </section>

      {r.selected.length > 0 && (
        <div className="space-y-3">
          {detectDemographicOnly(selectedDescriptions) && (
            <WarningBanner tone="warn">
              This sounds like a person's bio, not how they behave. Describe what they do and how they decide —
              not their age or background.
            </WarningBanner>
          )}
          <label className="block">
            <span className="mb-1.5 flex items-center justify-between">
              <span className="text-[12px] font-medium text-[var(--color-ink-soft)]">Primary motivation</span>
              <AiFillButton
                variant="ai"
                label={fillingMotivation ? "Writing…" : "Fill with AI"}
                onClick={fillMotivation}
              />
            </span>
            <textarea
              value={profile.primaryMotivation}
              onChange={(e) => dispatch({ type: "patchTop", patch: { primaryMotivation: e.target.value } })}
              rows={3}
              placeholder="What is this user ultimately trying to achieve?"
              className="w-full rounded-lg border bg-[var(--color-surface-2)] px-3 py-2.5 text-sm text-[var(--color-ink)] outline-none focus:border-[var(--color-accent)]"
              style={{ borderColor: "var(--color-border)" }}
            />
          </label>
        </div>
      )}

      {/* Shortcut: build the entire profile from here. Appears once context + a role exist. */}
      {canAutoBuild && (
        <div className="border-t pt-6" style={{ borderColor: "var(--color-border)" }}>
          <button
            type="button"
            onClick={autoBuild}
            disabled={building}
            className="relative w-full overflow-hidden rounded-xl px-5 py-4 text-left transition-colors disabled:cursor-wait"
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
            <span className="relative flex items-center gap-3">
              {building ? (
                <motion.span
                  aria-hidden
                  className="inline-block h-5 w-5 shrink-0 rounded-full border-2 border-current border-t-transparent"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 0.7, repeat: Infinity, ease: "linear" }}
                />
              ) : (
                <span className="text-xl leading-none" aria-hidden>✨</span>
              )}
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-bold leading-tight">
                  {building ? "Building the whole user…" : "Build the entire user with AI"}
                </span>
                <span className="block text-[12px] font-medium leading-snug opacity-80">
                  {building
                    ? "Designing every step coherently from this role & context."
                    : "Fills every step from this role & context. You can tweak anything after."}
                </span>
              </span>
              {!building && <span className="text-lg leading-none" aria-hidden>→</span>}
            </span>
          </button>
        </div>
      )}
    </>
  );
}
