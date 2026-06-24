// ---- Core types for the Synthetic User Builder ----
// A synthetic user is a *constrained decision agent*, not a persona.

export type ResearchMode = "search" | "manual" | "skip";

export type Confidence = "low" | "medium" | "high";

export type ScaleLevel = string;

export interface SuggestedRole {
  name: string;
  description: string;
  goodFor: string;
  notFor: string;
  confidence: Confidence;
}

export interface ProductContext {
  clientName: string;
  productName: string;
  businessDomain: string;
  manualDescription: string;
  knownPrimaryUsers: string;
  knownWorkflows: string;
  knownRiskAreas: string;
  researchMode: ResearchMode;
  /** Editable AI-generated understanding summary. */
  aiSummary: string;
  aiConfidence: Confidence | null;
  /** True once a research/skip choice has produced context (gates suggestions). */
  researched: boolean;
  /** True when the mock found no reliable context. */
  researchFailed: boolean;
}

export interface RoleSlice {
  selectedRole: string;
  roleDescription: string;
  roleSource: "ai" | "generic" | "custom" | "";
}

export interface ExpertiseSlice {
  domainExpertise: ScaleLevel;
  technicalProficiency: ScaleLevel;
  productTypeFamiliarity: ScaleLevel;
  exactProductFamiliarity: ScaleLevel;
  /** Editable AI interpretation paragraph. */
  interpretation: string;
}

/** Generic shape for every multi-select option step. */
export interface OptionSlice {
  selected: string[];
  custom: string[];
  /** AI-generated summary/rules text derived from selections. */
  generated: string;
}

export interface TaskSuitabilitySlice {
  suitable: string[];
  unsuitable: string[];
  customSuitable: string[];
  customUnsuitable: string[];
}

export type Verdict = "strong" | "refine" | "invalid";

export interface ValidationDimension {
  key: string;
  label: string;
  verdict: Verdict;
  explanation: string;
  /** Wizard step (0-based) this dimension maps to, for click-to-navigate. */
  step: number;
}

export interface ValidationResult {
  dimensions: ValidationDimension[];
  overall: Verdict;
  issues: string[];
  suggestedFixes: { label: string; assumption: string }[];
}

export interface SyntheticProfile {
  profileName: string;
  primaryMotivation: string;
  productContext: ProductContext;
  role: RoleSlice;
  expertise: ExpertiseSlice;
  decisionBehavior: OptionSlice;
  informationNeeds: OptionSlice;
  constraints: OptionSlice;
  forbiddenAssumptions: OptionSlice;
  frictionTriggers: OptionSlice;
  emotionalBehavior: OptionSlice;
  abandonmentRules: OptionSlice;
  taskSuitability: TaskSuitabilitySlice;
}

export const STEP_TITLES = [
  "Product context",
  "Role",
  "Expertise",
  "Decision behavior",
  "Information needs",
  "Constraints & forbidden assumptions",
  "Friction triggers",
  "Emotional & trust behavior",
  "Abandonment & escalation",
  "Task suitability",
  "Validation",
  "Export",
] as const;

export type StepIndex = number; // 0..11
