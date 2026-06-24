// Behavior expressed as spectrums (sliders) instead of contradictory checkboxes.
// Each axis has a left↔right pole and 5 positions (0-4); each position maps to a
// behavior statement. The selected statements feed the profile (decisionBehavior).

export interface BehaviorAxis {
  key: string;
  left: string;
  right: string;
  statements: [string, string, string, string, string];
}

export const BEHAVIOR_AXES: BehaviorAxis[] = [
  {
    key: "pace",
    left: "Skims",
    right: "Reads thoroughly",
    statements: [
      "Skims very fast, grabbing only the most prominent signal.",
      "Scans quickly for the first clear signal.",
      "Balances quick scanning with reading the key details.",
      "Reads carefully before acting.",
      "Reads everything thoroughly before deciding.",
    ],
  },
  {
    key: "priority",
    left: "Speed",
    right: "Accuracy",
    statements: [
      "Prioritizes speed over accuracy.",
      "Leans toward speed, accepting some risk.",
      "Balances speed and accuracy.",
      "Leans toward accuracy over speed.",
      "Prioritizes accuracy, even if it's slow.",
    ],
  },
  {
    key: "verification",
    left: "Rarely checks",
    right: "Double-checks",
    statements: [
      "Rarely double-checks anything.",
      "Seldom double-checks unless something looks off.",
      "Double-checks when a decision feels risky.",
      "Double-checks critical information.",
      "Double-checks almost everything before acting.",
    ],
  },
  {
    key: "trust",
    left: "Trusting",
    right: "Skeptical",
    statements: [
      "Trusts what the interface shows without question.",
      "Generally trusts on-screen labels and indicators.",
      "Trusts the interface but notices clear inconsistencies.",
      "Skeptical of automated states and recommendations.",
      "Distrusts the interface until evidence is clear.",
    ],
  },
  {
    key: "escalation",
    left: "Self-reliant",
    right: "Escalates",
    statements: [
      "Avoids escalation; resolves things on their own.",
      "Prefers to handle it alone, escalating only as a last resort.",
      "Escalates when genuinely stuck.",
      "Escalates when unsure rather than guess.",
      "Escalates quickly whenever confidence drops.",
    ],
  },
];

/** Behavior statements for the current axis positions (missing axis → balanced, 2). */
export function axisStatements(axes: Record<string, number>): string[] {
  return BEHAVIOR_AXES.map((a) => a.statements[axes[a.key] ?? 2]);
}
