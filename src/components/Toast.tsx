import { AnimatePresence, motion } from "framer-motion";

// Transient bottom-centered notification (e.g. "Profile exported").
export default function Toast({ message }: { message: string | null }) {
  return (
    <div className="pointer-events-none fixed bottom-20 left-1/2 z-50 -translate-x-1/2">
      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.18 }}
            className="rounded-lg border px-4 py-2.5 text-[13px] font-medium shadow-lg"
            style={{
              background: "var(--color-surface-2)",
              borderColor: "var(--color-border-strong)",
              color: "var(--color-ink)",
            }}
          >
            {message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
