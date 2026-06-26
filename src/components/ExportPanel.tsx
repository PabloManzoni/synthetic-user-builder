import { useState } from "react";
import { useProfile } from "../state/profileStore";
import { toMarkdown, toPromptBlock, toRawMarkdown, download } from "../lib/export";
import { completeProfile } from "../ai/aiClient";
import { profileSignature } from "../ai/buildAll";
import WarningBanner from "./WarningBanner";

type Format = "markdown" | "prompt";

export default function ExportPanel() {
  const { profile, dispatch } = useProfile();
  const [format, setFormat] = useState<Format>("markdown");
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState(false);

  const generated = !!profile.generated;
  // The shown profile is out of date if selections changed since it was last generated.
  const stale = generated && profileSignature(profile) !== profile.builtSignature;

  const runGenerate = async () => {
    setGenerating(true);
    setGenError(false);
    const result = await completeProfile(profile);
    if (result) {
      dispatch({ type: "setGeneratedProfile", value: result });
      // Stamp the inputs we just generated from, so later edits flag the export as stale.
      dispatch({ type: "patchTop", patch: { builtSignature: profileSignature(profile) } });
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

          {/* Selections changed after this was generated — prompt a refresh. */}
          {stale && (
            <div
              className="flex items-center justify-between gap-3 rounded-lg border px-3.5 py-2.5"
              style={{ borderColor: "var(--color-accent)", background: "var(--color-accent-soft)" }}
            >
              <span className="text-[12px] leading-snug text-[var(--color-ink)]">
                This synthetic user doesn't include your latest changes.
              </span>
              <button
                type="button"
                onClick={runGenerate}
                disabled={generating}
                className="shrink-0 rounded-lg px-3.5 py-1.5 text-[13px] font-semibold transition-colors disabled:opacity-60"
                style={{ background: "var(--color-accent)", color: "#0b0d10" }}
              >
                {generating ? "Generating…" : "↻ Generate again"}
              </button>
            </div>
          )}

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
                {t === "markdown" ? "Markdown" : "Prompt block (for manual use)"}
              </button>
            ))}
          </div>

          <div className="relative">
            {/* Minimal icon-only copy, floating over the code box. Download is the real CTA below. */}
            <button
              type="button"
              onClick={() => copy(content)}
              title={copied ? "Copied" : "Copy to clipboard"}
              aria-label="Copy to clipboard"
              className="absolute right-2.5 top-2.5 z-10 flex h-7 w-7 items-center justify-center rounded-md border text-[var(--color-ink-soft)] transition-colors hover:text-[var(--color-ink)]"
              style={{ borderColor: "var(--color-border-strong)", background: "var(--color-surface)" }}
            >
              {copied ? (
                <span className="text-[var(--color-ok)]" aria-hidden>✓</span>
              ) : (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
              )}
            </button>
            <pre
              className="max-h-[42vh] overflow-auto rounded-xl border px-4 py-3 text-[12px] leading-relaxed text-[var(--color-ink-soft)]"
              style={{ borderColor: "var(--color-border)", background: "var(--color-surface-2)", whiteSpace: "pre-wrap" }}
            >
              {content}
            </pre>
          </div>

          <button
            type="button"
            onClick={() =>
              download(
                `synthetic-user${slug}${format === "prompt" ? "-prompt" : ""}.md`,
                content,
                "text/markdown"
              )
            }
            className="w-full rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors"
            style={{ background: "var(--color-accent)", color: "#0b0d10" }}
          >
            Download .md
          </button>
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
