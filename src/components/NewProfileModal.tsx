import { motion } from "framer-motion";

// Friendly confirm dialog for "New profile" — warns the current work is lost and
// offers to download a backup first (the .json re-imports into the editor).
export default function NewProfileModal({
  onClose,
  onConfirm,
  onBackup,
}: {
  onClose: () => void;
  onConfirm: () => void;
  onBackup: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.6)" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.16 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl border p-5"
        style={{ background: "var(--color-bg)", borderColor: "var(--color-border-strong)" }}
      >
        <h2 className="text-sm font-semibold text-[var(--color-ink)]">Start a new profile?</h2>
        <p className="mt-1.5 text-[12px] leading-relaxed text-[var(--color-ink-faint)]">
          This clears the profile you're working on — it can't be undone. If you want to keep it, download a
          backup first. You can re-import that file anytime.
        </p>

        <button
          type="button"
          onClick={onBackup}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors hover:border-[var(--color-border-strong)]"
          style={{ borderColor: "var(--color-border)", color: "var(--color-ink)" }}
        >
          <span aria-hidden>⤓</span> Download backup (.json)
        </button>

        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors"
            style={{ borderColor: "var(--color-border-strong)", color: "var(--color-ink-soft)" }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors"
            style={{ background: "var(--color-action)", color: "#fff" }}
          >
            Yes, start new
          </button>
        </div>
      </motion.div>
    </div>
  );
}
