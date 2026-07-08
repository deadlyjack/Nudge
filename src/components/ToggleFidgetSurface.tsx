import "./ToggleFidgetSurface.scss";

import ToggleSwitchControl from "components/ToggleSwitchControl";

interface ToggleFidgetSurfaceProps {
	disabled?: boolean;
	enabled: boolean;
	mode?: "full" | "icon";
	onToggle?: () => void;
}

export default function ToggleFidgetSurface({
	disabled,
	enabled,
	mode = "full",
	onToggle,
}: ToggleFidgetSurfaceProps) {
	return (
		<div className={getToggleSurfaceClassName(mode)}>
			<ToggleSwitchControl
				disabled={disabled}
				enabled={enabled}
				onToggle={onToggle}
			/>
		</div>
	);
}

function getToggleSurfaceClassName(mode: "full" | "icon") {
	return mode === "icon" ? "toggle-fidget is-icon" : "toggle-fidget";
}
