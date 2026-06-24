import { useState } from "react";
import { useProfile } from "../state/profileStore";
import { suggestRoles, generatePrimaryMotivation } from "../ai/mockAi";
import { GENERIC_ROLES } from "../ai/genericOptions";
import { detectDemographicOnly } from "../lib/validation";
import WarningBanner from "../components/WarningBanner";
import AiFillButton from "../components/AiFillButton";
import AiEmptyHint from "../components/AiEmptyHint";
import type { SuggestedRole } from "../state/types";

export default function Step2Role() {
  const { profile, dispatch } = useProfile();
  const r = profile.role;
  const aiRoles = suggestRoles(profile.productContext);
  const [customName, setCustomName] = useState("");
  const [customDesc, setCustomDesc] = useState("");

  const select = (name: string, description: string, source: "ai" | "generic" | "custom") =>
    dispatch({ type: "patchRole", patch: { selectedRole: name, roleDescription: description, roleSource: source } });

  const RoleCard = ({ role }: { role: SuggestedRole }) => {
    const active = r.selectedRole === role.name;
    return (
      <button
        type="button"
        onClick={() => select(role.name, role.description, "ai")}
        className="w-full rounded-xl border px-4 py-3.5 text-left transition-colors"
        style={{
          borderColor: active ? "var(--color-accent)" : "var(--color-border)",
          background: active ? "var(--color-accent-soft)" : "var(--color-surface-2)",
        }}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium text-[var(--color-ink)]">{role.name}</span>
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

  return (
    <>
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h4 className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-ink-faint)]">AI suggested</h4>
          {aiRoles.length > 0 && (
            <AiFillButton
              variant="ai"
              label="Suggest role"
              onClick={() => select(aiRoles[0].name, aiRoles[0].description, "ai")}
            />
          )}
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

      <section>
        <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-ink-faint)]">Common roles</h4>
        <div className="grid grid-cols-2 gap-2">
          {GENERIC_ROLES.map((name) => {
            const active = r.selectedRole === name;
            return (
              <button
                key={name}
                type="button"
                onClick={() => select(name, `Generic ${name.toLowerCase()} — calibrated through the next steps.`, "generic")}
                className="rounded-lg border px-3 py-2.5 text-left text-[13px] transition-colors"
                style={{
                  borderColor: active ? "var(--color-accent)" : "var(--color-border)",
                  background: active ? "var(--color-accent-soft)" : "var(--color-surface-2)",
                  color: "var(--color-ink)",
                }}
              >
                {name}
              </button>
            );
          })}
        </div>
      </section>

      <section className="space-y-2">
        <h4 className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-ink-faint)]">Custom role</h4>
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
          placeholder="What does this role usually do? (relationship to the domain, not a task)"
          rows={2}
          className="w-full rounded-lg border bg-[var(--color-surface-2)] px-3 py-2.5 text-sm text-[var(--color-ink)] outline-none focus:border-[var(--color-accent)]"
          style={{ borderColor: "var(--color-border)" }}
        />
        <button
          type="button"
          disabled={!customName.trim()}
          onClick={() => select(customName.trim(), customDesc.trim(), "custom")}
          className="rounded-lg border px-4 py-2 text-sm font-medium transition-colors disabled:opacity-40"
          style={{ borderColor: "var(--color-border-strong)", color: "var(--color-ink-soft)" }}
        >
          Use this role
        </button>
      </section>

      {r.selectedRole && (
        <div className="space-y-3">
          {detectDemographicOnly(r.roleDescription) && (
            <WarningBanner tone="warn">
              This describes a person, but not a decision agent. Make sure the role explains how they relate to the
              domain and decide — not their demographics.
            </WarningBanner>
          )}
          <label className="block">
            <span className="mb-1.5 flex items-center justify-between">
              <span className="text-[12px] font-medium text-[var(--color-ink-soft)]">Primary motivation</span>
              <AiFillButton
                variant="ai"
                label="Fill with AI"
                onClick={() =>
                  dispatch({
                    type: "patchTop",
                    patch: { primaryMotivation: generatePrimaryMotivation(r.selectedRole, profile.productContext) },
                  })
                }
              />
            </span>
            <textarea
              value={profile.primaryMotivation}
              onChange={(e) => dispatch({ type: "patchTop", patch: { primaryMotivation: e.target.value } })}
              rows={2}
              placeholder="What is this user ultimately trying to achieve?"
              className="w-full rounded-lg border bg-[var(--color-surface-2)] px-3 py-2.5 text-sm text-[var(--color-ink)] outline-none focus:border-[var(--color-accent)]"
              style={{ borderColor: "var(--color-border)" }}
            />
          </label>
        </div>
      )}
    </>
  );
}
