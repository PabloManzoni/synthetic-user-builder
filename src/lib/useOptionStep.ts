import { useProfile, type OptionKey } from "../state/profileStore";

/** Wiring helper for the 7 multi-select option steps. */
export function useOptionStep(key: OptionKey) {
  const { profile, dispatch } = useProfile();
  const slice = profile[key];
  return {
    slice,
    selected: slice.selected,
    custom: slice.custom,
    toggle: (value: string) => dispatch({ type: "toggleOption", key, value }),
    setSelected: (values: string[]) => dispatch({ type: "setSelected", key, values }),
    addCustom: (value: string) => {
      dispatch({ type: "addCustom", key, value });
      dispatch({ type: "toggleOption", key, value }); // select on add
    },
    removeCustom: (value: string) => dispatch({ type: "removeCustom", key, value }),
    setGenerated: (generated: string) => dispatch({ type: "setGenerated", key, generated }),
  };
}
