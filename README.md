# Synthetic User Builder

A prototype web app that helps UX teams create **reusable synthetic user profiles** for controlled UX
simulations. A synthetic user is **not a persona** — it is a *constrained decision agent* that defines how a
user thinks, decides, hesitates, trusts, doubts, assumes, and gives up.

The app only **creates, calibrates, validates, edits, and exports** profiles. It does **not** run usability
tests, analyze flows, or generate findings. The exported profile is meant to be paired later with a separate
task objective in a different testing tool.

> Key rule the app enforces: a profile must describe **behavior and constraints**, never product-specific
> navigation or a task objective ("click the alert", "find shipment 101"). The app warns you when it detects
> task/navigation language and when the profile is too weak (e.g. no forbidden assumptions).

## Quick start

```bash
cd synthetic-user-builder
npm install
npm run dev      # http://localhost:5183
```

Build / preview production:

```bash
npm run build
npm run preview
```

## How it works

A 12-step guided wizard with a live profile preview that updates as you make selections:

1. **Product context** — search public context (mock AI), describe manually, or skip.
2. **Role** — pick one reusable operational role (AI-suggested, generic, or custom).
3. **Expertise & familiarity** — domain / technical / product-type / exact-product levels.
4. **Decision behavior** · 5. **Information needs** · 6. **Constraints & forbidden assumptions**
   · 7. **Friction triggers** · 8. **Emotional & trust behavior** · 9. **Abandonment & escalation**.
10. **Task suitability** — suitable vs unsuitable task types.
11. **Validation** — 11 scored dimensions (Strong / Needs refinement / Invalid), issues, and suggested fixes.
    Export is never blocked, but warnings are shown.
12. **Export** — Markdown, JSON, or a plain-text prompt block. Copy or download.

Every option step offers three groups: **AI suggested** · **Common** · **Custom** — all check/uncheck-able,
with editable, regenerable AI output.

## AI (Gemini, with offline fallback)

`research()` in `src/ai/mockAi.ts` calls the serverless function `api/ai.ts`, which proxies
**Google Gemini** (the API key lives only server-side). One call at "Search public context"
produces the product summary + per-step suggestion banks, stored on the profile and consumed by
every step. If there's no key or Gemini errors, it falls back to the deterministic mock below — so
the app always works.

Activate it by setting `GEMINI_API_KEY` (and optionally `GEMINI_MODEL`) in the Vercel project's
Environment Variables. Locally (Vite dev) there's no `/api`, so it uses the mock.

`src/ai/mockAi.ts` is also a deterministic, offline engine. It is seeded with **real SmartSense by Digi** context
(`src/ai/smartsenseSeed.ts`) so entering "SmartSense" / "Voyage" / cold-chain / temperature yields a believable
product summary and role families (Cold-Chain Operations Coordinator, Multi-site Compliance Manager,
Food-Safety / Quality Reviewer, Field Service Technician, Org Administrator). Any other product falls back to a
cautious generic inference plus generic options, so the app always works.

To wire a real model later, replace the function bodies in `mockAi.ts` (keep the signatures) with a Claude call
(`claude-opus-4-8`) via a thin backend proxy. Look for the `TODO(real-ai)` marker.

Sources: [smartsense.co](https://www.smartsense.co/) ·
[Food Safety Monitoring](https://www.smartsense.co/solutions/food-safety-monitoring) ·
[Digi SmartSense](https://www.digi.com/smartsense).

## Project structure

```
src/
  ai/          mockAi.ts · smartsenseSeed.ts · genericOptions.ts
  lib/         validation.ts · export.ts · useOptionStep.ts
  state/       profileStore.ts (reducer + context, localStorage draft) · types.ts
  components/  Stepper · StepShell · OptionGroup · SelectableOption · CustomOptionInput
               LiveProfilePreview · ValidationPanel · ExportPanel · WarningBanner
  steps/       Step1–Step3, Step6, Step10 (bespoke) + OptionStep + index.tsx (registry)
  App.tsx      3-pane layout, animated step transitions, bottom bar
```

## Tech

React + TypeScript + Vite, Tailwind CSS v4, Framer Motion. Local state only (a draft is auto-saved to
`localStorage`). No backend.

## Out of scope (prototype)

Running tests, analyzing flows, generating findings/reports, reading Figma/screenshots, simulations, a profile
library, comparing/variant profiles, auth, team collaboration, and database persistence.
