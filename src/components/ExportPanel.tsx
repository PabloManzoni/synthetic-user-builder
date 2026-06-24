import { useState } from "react";
import { useProfile } from "../state/profileStore";
import { toMarkdown, toPromptBlock, toRawMarkdown, download } from "../lib/export";
import { completeProfile } from "../ai/aiClient";
import WarningBanner from "./WarningBanner";

type Format = "markdown" | "prompt";

export default function ExportPanel() {
  const { profile, dispatch } = useProfile();
  const [format, setFormat] = useState<Format>("markdown");
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState(false);

  const generated = !!profile.generated;

  const runGenerate = async () => {
    setGenerating(true);
    setGenError(false);
    const result = await completeProfile(profile);
    if (result) {
      dispatch({ type: "setGeneratedProfile", value: result });
      setFormat("markdown");
    } else {
      setGenError(true);
    }
    setGenerating(false);
  };

  const slug = profile.profileName ? "-" + profile.profileName.toLowerCase().replace(/\s+/g, "-") : "";

  // The visible result is always the AI-built ("enhanced") version.
  const content = format === "markdown" ? toMarkdown(profile) : toPromptBlock(profile);

  const copy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };

  const downloadRaw = () =>
    download(`synthetic-user${slug}-raw.md`, toRawMarkdown(profile), "text/markdown");

  return (
    <div className="space-y-4">
      {!generated ? (
        <div
          className="flex flex-col items-center gap-3 rounded-xl border px-4 py-8 text-center"
          style={{ borderColor: "var(--color-border)", background: "var(--color-surface-2)" }}
        >
          <p className="max-w-sm text-[13px] leading-relaxed text-[var(--color-ink-soft)]">
            Turn your selections into a clean, ready-to-use synthetic user written to the standard framework.
          </p>
          <button
            type="button"
            onClick={runGenerate}
            disabled={generating}
            className="rounded-lg px-5 py-2.5 text-sm font-semibold transition-colors disabled:opacity-60"
            style={{ background: "var(--color-accent)", color: "#0b0d10" }}
          >
            {generating ? "Generating…" : "✨ Generate synthetic user"}
          </button>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-medium text-[var(--color-ink)]">Your synthetic user ✓</span>
            <button
              type="button"
              onClick={runGenerate}
              disabled={generating}
              className="text-[11px] font-medium text-[var(--color-info)] hover:underline disabled:opacity-60"
            >
              {generating ? "Generating…" : "↻ Generate again"}
            </button>
          </div>

          <div className="flex gap-1 rounded-lg border p-1" style={{ borderColor: "var(--color-border)" }}>
            {(["markdown", "prompt"] as Format[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setFormat(t)}
                className="flex-1 rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors"
                style={{
                  background: format === t ? "var(--color-accent-soft)" : "transparent",
                  color: format === t ? "var(--color-ink)" : "var(--color-ink-soft)",
                }}
              >
                {t === "markdown" ? "Markdown" : "Prompt block"}
              </button>
            ))}
          </div>

          <pre
            className="max-h-[42vh] overflow-auto rounded-xl border px-4 py-3 text-[12px] leading-relaxed text-[var(--color-ink-soft)]"
            style={{ borderColor: "var(--color-border)", background: "var(--color-surface-2)", whiteSpace: "pre-wrap" }}
          >
            {content}
          </pre>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => copy(content)}
              className="flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors"
              style={{ background: "var(--color-accent)", color: "#0b0d10" }}
            >
              {copied ? "Copied ✓" : "Copy to clipboard"}
            </button>
            {format === "markdown" && (
              <button
                type="button"
                onClick={() => download(`synthetic-user${slug}.md`, content, "text/markdown")}
                className="flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors"
                style={{ borderColor: "var(--color-border-strong)", color: "var(--color-ink)" }}
              >
                Download .md
              </button>
            )}
          </div>
        </>
      )}

      {genError && (
        <WarningBanner tone="warn">
          AI isn't available right now (no key or a temporary error). You can still grab the raw version below.
        </WarningBanner>
      )}

      {/* Low-priority escape hatch: the raw profile exactly as shown in the live preview. */}
      <div className="pt-1 text-center">
        <button
          type="button"
          onClick={downloadRaw}
          className="text-[12px] text-[var(--color-ink-faint)] underline underline-offset-2 hover:text-[var(--color-ink-soft)]"
          title="Download your selections as-is, with no AI rewrite"
        >
          View raw (.md)
        </button>
      </div>

      <p className="text-[12px] leading-snug text-[var(--color-ink-faint)]">
        This is the user profile only — no specific task and no screen steps. Add a task separately in your testing tool.
      </p>
    </div>
  );
}
