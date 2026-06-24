import { motion } from "framer-motion";

/** Small, unobtrusive action button used for "Fill with AI" and "Randomize". */
export default function AiFillButton({
  label,
  onClick,
  variant = "ai",
}: {
  label: string;
  onClick: () => void;
  variant?: "ai" | "random";
}) {
  const color = variant === "ai" ? "var(--color-info)" : "var(--color-ink-soft)";
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.96 }}
      transition={{ duration: 0.12, ease: [0.4, 0, 0.2, 1] }}
      className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[11px] font-medium transition-colors"
      style={{ borderColor: "var(--color-border)", color, background: "var(--color-surface-2)" }}
    >
      <span aria-hidden>{variant === "ai" ? "✨" : "🎲"}</span>
      {label}
    </motion.button>
  );
}
