import type {
  SyntheticProfile,
  ValidationResult,
  ValidationDimension,
  Verdict,
} from "../state/types";

// ---- Completeness of the human input (separate from quality validation) ----

export interface Completeness {
  filled: number;
  total: number;
  pct: number;
  label: string;
  color: string;
}

/** How much of the profile the user has filled in, as a friendly scale. */
export function profileCompleteness(p: SyntheticProfile): Completeness {
  const c = p.productContext;
  const has = (s: { selected: string[] }) => s.selected.length > 0;
  const checks = [
    c.researched || c.researchMode === "skip" || !!(c.clientName || c.manualDescription),
    p.role.selected.length > 0,
    !!p.expertise.domainExpertise,
    has(p.decisionBehavior),
    has(p.informationNeeds),
    has(p.constraints),
    has(p.forbiddenAssumptions),
    has(p.frictionTriggers),
    has(p.emotionalBehavior),
    has(p.abandonmentRules),
    p.taskSuitability.suitable.length + p.taskSuitability.customSuitable.length > 0,
  ];
  const filled = checks.filter(Boolean).length;
  const total = checks.length;
  const pct = Math.round((filled / total) * 100);
  let label = "Empty";
  let color = "var(--color-ink-faint)";
  if (pct >= 100) {
    label = "Complete";
    color = "var(--color-ok)";
  } else if (pct >= 75) {
    label = "Almost there";
    color = "var(--color-ok)";
  } else if (pct >= 45) {
    label = "Getting there";
    color = "var(--color-info)";
  } else if (pct > 0) {
    label = "Just started";
    color = "var(--color-info)"; // progress, not a warning — never amber/red here
  }
  return { filled, total, pct, label, color };
}

// ---- Reusable warning detectors (used live across steps + preview) ----

const TASK_PHRASES = [
  "click",
  "tap",
  "open the menu",
  "go to screen",
  "go to the",
  "select the tab",
  "complete this task",
  "find shipment",
  "press button",
  "press the",
  "navigate to",
  "scroll to",
  "the alert",
];

/** Detects task / navigation language that does not belong in a reusable profile. */
export function detectTaskLanguage(text: string): boolean {
  const t = text.toLowerCase();
  return TASK_PHRASES.some((p) => t.includes(p));
}

const DEMOGRAPHIC_WORDS = [
  "years old",
  "age",
  "male",
  "female",
  "lives in",
  "married",
  "city",
  "salary",
  "hobby",
];
const AGENT_WORDS = [
  "decide",
  "scan",
  "trust",
  "assume",
  "hesitate",
  "escalate",
  "expect",
  "act",
  "review",
  "monitor",
];

/** A role/summary that only describes a person, not a decision agent. */
export function detectDemographicOnly(text: string): boolean {
  const t = text.toLowerCase();
  if (!t.trim()) return false;
  const demographic = DEMOGRAPHIC_WORDS.some((w) => t.includes(w));
  const agentic = AGENT_WORDS.some((w) => t.includes(w));
  return demographic && !agentic;
}

const BACKEND_KNOWLEDGE = [
  "knows the backend",
  "knows internal",
  "knows the business rule",
  "knows the api",
  "knows the database",
  "aware of the backend",
];

/** Profile text that grants the agent hidden/internal knowledge → artificial compensation. */
export function detectBackendKnowledge(text: string): boolean {
  const t = text.toLowerCase();
  return BACKEND_KNOWLEDGE.some((p) => t.includes(p));
}

// ---- Full profile validation (Step 11) ----

const worst = (a: Verdict, b: Verdict): Verdict => {
  const order: Verdict[] = ["strong", "refine", "invalid"];
  return order[Math.max(order.indexOf(a), order.indexOf(b))];
};

