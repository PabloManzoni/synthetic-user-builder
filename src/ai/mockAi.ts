// Deterministic, offline mock AI. No API key required.
//
// TODO(real-ai): replace the bodies below with a real Claude call
//   (model: "claude-opus-4-8") via a thin backend proxy. Keep these function
//   signatures so the UI does not change. The mock is intentionally
//   conservative: it never invents task steps and flags weak context.

import type {
  ProductContext,
  SuggestedRole,
  ExpertiseSlice,
} from "../state/types";
import {
  SMARTSENSE_SUMMARY,
  SMARTSENSE_ROLES,
  SMARTSENSE_CONFIDENCE,
  SUGGESTION_BANKS,
  type SuggestionBank,
} from "./smartsenseSeed";
import {
  GENERIC_ROLES,
  GENERIC_DECISION_BEHAVIORS,
  GENERIC_INFORMATION_NEEDS,
  GENERIC_FORBIDDEN_ASSUMPTIONS,
  GENERIC_FRICTION_TRIGGERS,
  GENERIC_EMOTIONAL_BEHAVIORS,
  GENERIC_ABANDONMENT_RULES,
  GENERIC_SUITABLE_TASKS,
} from "./genericOptions";

const contextText = (c: ProductContext) =>
  [
    c.clientName,
    c.productName,
    c.businessDomain,
    c.manualDescription,
    c.knownPrimaryUsers,
    c.knownWorkflows,
    c.knownRiskAreas,
  ]
    .join(" ")
    .toLowerCase();

function matchBank(c: ProductContext): SuggestionBank | null {
  const text = contextText(c);
  return (
    SUGGESTION_BANKS.find((b) => b.keywords.some((k) => text.includes(k))) ?? null
  );
}

export interface ResearchResult {
  summary: string;
  confidence: "low" | "medium" | "high" | null;
  roles: SuggestedRole[];
  failed: boolean;
}

/** Simulates public-context research. Returns a Promise to feel real. */
export function research(c: ProductContext): Promise<ResearchResult> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const bank = matchBank(c);
      if (bank) {
        resolve({
          summary: SMARTSENSE_SUMMARY,
          confidence: SMARTSENSE_CONFIDENCE,
          roles: SMARTSENSE_ROLES,
          failed: false,
        });
        return;
      }
      const text = contextText(c).trim();
      if (text.length < 3) {
        resolve({ summary: "", confidence: null, roles: [], failed: true });
        return;
      }
      // We have *some* text but no reliable public match: infer cautiously.
      const label = c.productName || c.clientName || c.businessDomain || "this product";
      resolve({
        summary:
          `We could not find reliable public information about ${label}. ` +
          `Based only on what you entered, it appears to involve ` +
          `${c.businessDomain || "an operational workflow"}. Please edit this summary ` +
          `or describe the product manually.`,
        confidence: "low",
        roles: GENERIC_ROLES.slice(0, 6).map((name) => ({
          name,
          description: "Generic operational role — calibrate with the fields below.",
          goodFor: "Bounded operational decisions from on-screen information.",
          notFor: "Expert setup, deep audits, tasks needing outside knowledge.",
          confidence: "low" as const,
        })),
        failed: false,
      });
    }, 650);
  });
}

// ---- Per-step AI suggestions (merged into the "AI suggested" group) ----
// When a known bank matches we return rich, domain-specific options.
// Otherwise we return a small inferred subset so the AI group is never noise.

const inferred = (pool: string[]) => pool.slice(0, 4);

export const suggestRoles = (c: ProductContext): SuggestedRole[] =>
  matchBank(c) ? SMARTSENSE_ROLES : [];

export const suggestDecisionBehaviors = (c: ProductContext): string[] =>
  matchBank(c)?.decisionBehaviors ?? (c.researched ? inferred(GENERIC_DECISION_BEHAVIORS) : []);

export const suggestInformationNeeds = (c: ProductContext): string[] =>
  matchBank(c)?.informationNeeds ?? (c.researched ? inferred(GENERIC_INFORMATION_NEEDS) : []);

export const suggestForbiddenAssumptions = (c: ProductContext): string[] =>
  matchBank(c)?.forbiddenAssumptions ?? (c.researched ? inferred(GENERIC_FORBIDDEN_ASSUMPTIONS) : []);

export const suggestFrictionTriggers = (c: ProductContext): string[] =>
  matchBank(c)?.frictionTriggers ?? (c.researched ? inferred(GENERIC_FRICTION_TRIGGERS) : []);

export const suggestEmotionalBehaviors = (c: ProductContext): string[] =>
  matchBank(c)?.emotionalBehaviors ?? (c.researched ? inferred(GENERIC_EMOTIONAL_BEHAVIORS) : []);

export const suggestAbandonmentRules = (c: ProductContext): string[] =>
  matchBank(c)?.abandonmentRules ?? (c.researched ? inferred(GENERIC_ABANDONMENT_RULES) : []);

export const suggestSuitableTasks = (c: ProductContext): string[] =>
  matchBank(c)?.suitableTasks ?? (c.researched ? inferred(GENERIC_SUITABLE_TASKS) : []);

// ---- Fill-with-AI generators (deterministic mock; see TODO(real-ai)) ----

export function generatePrimaryMotivation(role: string, c: ProductContext): string {
  const bank = matchBank(c);
  if (bank) {
    return (
      "Quickly determine whether something needs attention and decide if the issue should be " +
      "escalated — without performing deep analysis."
    );
  }
  const r = role || "this user";
  return `Reach a confident decision from what the interface shows, so ${r.toLowerCase()} can move on to the next task.`;
}

