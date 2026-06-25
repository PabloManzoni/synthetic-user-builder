import { useEffect, useRef, useState } from "react";
import { useProfile } from "../state/profileStore";
import { generateExpertiseInterpretation } from "../ai/mockAi";
import { chooseExpertise } from "../ai/choose";
import AiFillButton from "../components/AiFillButton";
import {
  DOMAIN_EXPERTISE_LEVELS,
  TECHNICAL_LEVELS,
  PRODUCT_TYPE_FAMILIARITY,
  EXACT_PRODUCT_FAMILIARITY,
} from "../ai/genericOptions";
import type { ExpertiseSlice } from "../state/types";

function ScaleRow({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <span className="mb-2 block text-[12px] font-medium text-[var(--color-ink-soft)]">{label}</span>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const active = value === o;
          return (
            <button
              key={o}
              type="button"
              onClick={() => onChange(o)}
              className="rounded-lg border px-3 py-2 text-[13px] transition-colors"
              style={{
                borderColor: active ? "var(--color-accent)" : "var(--color-border)",
                background: active ? "var(--color-accent-soft)" : "var(--color-surface-2)",
                color: active ? "var(--color-ink)" : "var(--color-ink-soft)",
              }}
            >
              {o}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function Step3Expertise() {
  const { profile, dispatch } = useProfile();
  const e = profile.expertise;
  const patch = (p: Partial<ExpertiseSlice>) => dispatch({ type: "patchExpertise", patch: p });

  const lastAuto = useRef(e.interpretation);
  useEffect(() => {
    const next = generateExpertiseInterpretation(e);
    if (e.interpretation === lastAuto.current || e.interpretation === "") {
      patch({ interpretation: next });
      lastAuto.current = next;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [e.domainExpertise, e.technicalProficiency, e.productTypeFamiliarity, e.exactProductFamiliarity]);

  const [choosing, setChoosing] = useState(false);
  const chooseWithAi = async () => {
    setChoosing(true);
    patch(await chooseExpertise(profile));
    setChoosing(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <AiFillButton
          variant="ai"
          label={choosing ? "Choosing…" : "Choose with AI"}
          onClick={chooseWithAi}
          disabled={choosing}
        />
      </div>
      <ScaleRow label="Domain expertise" options={DOMAIN_EXPERTISE_LEVELS} value={e.domainExpertise} onChange={(v) => patch({ domainExpertise: v })} />
      <ScaleRow label="Technical proficiency" options={TECHNICAL_LEVELS} value={e.technicalProficiency} onChange={(v) => patch({ technicalProficiency: v })} />
      <ScaleRow label="Familiarity with this product type" options={PRODUCT_TYPE_FAMILIARITY} value={e.productTypeFamiliarity} onChange={(v) => patch({ productTypeFamiliarity: v })} />
      <ScaleRow label="Familiarity with this exact product" options={EXACT_PRODUCT_FAMILIARITY} value={e.exactProductFamiliarity} onChange={(v) => patch({ exactProductFamiliarity: v })} />

      {e.interpretation && (
        <div className="rounded-xl border px-4 py-3" style={{ borderColor: "var(--color-border)", background: "var(--color-surface-2)" }}>
          <h4 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-info)]">
            What this means (editable)
          </h4>
          <textarea
            value={e.interpretation}
            onChange={(ev) => patch({ interpretation: ev.target.value })}
            rows={6}
            className="w-full resize-none bg-transparent text-[13px] leading-relaxed text-[var(--color-ink)] outline-none"
          />
        </div>
      )}
    </div>
  );
}
