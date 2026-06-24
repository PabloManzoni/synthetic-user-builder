import type { SyntheticProfile } from "../state/types";
import { validateProfile } from "./validation";
import { asciiFace } from "./asciiFace";

// `selected` is the source of truth; custom values are already in `selected` once chosen.
const list = (s: { selected: string[] }) => Array.from(new Set(s.selected));

const roleName = (p: SyntheticProfile) => p.role.selected.join(", ");
const roleSummary = (p: SyntheticProfile) =>
  p.role.selected.length <= 1
    ? p.role.descriptions[p.role.selected[0]] || ""
    : p.role.selected.map((n) => `${n}: ${p.role.descriptions[n] || ""}`).join("\n");
const lines = (text: string) =>
  text
    .split("\n")
    .map((l) => l.replace(/^[•\-]\s*/, "").trim())
    .filter(Boolean);

// Narrative fields. Prefers AI-generated prose (from "Complete with AI") when
// present; otherwise falls back to deterministic, heuristic text.
function derive(p: SyntheticProfile) {
  const g = p.generated;
  const beh = list(p.decisionBehavior).join(" ").toLowerCase();
  const has = (s: string) => beh.includes(s);
  return {
    primaryMotivation: g?.primaryMotivation || p.primaryMotivation,
    decisionStyle:
      g?.decisionStyle ||
      p.decisionBehavior.generated ||
      (list(p.decisionBehavior).length ? list(p.decisionBehavior).join("; ") : "Not specified."),
    attentionPattern:
      g?.attentionPattern ||
      (has("scan") || has("quick")
        ? "Reads headings, labels, alerts and visible values first. Does not inspect every detail unless something looks inconsistent or blocks the decision."
        : "Reads the available information before acting."),
    trustPattern:
      g?.trustPattern ||
      (has("trust") || has("distrust")
        ? "Initially trusts the tool when information is presented clearly. Trust drops when status, severity or timestamps are ambiguous."
        : "Trust depends on how clearly the interface communicates state."),
    behaviorUnderPressure:
      g?.behaviorUnderPressure ||
      (has("pressure") || has("speed")
        ? "Acts on the first signal that looks actionable. Rarely double-checks unless the interface makes uncertainty obvious."
        : "Slows down and looks for confirmation before acting."),
    toleranceForAmbiguity:
      g?.toleranceForAmbiguity ||
      (list(p.frictionTriggers).length >= 4
        ? "Low. Missing detail that affects whether action is required erodes confidence quickly."
        : "Low to medium. Can handle some missing detail, but not when it affects the decision."),
    commonWrongAssumptions:
      g?.commonWrongAssumptions?.length
        ? g.commonWrongAssumptions
        : list(p.forbiddenAssumptions).map((a) => `May ${a.replace(/^cannot\s+/i, "").trim()}`),
    calibrationNotes: g?.calibrationNotes || p.productContext.aiSummary,
    unsuitableTaskTypes: (() => {
      const picked = [...p.taskSuitability.unsuitable, ...p.taskSuitability.customUnsuitable];
      return picked.length ? picked : g?.unsuitableTaskTypes ?? [];
    })(),
  };
}

export function toMarkdown(p: SyntheticProfile): string {
  const d = derive(p);
  const v = validateProfile(p);
  const e = p.expertise;
  const sec = (title: string, body: string) => `${title}:\n${body || "—"}\n`;
  const bullets = (arr: string[]) => (arr.length ? arr.map((x) => `- ${x}`).join("\n") : "—");

  return [
    "# Synthetic User Profile",
    "",
    "```",
    asciiFace(p.profileName),
    "```",
    "",
    sec("Profile name", p.profileName),
    sec("Reusable role", roleName(p)),
    sec("Role summary", roleSummary(p)),
    sec("Domain expertise", e.domainExpertise),
    sec("Technical proficiency", e.technicalProficiency),
    sec("Product type familiarity", e.productTypeFamiliarity),
    sec("Exact product familiarity", e.exactProductFamiliarity),
    sec("Primary motivation", d.primaryMotivation),
    sec("Decision style", d.decisionStyle),
    sec("Attention pattern", d.attentionPattern),
    sec("Trust pattern", d.trustPattern),
    sec("Behavior under pressure", d.behaviorUnderPressure),
    sec("Tolerance for ambiguity", d.toleranceForAmbiguity),
    sec("Common wrong assumptions", bullets(d.commonWrongAssumptions)),
    sec("Required explicit information", bullets(list(p.informationNeeds))),
    sec("Constraints", bullets(list(p.constraints))),
    sec("Behavioral rules", bullets(lines(p.frictionTriggers.generated))),
    sec("Emotional progression rules", bullets(lines(p.emotionalBehavior.generated))),
    sec("Abandonment and escalation rules", bullets(list(p.abandonmentRules))),
    sec("Forbidden assumptions", bullets(list(p.forbiddenAssumptions))),
    sec("Suitable task types", bullets([...p.taskSuitability.suitable, ...p.taskSuitability.customSuitable])),
    sec("Unsuitable task types", bullets(d.unsuitableTaskTypes)),
    sec("Calibration notes", d.calibrationNotes),
    sec("Profile quality check", v.overall === "strong" ? "Strong" : v.overall === "refine" ? "Needs refinement" : "Invalid"),
    sec("Validation notes", bullets(v.issues.length ? v.issues : ["No blocking issues detected."])),
  ].join("\n");
}

