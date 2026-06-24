import {
  createContext,
  useContext,
  useReducer,
  type ReactNode,
  createElement,
} from "react";
import type {
  SyntheticProfile,
  OptionSlice,
  ProductContext,
  RoleSlice,
  ExpertiseSlice,
  TaskSuitabilitySlice,
  AiSuggestions,
} from "./types";
import { randomProfileName } from "../lib/random";
import { axisStatements } from "../ai/behaviorAxes";

const emptyOption = (): OptionSlice => ({ selected: [], custom: [], generated: "" });

export type SuggestionCategory =
  | "decisionBehaviors"
  | "informationNeeds"
  | "forbiddenAssumptions"
  | "frictionTriggers"
  | "emotionalBehaviors"
  | "abandonmentRules"
  | "suitableTasks";

const emptyAiSuggestions = (): AiSuggestions => ({
  roles: [],
  decisionBehaviors: [],
  informationNeeds: [],
  forbiddenAssumptions: [],
  frictionTriggers: [],
  emotionalBehaviors: [],
  abandonmentRules: [],
  suitableTasks: [],
  recommended: {
    decisionBehaviors: [],
    informationNeeds: [],
    forbiddenAssumptions: [],
    frictionTriggers: [],
    emotionalBehaviors: [],
    abandonmentRules: [],
    suitableTasks: [],
  },
});

/** Fresh profile with a pre-filled random name so the field is never empty. */
const makeInitial = (): SyntheticProfile => ({ ...initialProfile, profileName: randomProfileName() });

const initialProfile: SyntheticProfile = {
  profileName: "",
  primaryMotivation: "",
  behaviorAxes: {},
  generated: null,
  productContext: {
    clientName: "",
    productName: "",
    businessDomain: "",
    manualDescription: "",
    knownPrimaryUsers: "",
    knownWorkflows: "",
    knownRiskAreas: "",
    researchMode: "search",
    aiSummary: "",
    aiConfidence: null,
    researched: false,
    researchFailed: false,
    aiSuggestions: null,
    aiSource: null,
  },
  role: { selected: [], descriptions: {}, custom: [] },
  expertise: {
    domainExpertise: "",
    technicalProficiency: "",
    productTypeFamiliarity: "",
    exactProductFamiliarity: "",
    interpretation: "",
  },
  decisionBehavior: emptyOption(),
  informationNeeds: emptyOption(),
  constraints: emptyOption(),
  forbiddenAssumptions: emptyOption(),
  frictionTriggers: emptyOption(),
  emotionalBehavior: emptyOption(),
  abandonmentRules: emptyOption(),
  taskSuitability: {
    suitable: [],
    unsuitable: [],
    customSuitable: [],
    customUnsuitable: [],
  },
};

type OptionKey =
  | "decisionBehavior"
  | "informationNeeds"
  | "constraints"
  | "forbiddenAssumptions"
  | "frictionTriggers"
  | "emotionalBehavior"
  | "abandonmentRules";

type Action =
  | { type: "patchTop"; patch: Partial<Pick<SyntheticProfile, "profileName" | "primaryMotivation">> }
  | { type: "setGeneratedProfile"; value: SyntheticProfile["generated"] }
  | { type: "setBehaviorAxis"; key: string; value: number }
  | { type: "patchProductContext"; patch: Partial<ProductContext> }
  | { type: "setCategorySuggestions"; category: SuggestionCategory; suggestions: string[]; recommended: string[] }
  | { type: "toggleRole"; name: string; description: string }
  | { type: "addCustomRole"; name: string; description: string }
  | { type: "removeCustomRole"; name: string }
  | { type: "patchExpertise"; patch: Partial<ExpertiseSlice> }
  | { type: "toggleOption"; key: OptionKey; value: string }
  | { type: "setSelected"; key: OptionKey; values: string[] }
  | { type: "setGenerated"; key: OptionKey; generated: string }
  | { type: "addCustom"; key: OptionKey; value: string }
  | { type: "removeCustom"; key: OptionKey; value: string }
  | { type: "patchTaskSuitability"; patch: Partial<TaskSuitabilitySlice> }
  | { type: "toggleTask"; field: "suitable" | "unsuitable"; value: string }
  | { type: "reset" };

const toggle = (arr: string[], value: string) =>
  arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];

