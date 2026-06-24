import { useState } from "react";
import { detectTaskLanguage } from "../lib/validation";
import WarningBanner from "./WarningBanner";

export default function CustomOptionInput({
  placeholder,
  onAdd,
}: {
  placeholder: string;
  onAdd: (value: string) => void;
}) {
  const [value, setValue] = useState("");
  const taskLike = detectTaskLanguage(value);

  const submit = () => {
    const v = value.trim();
    if (!v) return;
    onAdd(v);
    setValue("");
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder={placeholder}
          className="flex-1 rounded-lg border bg-[var(--color-surface-2)] px-3 py-2.5 text-sm text-[var(--color-ink)] outline-none focus:border-[var(--color-accent)]"
          style={{ borderColor: "var(--color-border)" }}
        />
        <button
          type="button"
          onClick={submit}
          disabled={!value.trim()}
          className="rounded-lg border px-4 text-sm font-medium transition-colors disabled:opacity-40"
          style={{ borderColor: "var(--color-border-strong)", color: "var(--color-ink-soft)" }}
        >
          Add
        </button>
      </div>
      {taskLike && (
        <WarningBanner tone="danger">
          This looks like a task step. Describe how the user behaves, not what to click.
        </WarningBanner>
      )}
    </div>
  );
}