export function validateProfile(p: SyntheticProfile): ValidationResult {
  const dims: ValidationDimension[] = [];
  const issues: string[] = [];
  const suggestedFixes: { label: string; assumption: string }[] = [];

  // `selected` already includes any chosen custom values, so count it alone.
  const forbiddenCount = p.forbiddenAssumptions.selected.length;
  const constraintCount = p.constraints.selected.length;
  const behaviorCount = p.decisionBehavior.selected.length;
  const infoCount = p.informationNeeds.selected.length;
  const frictionCount = p.frictionTriggers.selected.length;

  const roleSelected = p.role.selected.length > 0;
  const roleText = p.role.selected.map((n) => p.role.descriptions[n] || "").join(" ");

  const allText = [
    roleText,
    p.decisionBehavior.generated,
    p.forbiddenAssumptions.generated,
    p.frictionTriggers.generated,
    p.abandonmentRules.generated,
    ...p.decisionBehavior.custom,
    ...p.forbiddenAssumptions.custom,
    ...p.frictionTriggers.custom,
    ...p.taskSuitability.customSuitable,
  ].join(" ");

  // 1. Completeness
  const filledSlices = [
    roleSelected,
    p.expertise.domainExpertise,
    behaviorCount,
    infoCount,
    constraintCount,
    forbiddenCount,
    frictionCount,
    p.emotionalBehavior.selected.length,
    p.abandonmentRules.selected.length,
    p.taskSuitability.suitable.length,
  ].filter(Boolean).length;
  dims.push({
    key: "completeness",
    label: "Profile completeness",
    step: 1,
    verdict: filledSlices >= 9 ? "strong" : filledSlices >= 6 ? "refine" : "invalid",
    explanation:
      filledSlices >= 9
        ? "All core dimensions are filled in."
        : `${10 - filledSlices} core dimension(s) still empty.`,
  });

  // 2. Role clarity
  const roleDemographic = detectDemographicOnly(roleText);
  dims.push({
    key: "roleClarity",
    label: "Role clarity",
    step: 1,
    verdict: !roleSelected ? "invalid" : roleDemographic ? "refine" : "strong",
    explanation: !roleSelected
      ? "No role selected."
      : roleDemographic
        ? "Role reads as a demographic description, not a decision agent."
        : "Role describes a clear relationship to the domain.",
  });
  if (roleDemographic)
    issues.push("The role describes a person, but not a decision agent. Add decision behavior and constraints.");

  // 3. Constraint strength
  dims.push({
    key: "constraints",
    label: "Constraint strength",
    step: 4,
    verdict: constraintCount >= 3 ? "strong" : constraintCount >= 1 ? "refine" : "invalid",
    explanation:
      constraintCount >= 3
        ? "Constraints meaningfully bound the agent."
        : constraintCount >= 1
          ? "Some constraints present; consider adding more."
          : "No constraints — the agent is unbounded.",
  });
  if (constraintCount === 0) issues.push("Constraints are too weak. Add what the agent may and may not use.");

  // 4. Forbidden assumption quality
  dims.push({
    key: "forbidden",
    label: "Forbidden assumption quality",
    step: 4,
    verdict: forbiddenCount >= 4 ? "strong" : forbiddenCount >= 1 ? "refine" : "invalid",
    explanation:
      forbiddenCount >= 4
        ? "Strong set of forbidden assumptions."
        : forbiddenCount >= 1
          ? "A few forbidden assumptions; more would harden the profile."
          : "No forbidden assumptions — the agent will compensate for missing UI information.",
  });
  if (forbiddenCount === 0) {
    issues.push(
      "This profile is likely too weak. Add forbidden assumptions to prevent the synthetic user from compensating for missing interface information."
    );
    suggestedFixes.push({
      label: "Add: cannot infer thresholds, status, or next actions unless visible",
      assumption: "Cannot assume the next action unless visible or clearly implied",
    });
  }

  // 5. Risk of overguidance (task leak)
  const taskLeak = detectTaskLanguage(allText);
  dims.push({
    key: "overguidance",
    label: "Risk of overguidance",
    step: 3,
    // (decision behavior lives in step 3 "Behavior & trust")
    verdict: taskLeak ? "invalid" : "strong",
    explanation: taskLeak
      ? "Profile contains task or navigation language. Remove product-specific steps."
      : "No task or navigation steps detected. Profile stays behavioral.",
  });
  if (taskLeak)
    issues.push("The profile includes task or navigation instructions. It must define behavior, not app steps.");

  // 6. Risk of being too generic
  const totalSignals = behaviorCount + infoCount + constraintCount + forbiddenCount + frictionCount;
  dims.push({
    key: "tooGeneric",
    label: "Risk of being too generic",
    step: 3,
    verdict: totalSignals >= 12 ? "strong" : totalSignals >= 6 ? "refine" : "invalid",
    explanation:
      totalSignals >= 12
        ? "Enough specific behavior to drive distinct simulation."
        : "Profile may be too generic to produce meaningful behavior.",
  });

  // 7. Risk of being too smart
  const backend = detectBackendKnowledge(allText);
  dims.push({
    key: "tooSmart",
    label: "Risk of being too smart",
    step: 4,
    verdict: backend ? "refine" : forbiddenCount >= 3 ? "strong" : "refine",
    explanation: backend
      ? "Profile grants internal/backend knowledge the agent should not have."
      : forbiddenCount >= 3
        ? "Forbidden assumptions keep the agent from knowing too much."
        : "Add forbidden assumptions so the agent does not over-reason.",
  });
  if (backend)
    issues.push(
      "This may create artificial compensation. The user should not know backend logic or undeclared business rules."
    );

  // 8. Risk of compensation
  dims.push({
    key: "compensation",
    label: "Risk of compensating for interface gaps",
    step: 4,
    verdict: forbiddenCount >= 4 ? "strong" : forbiddenCount >= 2 ? "refine" : "invalid",
    explanation:
      forbiddenCount >= 4
        ? "Forbidden assumptions prevent the agent from filling gaps the UI leaves."
        : "The agent may still guess from domain experience when data is missing.",
  });
  if (forbiddenCount >= 1 && forbiddenCount < 4)
    suggestedFixes.push({
      label: "Add: cannot mentally fix missing interface information",
      assumption: "Cannot mentally fix missing interface information",
    });

  // 9. Task independence
  dims.push({
    key: "taskIndependence",
    label: "Task independence",
    step: 6,
    verdict: taskLeak ? "invalid" : "strong",
    explanation: taskLeak
      ? "Profile is bound to a specific task or flow."
      : "Profile is independent of any specific task.",
  });

  // 10. Reusability
  dims.push({
    key: "reusability",
    label: "Reusability",
    step: 6,
    verdict:
      roleSelected && p.taskSuitability.suitable.length > 0 && !taskLeak ? "strong" : "refine",
    explanation:
      roleSelected && p.taskSuitability.suitable.length > 0 && !taskLeak
        ? "Reusable across multiple tasks of the suitable types."
        : "Define suitable task types and keep it task-independent to maximize reuse.",
  });

  // 11. Simulation readiness
  const readiness = worst(
    forbiddenCount >= 3 ? "strong" : "refine",
    worst(taskLeak ? "invalid" : "strong", totalSignals >= 10 ? "strong" : "refine")
  );
  dims.push({
    key: "readiness",
    label: "Simulation readiness",
    step: 4,
    verdict: readiness,
    explanation:
      readiness === "strong"
        ? "Ready to pair with a separate task objective in a simulation."
        : readiness === "invalid"
          ? "Not ready: remove task language and strengthen constraints."
          : "Almost ready: harden constraints and add specific behavior.",
  });

  const overall = dims.reduce<Verdict>((acc, d) => worst(acc, d.verdict), "strong");
  return { dimensions: dims, overall, issues, suggestedFixes };
}
