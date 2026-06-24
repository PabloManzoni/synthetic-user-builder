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
  const order: Verdict[] = ["strong", "incomplete", "refine", "invalid"];
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
    label: "How complete it is",
    step: 1,
    verdict: filledSlices >= 9 ? "strong" : "incomplete",
    explanation:
      filledSlices >= 9
        ? "Everything important is filled in."
        : `${10 - filledSlices} important part(s) still empty.`,
  });

  // 2. Role clarity
  const roleDemographic = detectDemographicOnly(roleText);
  dims.push({
    key: "roleClarity",
    label: "Clear role",
    step: 1,
    verdict: !roleSelected ? "incomplete" : roleDemographic ? "refine" : "strong",
    explanation: !roleSelected
      ? "No role picked yet."
      : roleDemographic
        ? "This reads like a bio, not how they behave."
        : "The role is clear.",
  });
  if (roleDemographic)
    issues.push("The role reads like a bio. Add how they behave and what limits them.");

  // 3. Constraint strength
  dims.push({
    key: "constraints",
    label: "Has limits",
    step: 4,
    verdict: constraintCount >= 3 ? "strong" : constraintCount >= 1 ? "refine" : "incomplete",
    explanation:
      constraintCount >= 3
        ? "Good limits in place."
        : constraintCount >= 1
          ? "A few limits — consider adding more."
          : "No limits yet — add some so the user stays grounded.",
  });
  if (constraintCount === 0) issues.push("Limits are too weak. Add what the user can and can't rely on.");

  // 4. Forbidden assumption quality
  dims.push({
    key: "forbidden",
    label: "Won't guess too much",
    step: 4,
    verdict: forbiddenCount >= 4 ? "strong" : forbiddenCount >= 1 ? "refine" : "incomplete",
    explanation:
      forbiddenCount >= 4
        ? "Good set of things they won't guess."
        : forbiddenCount >= 1
          ? "A few — adding more makes the profile stronger."
          : "None yet — add some so the user doesn't guess to fill gaps.",
  });
  if (forbiddenCount === 0) {
    issues.push(
      "The profile is still weak. Add things the user should never guess, so the test stays realistic."
    );
    suggestedFixes.push({
      label: "Add: don't guess status or next steps unless they're shown",
      assumption: "Cannot assume the next action unless visible or clearly implied",
    });
  }

  // 5. Risk of overguidance (task leak)
  const taskLeak = detectTaskLanguage(allText);
  dims.push({
    key: "overguidance",
    label: "No task steps",
    step: 3,
    // (decision behavior lives in step 3 "Behavior & trust")
    verdict: taskLeak ? "invalid" : allText.trim() ? "strong" : "incomplete",
    explanation: taskLeak
      ? "This has task or click-by-click steps. Remove them."
      : allText.trim()
        ? "No task steps — good, it stays about behavior."
        : "Nothing to check yet — add behavior and limits.",
  });
  if (taskLeak)
    issues.push("This includes task or click steps. It should describe behavior, not what to click.");

  // 6. Risk of being too generic
  const totalSignals = behaviorCount + infoCount + constraintCount + forbiddenCount + frictionCount;
  dims.push({
    key: "tooGeneric",
    label: "Specific enough",
    step: 3,
    verdict: totalSignals >= 12 ? "strong" : totalSignals > 0 ? "refine" : "incomplete",
    explanation:
      totalSignals >= 12
        ? "Specific enough to feel like a real person."
        : totalSignals > 0
          ? "Add more specifics so it doesn't feel generic."
          : "Add behavior, needs and limits to give it substance.",
  });

  // 7. Risk of being too smart
  const backend = detectBackendKnowledge(allText);
  dims.push({
    key: "tooSmart",
    label: "Not too smart",
    step: 4,
    verdict: backend ? "refine" : forbiddenCount >= 3 ? "strong" : forbiddenCount > 0 ? "refine" : "incomplete",
    explanation: backend
      ? "This gives the user behind-the-scenes knowledge they shouldn't have."
      : forbiddenCount >= 3
        ? "Good — they won't know more than a real person would."
        : "Add things they won't guess so they don't overthink.",
  });
  if (backend)
    issues.push(
      "This makes the test unrealistic. The user shouldn't know behind-the-scenes logic or hidden rules."
    );

  // 8. Risk of compensation
  dims.push({
    key: "compensation",
    label: "Won't fill gaps on its own",
    step: 4,
    verdict: forbiddenCount >= 4 ? "strong" : forbiddenCount >= 1 ? "refine" : "incomplete",
    explanation:
      forbiddenCount >= 4
        ? "Good — they won't fill in gaps the screen leaves."
        : "Add things they won't guess so they don't make up missing info.",
  });
  if (forbiddenCount >= 1 && forbiddenCount < 4)
    suggestedFixes.push({
      label: "Add: don't mentally fill in missing info",
      assumption: "Cannot mentally fix missing interface information",
    });

  // 9. Task independence
  dims.push({
    key: "taskIndependence",
    label: "Not tied to one task",
    step: 6,
    verdict: taskLeak ? "invalid" : allText.trim() ? "strong" : "incomplete",
    explanation: taskLeak
      ? "This is tied to one specific task or flow."
      : allText.trim()
        ? "Works across tasks, not just one."
        : "Add behavior so we can check this.",
  });

  // 10. Reusability
  dims.push({
    key: "reusability",
    label: "Reusable",
    step: 6,
    verdict:
      roleSelected && p.taskSuitability.suitable.length > 0 && !taskLeak
        ? "strong"
        : !roleSelected && p.taskSuitability.suitable.length === 0
          ? "incomplete"
          : "refine",
    explanation:
      roleSelected && p.taskSuitability.suitable.length > 0 && !taskLeak
        ? "Reusable across many tasks it fits."
        : "Pick where it fits and keep it task-free so you can reuse it.",
  });

  // 11. Simulation readiness
  const readiness: Verdict = taskLeak
    ? "invalid"
    : totalSignals === 0 && forbiddenCount === 0
      ? "incomplete"
      : worst(forbiddenCount >= 3 ? "strong" : "refine", totalSignals >= 10 ? "strong" : "refine");
  dims.push({
    key: "readiness",
    label: "Ready to use",
    step: 4,
    verdict: readiness,
    explanation:
      readiness === "strong"
        ? "Ready to pair with a task in your testing tool."
        : readiness === "invalid"
          ? "Not ready: remove task steps and add stronger limits."
          : readiness === "incomplete"
            ? "Add behavior and limits to check this."
            : "Almost there: add stronger limits and more specific behavior.",
  });

  const overall = dims.reduce<Verdict>((acc, d) => worst(acc, d.verdict), "strong");
  return { dimensions: dims, overall, issues, suggestedFixes };
}
