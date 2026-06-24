import { useState } from "react";
import { useProfile } from "../state/profileStore";
import { toMarkdown, toJson, toPromptBlock, download } from "../lib/export";
import { completeProfile } from "../ai/aiClient";
import WarningBanner from "./WarningBanner";

type Format = "markdown" | "json" | "prompt" | "enhanced";

export default function ExportPanel() {
  const { profile, dispatch } = useProfile();
  const [format, setFormat] = useState<Format>("markdown");
  const [copied, setCopied] = useState(false);
  const [enhancing, setEnhancing] = useState(false);
  const [enhanceError, setEnhanceError] = useState(false);

  const enhanced = !!profile.generated;

  const runEnhance = async () => {
    setEnhancing(true);
    setEnhanceError(false);
    const result = await completeProfile(profile);
    if (result) {
      dispatch({ type: "setGeneratedProfile", value: result });
      setFormat("enhanced"); // auto-switch to the enhanced tab when it's ready
    } else {
      setEnhanceError(true);
    }
    setEnhancing(false);
  };

  // The three base tabs always show your ORIGINAL selections (never the AI rewrite),
  // so enhancing never overwrites what you built. The 4th tab holds the enhanced copy.
  const original = { ...profile, generated: null };

  const tabs: { key: Format; label: string }[] = [
    { key: "markdown", label: "Markdown" },
    { key: "json", label: "JSON" },
    { key: "prompt", label: "Prompt block" },
    ...(enhanced ? ([{ key: "enhanced", label: "✨ AI Enhanced" }] as const) : []),
  ];

  const content =
    format === "enhanced"
      ? toMarkdown(profile)
      : format === "markdown"
        ? toMarkdown(original)
        : format === "json"
          ? toJson(original)
          : toPromptBlock(original);

  const ext = format === "json" ? ".json" : format === "prompt" ? ".txt" : ".md";
  const slug = profile.profileName ? "-" + profile.profileName.toLowerCase().replace(/\s+/g, "-") : "";
  const filename = `synthetic-user${slug}${format === "enhanced" ? "-enhanced" : ""}${ext}`;

  const copy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };

  return (
    <div className="space-y-4">
      <div
        className="flex items-center justify-between gap-3 rounded-xl border px-4 py-3"
        style={{
          borderColor: enhanced ? "var(--color-ok)" : "var(--color-info)",
          background: "var(--color-surface-2)",
        }}
      >
        <div>
          <div className="text-[13px] font-medium text-[var(--color-ink)]">
            {enhanced ? "Enhanced with AI ✓" : "Enhance the synthetic user with AI"}
          </div>
          <div className="text-[11px] text-[var(--color-ink-faint)]">
            {enhanced
              ? "The enhanced version lives in the AI Enhanced tab. Your original export is untouched."
              : "AI rewrites your selections into a cleaner, fuller profile in a new tab — your original stays as-is."}
          </div>
        </div>
        <button
          type="button"
          onClick={runEnhance}
          disabled={enhancing}
          className="shrink-0 rounded-lg px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-60"
          style={{ background: "var(--color-accent)", color: "#0b0d10" }}
        >
          {enhancing ? "Enhancing…" : enhanced ? "↻ Re-enhance" : "✨ Enhance with AI"}
        </button>
      </div>

      {enhanceError && (
        <WarningBanner tone="warn">
          AI enhancement is unavailable right now (no key or a transient error). Your export below still works.
        </WarningBanner>
      )}

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
          onClick={() => download(filename, content, format === "json" ? "application/json" : "text/plain")}
          className="flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors"
          style={{ borderColor: "var(--color-border-strong)", color: "var(--color-ink)" }}
        >
          Download {ext}
        </button>
      </div>

      <p className="text-[12px] leading-snug text-[var(--color-ink-faint)]">
        This saves the user profile only — no specific task and no screen steps. Add a task separately in your
        testing tool.
      </p>
    </div>
  );
}
