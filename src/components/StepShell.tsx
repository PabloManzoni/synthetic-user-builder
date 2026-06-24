export default function StepShell({
  step,
  title,
  helper,
  children,
}: {
  step: number;
  title: string;
  helper: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-xl">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-info)]">
        Step {step + 1} of 12
      </p>
      <h2 className="mt-1.5 text-2xl font-semibold text-[var(--color-ink)]">{title}</h2>
      <p className="mt-2 text-sm leading-relaxed text-[var(--color-ink-soft)]">{helper}</p>
      <div className="mt-7 space-y-6">{children}</div>
    </div>
  );
}
