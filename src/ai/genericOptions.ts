// Static "Common" option pools, available in every product context.
// These are the safe fallbacks the prompt requires so the app always works,
// even with no AI research and no SmartSense context.

export const GENERIC_ROLES = [
  "End user",
  "Power user",
  "Admin",
  "Manager",
  "Reviewer",
  "External user",
  "New user",
];

export const DOMAIN_EXPERTISE_LEVELS = ["Low", "Medium", "High", "Expert"];
export const TECHNICAL_LEVELS = ["Low", "Medium", "High", "Power user"];
export const PRODUCT_TYPE_FAMILIARITY = [
  "First time user",
  "Occasional user",
  "Regular user",
  "Daily user",
  "Power user",
];
export const EXACT_PRODUCT_FAMILIARITY = ["Unknown", "None", "Low", "Medium", "High"];

export const GENERIC_DECISION_BEHAVIORS = [
  "Scans quickly",
  "Reads carefully",
  "Acts under time pressure",
  "Needs confirmation before acting",
  "Trusts on-screen labels and indicators",
  "Distrusts automated recommendations",
  "Rarely double checks",
  "Double checks critical information",
  "Prioritizes speed",
  "Prioritizes accuracy",
  "Escalates when unsure",
  "Avoids escalation unless necessary",
  "Gets frustrated by ambiguity",
  "Keeps working despite friction",
  "Stops when confidence drops",
];

export const GENERIC_INFORMATION_NEEDS = [
  "Status",
  "Severity or priority",
  "Ownership",
  "Timestamp / recency",
  "Next action",
  "Evidence",
  "Confirmation",
  "Required fields",
  "Missing information",
  "Policy or rule",
  "Threshold",
  "Risk or impact",
  "Progress / completion",
  "Error reason",
];

export const GENERIC_CONSTRAINTS = [
  "Can only use information visible in the interface",
  "Cannot inspect future screens before reaching them",
  "Cannot use backend logic or internal product knowledge",
  "Cannot rely on undeclared business rules",
  "Decides only from what the current screen communicates",
];

export const GENERIC_FORBIDDEN_ASSUMPTIONS = [
  "Cannot assume backend logic",
  "Cannot assume internal business rules",
  "Cannot assume disabled elements have a specific cause",
  "Cannot infer meaning from color alone",
  "Cannot assume information is up to date unless recency is shown",
  "Cannot assume an item is active or current unless shown",
  "Cannot assume something is complete unless confirmation is shown",
  "Cannot assume missing data means there is no issue",
  "Cannot assume a default value is correct",
  "Cannot assume the next action unless visible or clearly implied",
  "Cannot use knowledge from future screens",
  "Cannot inspect steps that have not been reached",
  "Cannot compensate for unclear labels",
  "Cannot mentally fix missing interface information",
];

export const GENERIC_FRICTION_TRIGGERS = [
  "Missing status",
  "Unclear next action",
  "Conflicting information",
  "Unclear labels",
  "Too many steps",
  "Too many required fields",
  "Dense terminology",
  "Unclear error message",
  "Disabled action with no explanation",
  "No confirmation after action",
  "Too much visual noise",
  "No priority signal",
  "No clear owner or responsibility",
  "No sense of how recent the data is",
  "Ambiguous importance or urgency",
  "Repeated information",
  "Unexpected empty state",
  "No visible progress",
  "Inconsistent terminology",
];

export const GENERIC_EMOTIONAL_BEHAVIORS = [
  "Starts focused",
  "Starts skeptical",
  "Starts confident",
  "Starts rushed",
  "Confidence increases with clear feedback",
  "Confidence decreases with missing context",
  "Frustration increases with repetition",
  "Trust decreases with inconsistency",
  "Fatigue increases with long flows",
  "Anxiety increases when risk is unclear",
  "Relief appears after confirmation",
  "Doubt persists if the final state is unclear",
];

export const GENERIC_ABANDONMENT_RULES = [
  "Stops if required information is missing",
  "Escalates when they can't confirm the outcome",
  "Asks a teammate when terminology is unclear",
  "Continues but loses trust",
  "Completes the task but remains unsure",
  "Abandons if the next action is not visible",
  "Abandons after repeated errors",
  "Avoids risky action without confirmation",
  "Uses another tool if the product does not provide enough evidence",
  "Marks task unresolved if there is no final confirmation",
];

export const GENERIC_SUITABLE_TASKS = [
  "Review status",
  "Make a decision from displayed information",
  "Detect if action is needed",
  "Interpret system feedback",
  "Identify missing information",
  "Review operational exceptions",
  "Complete a bounded workflow",
  "Evaluate confidence in a decision",
];

export const GENERIC_UNSUITABLE_TASKS = [
  "Admin configuration",
  "Deep compliance audit",
  "Expert technical setup",
  "Backend troubleshooting",
  "Long term strategic analysis",
  "Creating system rules",
  "Tasks requiring unavailable institutional knowledge",
  "Tasks outside the selected role",
];
