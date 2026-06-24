import type { SyntheticProfile } from "../state/types";
import { validateProfile } from "./validation";

// `selected` is the source of truth; custom values are already in `selected` once chosen.
const list = (s: { selected: string[] }) => Array.from(new Set(s.selected));
const lines = (text: string) =>
  text
    .split("\n")
    .map((l) => l.replace(/^[•\-]\s*/, "").trim())
    .filter(Boolean);

// Derived narrative fields (heuristic, deterministic). User can edit after export.
function derive(p: SyntheticProfile) {
  const beh = list(p.decisionBehavior).join(" ").toLowerCase();
  const has = (s: string) => beh.includes(s);
  return {
    decisionStyle:
      p.decisionBehavior.generated ||
      (list(p.decisionBehavior).length
        ? list(p.decisionBehavior).join("; ")
        : "Not specified."),
    attentionPattern:
      has("scan") || has("quick")
        ? "Reads headings, labels, alerts and visible values first. Does not inspect every detail unless something looks inconsistent or blocks the decision."
        : "Reads the available information before acting.",
    trustPattern:
      has("trust") || has("distrust")
        ? "Initially trusts the tool when information is presented clearly. Trust drops when status, severity or timestamps are ambiguous."
        : "Trust depends on how clearly the interface communicates state.",
    behaviorUnderPressure:
      has("pressure") || has("speed")
        ? "Acts on the first signal that looks actionable. Rarely double-checks unless the interface makes uncertainty obvious."
        : "Slows down and looks for confirmation before acting.",
    toleranceForAmbiguity:
      list(p.frictionTriggers).length >= 4
        ? "Low. Missing detail that affects whether action is required erodes confidence quickly."
        : "Low to medium. Can handle some missing detail, but not when it affects the decision.",
    commonWrongAssumptions: list(p.forbiddenAssumptions).map((a) => {
      const tail = a.replace(/^cannot\s+/i, "").trim();
      return `May ${tail}`;
    }),
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
    sec("Profile name", p.profileName),
    sec("Reusable role", p.role.selectedRole),
    sec("Role summary", p.role.roleDescription),
    sec("Domain expertise", e.domainExpertise),
    sec("Technical proficiency", e.technicalProficiency),
    sec("Product type familiarity", e.productTypeFamiliarity),
    sec("Exact product familiarity", e.exactProductFamiliarity),
    sec("Primary motivation", p.primaryMotivation),
    sec("Decision style", d.decisionStyle),
    sec("Attention pattern", d.attentionPattern),
    sec("Trust pattern", d.trustPattern),
    sec("Behavior under pressure", d.behaviorUnderPressure),
    sec("Tolerance for ambiguity", d.toleranceForAmbiguity),
    sec("Common wrong assumptions", bullets(d.commonWrongAssumptions)),
    sec("Required explicit information", bullets(list(p.informationNeeds))),
    sec("Constraints", bullets([...list(p.constraints), ...lines(p.constraints.generated)])),
    sec("Behavioral rules", bullets(lines(p.frictionTriggers.generated))),
    sec("Emotional progression rules", bullets(lines(p.emotionalBehavior.generated))),
    sec("Abandonment and escalation rules", bullets(list(p.abandonmentRules))),
    sec("Forbidden assumptions", bullets(list(p.forbiddenAssumptions))),
    sec("Suitable task types", bullets([...p.taskSuitability.suitable, ...p.taskSuitability.customSuitable])),
    sec("Unsuitable task types", bullets([...p.taskSuitability.unsuitable, ...p.taskSuitability.customUnsuitable])),
    sec("Calibration notes", p.productContext.aiSummary),
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
    role: p.role.selectedRole,
    roleSummary: p.role.roleDescription,
    domainExpertise: p.expertise.domainExpertise,
    technicalProficiency: p.expertise.technicalProficiency,
    productTypeFamiliarity: p.expertise.productTypeFamiliarity,
    exactProductFamiliarity: p.expertise.exactProductFamiliarity,
    primaryMotivation: p.primaryMotivation,
    decisionStyle: d.decisionStyle,
    attentionPattern: d.attentionPattern,
    trustPattern: d.trustPattern,
    behaviorUnderPressure: d.behaviorUnderPressure,
    toleranceForAmbiguity: d.toleranceForAmbiguity,
    commonWrongAssumptions: d.commonWrongAssumptions,
    requiredExplicitInformation: list(p.informationNeeds),
    constraints: [...list(p.constraints), ...lines(p.constraints.generated)],
    behavioralRules: lines(p.frictionTriggers.generated),
    emotionalProgressionRules: lines(p.emotionalBehavior.generated),
    abandonmentAndEscalationRules: list(p.abandonmentRules),
    forbiddenAssumptions: list(p.forbiddenAssumptions),
    suitableTaskTypes: [...p.taskSuitability.suitable, ...p.taskSuitability.customSuitable],
    unsuitableTaskTypes: [...p.taskSuitability.unsuitable, ...p.taskSuitability.customUnsuitable],
    calibrationNotes: p.productContext.aiSummary,
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
