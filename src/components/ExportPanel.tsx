import { useState } from "react";
import { useProfile } from "../state/profileStore";
import { toMarkdown, toJson, toPromptBlock, download } from "../lib/export";

type Format = "markdown" | "json" | "prompt";

const tabs: { key: Format; label: string }[] = [
  { key: "markdown", label: "Markdown" },
  { key: "json", label: "JSON" },
  { key: "prompt", label: "Prompt block" },
];

export default function ExportPanel() {
  const { profile } = useProfile();
  const [format, setFormat] = useState<Format>("markdown");
  const [copied, setCopied] = useState(false);

  const content =
    format === "markdown" ? toMarkdown(profile) : format === "json" ? toJson(profile) : toPromptBlock(profile);

  const filename =
    "synthetic-user" +
    (profile.profileName ? "-" + profile.profileName.toLowerCase().replace(/\s+/g, "-") : "") +
    (format === "markdown" ? ".md" : format === "json" ? ".json" : ".txt");

  const copy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-1 rounded-lg border p-1" style={{ borderColor: "var(--color-border)" }}>
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setFormat(t.key)}
            className="flex-1 rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors"
            style={{
              background: format === t.key ? "var(--color-accent-soft)" : "transparent",
              color: format === t.key ? "var(--color-ink)" : "var(--color-ink-soft)",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <pre
        className="max-h-[46vh] overflow-auto rounded-xl border px-4 py-3 text-[12px] leading-relaxed text-[var(--color-ink-soft)]"
        style={{ borderColor: "var(--color-border)", background: "var(--color-surface-2)", whiteSpace: "pre-wrap" }}
      >
        {content}
      </pre>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={copy}
          className="flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors"
          style={{ background: "var(--color-accent)", color: "#0b0d10" }}
        >
          {copied ? "Copied ✓" : "Copy to clipboard"}
        </button>
        <button
          type="button"
          onClick={() =>
            download(
              filename,
              content,
              format === "json" ? "application/json" : "text/plain"
            )
          }
          className="flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors"
          style={{ borderColor: "var(--color-border-strong)", color: "var(--color-ink)" }}
        >
          Download {format === "markdown" ? ".md" : format === "json" ? ".json" : ".txt"}
        </button>
      </div>

      <p className="text-[12px] leading-snug text-[var(--color-ink-faint)]">
        This exports the reusable profile only — no task objective and no app navigation steps. Pair it with a
        separate task in your testing tool.
      </p>
    </div>
  );
}
