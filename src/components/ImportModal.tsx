import { useRef, useState } from "react";
import { motion } from "framer-motion";

// Modal to import a profile file via drag-and-drop or browse. The caller decides
// what to do with the file text (parse + replace the working profile).
export default function ImportModal({
  onClose,
  onFile,
}: {
  onClose: () => void;
  onFile: (text: string) => void;
}) {
  const [drag, setDrag] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const read = (file?: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onFile(String(reader.result || ""));
    reader.readAsText(file);
  };

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
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-sm font-semibold text-[var(--color-ink)]">Import profile</h2>
            <p className="mt-1 text-[12px] text-[var(--color-ink-faint)]">
              This replaces the profile you're working on right now.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-2 py-1 text-[var(--color-ink-faint)] transition-colors hover:text-[var(--color-ink)]"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            read(e.dataTransfer.files?.[0]);
          }}
          className="mt-4 flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-10 text-center transition-colors"
          style={{
            borderColor: drag ? "var(--color-accent)" : "var(--color-border-strong)",
            background: drag ? "color-mix(in srgb, var(--color-accent) 12%, transparent)" : "var(--color-surface-2)",
          }}
        >
          <span className="text-2xl text-[var(--color-ink-faint)]">⤓</span>
          <span className="text-[13px] text-[var(--color-ink-soft)]">
            Drag &amp; drop a profile file here, or{" "}
            <span className="font-semibold text-[var(--color-info)]">browse</span>
          </span>
          <span className="text-[11px] text-[var(--color-ink-faint)]">.json exported from this builder</span>
        </button>

        <input
          ref={inputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => read(e.target.files?.[0])}
        />
      </motion.div>
    </div>
  );
}
