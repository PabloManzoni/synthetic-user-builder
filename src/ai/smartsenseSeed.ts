// Real SmartSense context, used to seed believable mock AI suggestions.
//
// Sources (researched 2026):
//   - https://www.smartsense.co  (SmartSense by Digi — condition monitoring)
//   - https://www.smartsense.co/solutions/food-safety-monitoring
//   - https://www.digi.com/smartsense
//   - Internal repo: smartsense-one-experiment/app/docs/design/roles-and-personas.md
//
// SmartSense by Digi is an IoT condition-monitoring platform: wireless temperature,
// humidity and location sensors + cellular gateways + digital food-safety checklists,
// used across healthcare/pharma, retail/grocery, foodservice and transportation/cold-chain.
// The "Voyage" module tracks in-transit shipment temperature stability.

import type { SuggestedRole, Confidence } from "../state/types";

export const SMARTSENSE_SUMMARY =
  "SmartSense by Digi is an IoT condition-monitoring platform. Wireless temperature, humidity and " +
  "location sensors feed a real-time dashboard with alarming, analytics and digital food-safety " +
  "checklists. It is used across healthcare and pharmacy, grocery and retail, foodservice, and " +
  "transportation / cold-chain supply chains to protect product safety and prove compliance " +
  "(HACCP, FDA, USDA). The Voyage module tracks temperature stability of shipments in motion.";

export const SMARTSENSE_CONFIDENCE: Confidence = "high";

// Roles framed as *decision agents* (relationship to the domain), not personas.
export const SMARTSENSE_ROLES: SuggestedRole[] = [
  {
    name: "Cold-Chain Operations Coordinator",
    description:
      "Monitors temperature alerts across locations or shipments while juggling other operational duties. Acts fast on the first clear signal of a problem.",
    goodFor: "Reviewing alerts, deciding if an issue needs escalation, scanning current condition.",
    notFor: "Deep compliance audits, configuring monitoring rules, technical setup.",
    confidence: "high",
  },
  {
    name: "Multi-site Compliance Manager",
    description:
      "Oversees food-safety and temperature compliance across many locations. Compares sites, looks for the worst offender, cares about proof and audit trails.",
    goodFor: "Reviewing exceptions across sites, judging whether a site is at risk, interpreting reports.",
    notFor: "Frontline single-task logging, backend troubleshooting, gateway installation.",
    confidence: "high",
  },
  {
    name: "Food-Safety / Quality Reviewer",
    description:
      "Verifies that checklists, temperatures and corrective actions meet policy. Skeptical until evidence is clear; distrusts ambiguous status.",
    goodFor: "Interpreting whether an incident appears resolved, checking corrective actions, reviewing severity.",
    notFor: "Strategic analysis, admin configuration, tasks outside compliance scope.",
    confidence: "high",
  },
  {
    name: "Field Service Technician",
    description:
      "Installs and maintains gateways and sensors. Thinks in diagnostics: is this device online, when did it last report, what is the signal strength.",
    goodFor: "Checking device/sensor state, interpreting last-reading and connectivity feedback.",
    notFor: "Compliance decisions, multi-site reporting, business escalation calls.",
    confidence: "medium",
  },
  {
    name: "Org Administrator",
    description:
      "Sets up access, locations and integrations. Signs in sporadically for setup or audits and is easily overwhelmed by operational detail.",
    goodFor: "Bounded configuration reviews, access/permission checks.",
    notFor: "Real-time operational monitoring, incident triage, cold-chain decisions.",
    confidence: "medium",
  },
];

// Keyword-driven suggestion banks. The mock matches these against the product
// description / domain and merges hits into the option lists for steps 4–10.
export interface SuggestionBank {
  keywords: string[];
  decisionBehaviors: string[];
  informationNeeds: string[];
  forbiddenAssumptions: string[];
  frictionTriggers: string[];
  emotionalBehaviors: string[];
  abandonmentRules: string[];
  suitableTasks: string[];
}

export const SUGGESTION_BANKS: SuggestionBank[] = [
  {
    keywords: [
      "smartsense",
      "temperature",
      "cold chain",
      "cold-chain",
      "shipment",
      "voyage",
      "sensor",
      "alert",
      "alarm",
      "food safety",
      "haccp",
      "monitoring",
      "logistics",
      "compliance",
    ],
    decisionBehaviors: [
      "Scans alerts for the first clear signal of severity",
      "Trusts prominent warning states unless status is unclear",
      "Acts on temperature readings without checking the safe range",
      "Treats the most alarming value as the most important",
      "Escalates externally when status cannot be confirmed in the tool",
    ],
    informationNeeds: [
      "Shipment / asset status",
      "Alert severity",
      "Whether an alert is active, resolved, or historical",
      "Safe temperature range or threshold",
      "Latest sensor reading and its timestamp",
      "Affected route segment or location",
      "Recommended next action",
      "Responsible party",
    ],
    forbiddenAssumptions: [
      "Cannot assume a safe temperature range unless it is shown",
      "Cannot assume an alert is active unless its current state is shown",
      "Cannot assume the newest reading unless timestamp hierarchy is clear",
      "Cannot assume a route or location is affected unless linked to the alert",
      "Cannot assume an incident is resolved without a clear resolution state",
    ],
    frictionTriggers: [
      "Ambiguous alert severity",
      "Temperature reading without a visible threshold",
      "Conflicting or stale timestamps",
      "No clear resolution state on an incident",
      "Having to cross-check multiple views to answer one question",
    ],
    emotionalBehaviors: [
      "Feels responsible for avoiding spoilage or compliance failures",
      "Becomes skeptical after conflicting sensor data",
      "Feels relief after a clear resolved/confirmed state",
      "Feels pressure when escalation may be needed",
    ],
    abandonmentRules: [
      "Escalates externally if incident status cannot be confirmed in the product",
      "Considers the task unresolved if there is no visible next action",
      "Stops trusting the tool after repeated ambiguity but rarely abandons quickly",
    ],
    suitableTasks: [
      "Review shipment or asset alerts",
      "Determine whether an issue requires escalation",
      "Check current shipment or asset condition",
      "Interpret temperature or route anomalies",
      "Review whether an incident appears resolved",
    ],
  },
];