export function toJsonObject(p: SyntheticProfile) {
  const d = derive(p);
  const v = validateProfile(p);
  const verdict = (key: string) => v.dimensions.find((x) => x.key === key)?.verdict ?? "";
  return {
    profileName: p.profileName,
    asciiFace: asciiFace(p.profileName),
    role: roleName(p),
    roleSummary: roleSummary(p),
    domainExpertise: p.expertise.domainExpertise,
    technicalProficiency: p.expertise.technicalProficiency,
    productTypeFamiliarity: p.expertise.productTypeFamiliarity,
    exactProductFamiliarity: p.expertise.exactProductFamiliarity,
    primaryMotivation: d.primaryMotivation,
    decisionStyle: d.decisionStyle,
    attentionPattern: d.attentionPattern,
    trustPattern: d.trustPattern,
    behaviorUnderPressure: d.behaviorUnderPressure,
    toleranceForAmbiguity: d.toleranceForAmbiguity,
    commonWrongAssumptions: d.commonWrongAssumptions,
    requiredExplicitInformation: list(p.informationNeeds),
    constraints: list(p.constraints),
    behavioralRules: lines(p.frictionTriggers.generated),
    emotionalProgressionRules: lines(p.emotionalBehavior.generated),
    abandonmentAndEscalationRules: list(p.abandonmentRules),
    forbiddenAssumptions: list(p.forbiddenAssumptions),
    suitableTaskTypes: [...p.taskSuitability.suitable, ...p.taskSuitability.customSuitable],
    unsuitableTaskTypes: d.unsuitableTaskTypes,
    calibrationNotes: d.calibrationNotes,
    validation: {
      profileQuality: verdict("completeness"),
      riskOfOverguidance: verdict("overguidance"),
      riskOfCompensation: verdict("compensation"),
      riskOfBeingTooGeneric: verdict("tooGeneric"),
      riskOfBeingTooSmart: verdict("tooSmart"),
      taskIndependence: verdict("taskIndependence"),
      reusability: verdict("reusability"),
      simulationReadiness: verdict("readiness"),
      validationNotes: v.issues,
    },
  };
}

export const toJson = (p: SyntheticProfile) => JSON.stringify(toJsonObject(p), null, 2);

export function toPromptBlock(p: SyntheticProfile): string {
  const j = toJsonObject(p);
  return [
    "You are simulating a synthetic user. Stay strictly within this profile.",
    "Do not invent navigation steps or knowledge the interface does not provide.",
    "",
    `Role: ${j.role || "—"}`,
    `Summary: ${j.roleSummary || "—"}`,
    `Decision style: ${j.decisionStyle}`,
    `Trust pattern: ${j.trustPattern}`,
    `Behavior under pressure: ${j.behaviorUnderPressure}`,
    `Tolerance for ambiguity: ${j.toleranceForAmbiguity}`,
    "",
    "Required explicit information:",
    ...j.requiredExplicitInformation.map((x) => `- ${x}`),
    "",
    "Forbidden assumptions (hard limits):",
    ...j.forbiddenAssumptions.map((x) => `- ${x}`),
    "",
    "Abandonment and escalation:",
    ...j.abandonmentAndEscalationRules.map((x) => `- ${x}`),
  ].join("\n");
}

export function download(filename: string, content: string, type = "text/plain") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
