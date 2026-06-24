import { useProfile } from "../state/profileStore";
import { BEHAVIOR_AXES } from "../ai/behaviorAxes";
import SpectrumSlider from "./SpectrumSlider";

// Each behavior axis is a 5-stop spectrum (slider) between two poles — no more
// contradictory checkboxes. Moving any slider commits all axes (others stay balanced).
export default function BehaviorAxes() {
  const { profile, dispatch } = useProfile();
  const axes = profile.behaviorAxes;

  return (
    <div className="space-y-6">
      {BEHAVIOR_AXES.map((a) => {
        const value = axes[a.key] ?? 2;
        const touched = a.key in axes;
        return (
          <SpectrumSlider
            key={a.key}
            leftLabel={a.left}
            rightLabel={a.right}
            value={value}
            touched={touched}
            description={a.statements[value]}
            onSelect={(i) => dispatch({ type: "setBehaviorAxis", key: a.key, value: i })}
          />
        );
      })}
    </div>
  );
}