// ---- Text generation from selections (deterministic synthesis) ----

export function generateExpertiseInterpretation(e: ExpertiseSlice): string {
  if (!e.domainExpertise && !e.technicalProficiency) return "";
  const dom = (e.domainExpertise || "unknown").toLowerCase();
  const tech = (e.technicalProficiency || "unknown").toLowerCase();
  const fam = (e.exactProductFamiliarity || "unknown").toLowerCase();
  const depth =
    dom === "high" || dom === "expert"
      ? "understands the domain well and reasons confidently about it"
      : dom === "medium"
        ? "understands the domain but does not inspect every detail"
        : "has limited domain knowledge and leans on what the interface makes obvious";
  const reliance =
    fam === "high" || fam === "medium"
      ? "and has used this exact product before"
      : "and is not yet familiar with this exact product";
  return (
    `This user ${depth}, has ${tech} technical proficiency, ${reliance}. ` +
    `They expect the interface to make urgent issues visible and actionable, and they will ` +
    `not compensate for information the product fails to show.`
  );
}

export function generateBehavioralSummary(selected: string[], custom: string[]): string {
  const all = [...selected, ...custom];
  if (!all.length) return "";
  const has = (s: string) => all.some((x) => x.toLowerCase().includes(s));
  const parts: string[] = [];
  parts.push(
    has("scan") || has("quick")
      ? "The user scans for the first clear signal of status or severity."
      : "The user reads available information before acting."
  );
  if (has("trust")) parts.push("If the interface appears confident, they tend to trust it.");
  if (has("pressure") || has("speed"))
    parts.push("Under pressure they act on the first thing that looks actionable.");
  if (has("accuracy") || has("double"))
    parts.push("They double-check information that looks critical.");
  if (has("escalate")) parts.push("They escalate when they cannot resolve uncertainty.");
  parts.push("If key context is missing, they may guess instead of investigating deeply.");
  return parts.join(" ");
}

export function generateRequiredInfo(selected: string[], custom: string[]): string {
  const all = [...selected, ...custom];
  if (!all.length) return "";
  return all.map((i) => `• ${i}`).join("\n");
}

// Precise final rules for forbidden assumptions (prompt examples + template fallback).
const FORBIDDEN_RULES: Record<string, string> = {
  "Cannot infer meaning from color alone":
    "The user cannot rely on color alone to determine severity, status, priority, or required action.",
  "Cannot assume an alert is active unless shown":
    "The user cannot treat a visible alert as active unless the interface clearly indicates its current state.",
  "Cannot assume a safe temperature range unless it is shown":
    "The user cannot judge whether a temperature is safe without a visible threshold or safe range.",
  "Cannot assume the next action unless visible or clearly implied":
    "The user cannot decide the next action unless the interface presents or clearly implies it.",
  "Cannot use knowledge from future screens":
    "The user cannot use information from screens they have not yet reached.",
};

export function generateForbiddenRule(option: string): string {
  if (FORBIDDEN_RULES[option]) return FORBIDDEN_RULES[option];
  const tail = option.replace(/^cannot\s+/i, "").trim();
  return `The user cannot ${tail || option.toLowerCase()}.`;
}

export function generateConstraintRule(option: string): string {
  return option.endsWith(".") ? option : `${option}.`;
}

const FRICTION_RULES: Record<string, string> = {
  "Missing status": "If status is not visible early, confidence drops.",
  "Ambiguous severity": "If severity is unclear, the user hesitates before acting.",
  "Ambiguous alert severity": "If alert severity is unclear, the user hesitates before acting.",
  "Conflicting or stale timestamps":
    "If timestamps conflict, the user may choose the most alarming value instead of the most recent one.",
  "Having to cross-check multiple views to answer one question":
    "If the user must inspect multiple areas to answer one operational question, frustration increases.",
  "Unclear next action": "If no next action is visible, the user feels the task is incomplete.",
};

export function generateFrictionRules(selected: string[], custom: string[]): string {
  const all = [...selected, ...custom];
  if (!all.length) return "";
  return all
    .map(
      (f) =>
        FRICTION_RULES[f] ??
        `If "${f.toLowerCase()}" appears, the user hesitates and confidence drops.`
    )
    .join("\n");
}

export function generateEmotionalProgression(selected: string[], custom: string[]): string {
  const all = [...selected, ...custom];
  if (!all.length) return "";
  const lines: string[] = [];
  const start = all.find((s) => s.toLowerCase().startsWith("starts"));
  lines.push(`Initial state: ${start ? start.replace(/^starts/i, "").trim() : "focused and practical"}.`);
  lines.push("After one unclear signal: slight doubt.");
  if (all.some((s) => s.toLowerCase().includes("repetition") || s.toLowerCase().includes("ambig")))
    lines.push("After repeated ambiguity: frustration and lower trust.");
  if (all.some((s) => s.toLowerCase().includes("conflict") || s.toLowerCase().includes("skeptic")))
    lines.push("After conflicting data: uncertainty and possible overreaction.");
  lines.push("After clear confirmation: relief and confidence.");
  return lines.join("\n");
}

export function generateAbandonmentRules(selected: string[], custom: string[]): string {
  const all = [...selected, ...custom];
  if (!all.length) return "";
  return all.map((r) => (r.endsWith(".") ? r : `${r}.`)).join("\n");
}
