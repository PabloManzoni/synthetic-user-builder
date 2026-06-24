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

/** Context-aware option suggestions per step (from real AI or the mock). */
export interface AiSuggestions {
  roles: SuggestedRole[];
  decisionBehaviors: string[];
  informationNeeds: string[];
  forbiddenAssumptions: string[];
  frictionTriggers: string[];
  emotionalBehaviors: string[];
  abandonmentRules: string[];
  suitableTasks: string[];
  /** A curated subset of each list — what "Select for me" picks (not all). */
  recommended?: {
    decisionBehaviors: string[];
    informationNeeds: string[];
    forbiddenAssumptions: string[];
    frictionTriggers: string[];
    emotionalBehaviors: string[];
    abandonmentRules: string[];
    suitableTasks: string[];
  };
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
  /** AI-generated per-step suggestions (null until research runs; mock fills it too). */
  aiSuggestions: AiSuggestions | null;
  /** "ai" when the real model produced suggestions, "mock" for the offline engine. */
  aiSource: "ai" | "mock" | null;
}

export interface RoleSlice {
  /** Multiple roles can be selected (AI, common, or custom). */
  selected: string[];
  /** role name → its description, for export/preview. */
  descriptions: Record<string, string>;
  /** Custom role names the user added (the removable pool). */
  custom: string[];
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

/** Rich narrative written by AI from the user's selections ("Complete with AI"). */
export interface GeneratedProfile {
  primaryMotivation: string;
  decisionStyle: string;
  attentionPattern: string;
  trustPattern: string;
  behaviorUnderPressure: string;
  toleranceForAmbiguity: string;
  commonWrongAssumptions: string[];
  calibrationNotes: string;
  unsuitableTaskTypes: string[];
}

export interface SyntheticProfile {
  profileName: string;
  primaryMotivation: string;
  /** Set by "Complete with AI"; export prefers these when present. */
  generated: GeneratedProfile | null;
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
