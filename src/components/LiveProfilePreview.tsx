import { motion } from "framer-motion";
import { useProfile } from "../state/profileStore";
import { profileCompleteness, detectTaskLanguage } from "../lib/validation";
import { asciiFace } from "../lib/asciiFace";

const dimStyle = (dim: boolean) => ({
  opacity: dim ? 0.28 : 1,
  transition: "opacity 0.22s cubic-bezier(0.4,0,0.2,1)",
});

function Field({ label, value, dim = false }: { label: string; value?: string; dim?: boolean }) {
  return (
    <div style={dimStyle(dim)}>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-ink-faint)]">
        {label}
      </div>
      <div className="mt-0.5 text-[13px] leading-snug text-[var(--color-ink)]">
        {value && value.trim() ? value : <span className="text-[var(--color-ink-faint)]">—</span>}
      </div>
    </div>
  );
}

function Chips({
  label,
  items,
  tone,
  dim = false,
}: {
  label: string;
  items: string[];
  tone?: string;
  dim?: boolean;
}) {
  return (
    <div style={dimStyle(dim)}>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-ink-faint)]">
        {label}
      </div>
      {items.length ? (
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {items.map((i, idx) => (
            <motion.span
              key={`${idx}-${i}`}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
              className="rounded-md px-2 py-1 text-[11px] leading-none"
              style={{
                background: "var(--color-surface-2)",
                color: tone ?? "var(--color-ink-soft)",
                border: "1px solid var(--color-border)",
              }}
            >
              {i}
            </motion.span>
          ))}
        </div>
      ) : (
        <div className="mt-0.5 text-[13px] text-[var(--color-ink-faint)]">—</div>
      )}
    </div>
  );
}

export default function LiveProfilePreview({ activeStep }: { activeStep: number }) {
  const { profile: p } = useProfile();
  const cp = profileCompleteness(p);
  const all = (s: { selected: string[] }) => Array.from(new Set(s.selected));

  // Sections light up for the step they belong to; on validation/export nothing dims.
  const focusActive = activeStep <= 6;
  const dimFor = (relatedStep: number) => focusActive && relatedStep !== activeStep;

  const taskLeak = detectTaskLanguage(
    [...all(p.decisionBehavior), ...all(p.forbiddenAssumptions), ...all(p.frictionTriggers), p.role.selected.map((n) => p.role.descriptions[n] || "").join(" ")].join(" ")
  );

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b px-5 py-4" style={{ borderColor: "var(--color-border)" }}>
        <h3 className="text-sm font-semibold text-[var(--color-ink)]">Live profile</h3>
        <span
          className="flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
          style={{ background: "var(--color-surface-2)", color: cp.color }}
          title={`${cp.filled} of ${cp.total} sections filled`}
        >
          {cp.label} · {cp.pct}%
        </span>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
        <div className="flex justify-center" style={dimStyle(dimFor(0))}>
          <motion.pre
            key={asciiFace(p.profileName)}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
            className="select-none text-[11px] leading-[1.15] text-[var(--color-ink-soft)]"
            style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}
            aria-hidden
          >
            {asciiFace(p.profileName)}
          </motion.pre>
        </div>
        <Field label="Profile name" value={p.profileName} dim={dimFor(0)} />
        <div className="space-y-5" style={dimStyle(dimFor(1))}>
          <Field label="Reusable role" value={p.role.selected.join(", ")} />
          <Field
            label="Role summary"
            value={p.role.selected.map((n) => p.role.descriptions[n]).filter(Boolean).join(" · ")}
          />
          <Field label="Primary motivation" value={p.primaryMotivation} />
        </div>
        <div className="grid grid-cols-2 gap-4" style={dimStyle(dimFor(2))}>
          <Field label="Domain" value={p.expertise.domainExpertise} />
          <Field label="Technical" value={p.expertise.technicalProficiency} />
          <Field label="Product type" value={p.expertise.productTypeFamiliarity} />
          <Field label="This product" value={p.expertise.exactProductFamiliarity} />
        </div>
        <Chips label="Decision behavior" items={all(p.decisionBehavior)} dim={dimFor(3)} />
        <Chips label="Emotional & trust" items={all(p.emotionalBehavior)} dim={dimFor(3)} />
        <Chips label="Information needs" items={all(p.informationNeeds)} dim={dimFor(4)} />
        <Chips label="Constraints" items={all(p.constraints)} dim={dimFor(4)} />
        <Chips label="Forbidden assumptions" items={all(p.forbiddenAssumptions)} tone="var(--color-action)" dim={dimFor(4)} />
        <Chips label="Friction triggers" items={all(p.frictionTriggers)} tone="var(--color-risk)" dim={dimFor(5)} />
        <Chips label="Abandonment & escalation" items={all(p.abandonmentRules)} dim={dimFor(5)} />
        <Chips
          label="Suitable tasks"
          items={[...p.taskSuitability.suitable, ...p.taskSuitability.customSuitable]}
          tone="var(--color-ok)"
          dim={dimFor(6)}
        />
        <Chips
          label="Unsuitable tasks"
          items={[...p.taskSuitability.unsuitable, ...p.taskSuitability.customUnsuitable]}
          dim={dimFor(6)}
        />

        {(taskLeak || p.forbiddenAssumptions.selected.length === 0) && (
          <div
            className="rounded-lg px-3 py-2 text-[11px] leading-snug"
            style={{ background: "var(--color-action-soft)", color: "var(--color-action)" }}
          >
            {taskLeak
              ? "Task / navigation language detected — keep the profile behavioral."
              : "No forbidden assumptions yet — the profile is likely too weak."}
          </div>
        )}
      </div>
    </div>
  );
}
