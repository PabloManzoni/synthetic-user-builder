import { motion } from "framer-motion";

type Tone = "warn" | "danger" | "info";

const tones: Record<Tone, { bg: string; fg: string; dot: string }> = {
  warn: { bg: "var(--color-risk-soft)", fg: "var(--color-risk)", dot: "var(--color-risk)" },
  danger: { bg: "var(--color-action-soft)", fg: "var(--color-action)", dot: "var(--color-action)" },
  info: { bg: "var(--color-info-soft)", fg: "var(--color-info)", dot: "var(--color-info)" },
};

export default function WarningBanner({ tone = "warn", children }: { tone?: Tone; children: React.ReactNode }) {
  const t = tones[tone];
  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
      className="flex gap-2.5 rounded-lg px-3 py-2.5 text-sm leading-snug"
      style={{ background: t.bg, color: t.fg }}
    >
      <span
        className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
        style={{ background: t.dot }}
        aria-hidden
      />
      <span>{children}</span>
    </motion.div>
  );
}
