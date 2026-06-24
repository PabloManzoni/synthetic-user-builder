import { createContext, useContext } from "react";

/** Lets any step navigate the wizard (e.g. validation verdicts → their category). */
export const WizardNavContext = createContext<(step: number) => void>(() => {});
export const useWizardNav = () => useContext(WizardNavContext);