function reducer(state: SyntheticProfile, action: Action): SyntheticProfile {
  switch (action.type) {
    case "patchTop":
      return { ...state, ...action.patch };
    case "setGeneratedProfile":
      return { ...state, generated: action.value };
    case "setBehaviorAxis": {
      const behaviorAxes = { ...state.behaviorAxes, [action.key]: action.value };
      const statements = axisStatements(behaviorAxes);
      return {
        ...state,
        behaviorAxes,
        decisionBehavior: { ...state.decisionBehavior, selected: statements, generated: statements.join(" ") },
      };
    }
    case "patchProductContext":
      return { ...state, productContext: { ...state.productContext, ...action.patch } };
    case "setCategorySuggestions": {
      const cur = state.productContext.aiSuggestions ?? emptyAiSuggestions();
      const recommended = { ...(cur.recommended ?? emptyAiSuggestions().recommended!) };
      recommended[action.category] = action.recommended;
      return {
        ...state,
        productContext: {
          ...state.productContext,
          aiSuggestions: { ...cur, [action.category]: action.suggestions, recommended },
          aiSource: "ai",
        },
      };
    }
    case "toggleRole":
      return {
        ...state,
        role: {
          ...state.role,
          selected: toggle(state.role.selected, action.name),
          descriptions: { ...state.role.descriptions, [action.name]: action.description },
        },
      };
    case "addCustomRole": {
      const name = action.name.trim();
      if (!name) return state;
      return {
        ...state,
        role: {
          selected: state.role.selected.includes(name) ? state.role.selected : [...state.role.selected, name],
          custom: state.role.custom.includes(name) ? state.role.custom : [...state.role.custom, name],
          descriptions: { ...state.role.descriptions, [name]: action.description },
        },
      };
    }
    case "removeCustomRole": {
      const { [action.name]: _drop, ...rest } = state.role.descriptions;
      return {
        ...state,
        role: {
          selected: state.role.selected.filter((n) => n !== action.name),
          custom: state.role.custom.filter((n) => n !== action.name),
          descriptions: rest,
        },
      };
    }
    case "patchExpertise":
      return { ...state, expertise: { ...state.expertise, ...action.patch } };
    case "toggleOption":
      return {
        ...state,
        [action.key]: {
          ...state[action.key],
          selected: toggle(state[action.key].selected, action.value),
        },
      };
    case "setSelected":
      return { ...state, [action.key]: { ...state[action.key], selected: action.values } };
    case "setGenerated":
      return { ...state, [action.key]: { ...state[action.key], generated: action.generated } };
    case "addCustom": {
      const v = action.value.trim();
      if (!v || state[action.key].custom.includes(v)) return state;
      return { ...state, [action.key]: { ...state[action.key], custom: [...state[action.key].custom, v] } };
    }
    case "removeCustom":
      return {
        ...state,
        [action.key]: {
          ...state[action.key],
          custom: state[action.key].custom.filter((v) => v !== action.value),
        },
      };
    case "patchTaskSuitability":
      return { ...state, taskSuitability: { ...state.taskSuitability, ...action.patch } };
    case "toggleTask":
      return {
        ...state,
        taskSuitability: {
          ...state.taskSuitability,
          [action.field]: toggle(state.taskSuitability[action.field], action.value),
        },
      };
    case "reset":
      return makeInitial();
    default:
      return state;
  }
}

interface Store {
  profile: SyntheticProfile;
  dispatch: React.Dispatch<Action>;
}

const ProfileContext = createContext<Store | null>(null);

export const DRAFT_KEY = "synthetic-user-builder.draft";

function loadDraft(): SyntheticProfile {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Guard against drafts saved with an older role shape (single → multi-select).
      const role = Array.isArray(parsed?.role?.selected) ? parsed.role : initialProfile.role;
      return { ...initialProfile, ...parsed, role, profileName: parsed.profileName || randomProfileName() };
    }
  } catch {
    /* ignore corrupt draft */
  }
  return makeInitial();
}

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, dispatch] = useReducer(reducer, initialProfile, loadDraft);
  return createElement(ProfileContext.Provider, { value: { profile, dispatch } }, children);
}

export function useProfile(): Store {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error("useProfile must be used within ProfileProvider");
  return ctx;
}

export type { OptionKey };
