import { useEffect, useRef, useState } from "react";
import AiFillButton from "./AiFillButton";

export interface SectionDef {
  key: string;
  title: string;
  desc?: string;
  /** True once this sub-section has content — shows a ✓ in the nav. */
  done?: boolean;
  /** Optional accent color for the section heading. */
  titleColor?: string;
  /** Optional controls rendered on the right of the section header. */
  actions?: JSX.Element;
  render: () => JSX.Element;
}

const divider = <div className="h-px" style={{ background: "var(--color-border)" }} />;

// Multi-section step wrapper. A sticky strip at the top lists every sub-section
// so it's obvious there are several to fill; it highlights the one currently in
// view (scroll-spy) and clicking jumps to it. Each section shows ✓ when filled.
export default function MultiSection({
  sections,
  onRandomize,
}: {
  sections: SectionDef[];
  /** When set, a "Randomize all" button appears in the sticky strip. */
  onRandomize?: () => void;
}) {
  const [active, setActive] = useState(sections[0]?.key);
  const refs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    const root = document.getElementById("step-scroll");
    if (!root) return;
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        const key = visible[0]?.target.getAttribute("data-section");
        if (key) setActive(key);
      },
      // Account for the sticky strip up top; treat the upper third as "current".
      { root, rootMargin: "-96px 0px -55% 0px", threshold: 0 }
    );
    Object.values(refs.current).forEach((el) => el && obs.observe(el));
    return () => obs.disconnect();
  }, [sections.map((s) => s.key).join("|")]);

  const scrollTo = (key: string) => {
    const root = document.getElementById("step-scroll");
    const el = refs.current[key];
    if (!root || !el) return;
    // Offset so the section title lands just below the sticky strip.
    const top = el.offsetTop - 84;
    root.scrollTo({ top, behavior: "smooth" });
    setActive(key);
  };

  return (
    <div>
      {/* Sticky section nav — opaque so content scrolls fully behind it, flush to the top. */}
      <div
        className="sticky -top-px z-20 -mx-8 mb-6 border-b px-8 py-3"
        style={{ background: "var(--color-bg)", borderColor: "var(--color-border)" }}
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-ink-faint)]">
            {sections.length} sections
          </span>
          {onRandomize && (
            <span className="mr-1">
              <AiFillButton variant="random" label="Randomize all" onClick={onRandomize} />
            </span>
          )}
          {sections.map((s, i) => {
            const on = active === s.key;
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => scrollTo(s.key)}
                className="flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors"
                style={{
                  borderColor: on ? "var(--color-accent)" : "var(--color-border)",
                  background: on ? "color-mix(in srgb, var(--color-accent) 16%, transparent)" : "transparent",
                  color: on ? "var(--color-ink)" : "var(--color-ink-faint)",
                }}
              >
                <span
                  className="flex h-3.5 w-3.5 items-center justify-center rounded-full text-[8px] font-bold"
                  style={{
                    background: s.done ? "var(--color-ok)" : "var(--color-surface-2)",
                    color: s.done ? "#0b0d10" : "var(--color-ink-faint)",
                    border: s.done ? "none" : "1px solid var(--color-border-strong)",
                  }}
                >
                  {s.done ? "✓" : i + 1}
                </span>
                {s.title}
              </button>
            );
          })}
        </div>
      </div>

      {/* Sections */}
      <div className="space-y-8">
        {sections.map((s, i) => (
          <div key={s.key} data-section={s.key} ref={(el) => (refs.current[s.key] = el)}>
            {i > 0 && <div className="mb-8">{divider}</div>}
            <div className="space-y-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold" style={{ color: s.titleColor ?? "var(--color-ink)" }}>
                    {s.title}
                  </h3>
                  {s.desc && <p className="mt-1 text-[12px] text-[var(--color-ink-faint)]">{s.desc}</p>}
                </div>
                {s.actions}
              </div>
              {s.render()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
