import "./ToggleSwitchControl.scss";

interface ToggleSwitchControlProps {
	disabled?: boolean;
	enabled: boolean;
	onToggle?: () => void;
}

export default function ToggleSwitchControl({
	disabled,
	enabled,
	onToggle,
}: ToggleSwitchControlProps) {
	const className = getToggleClassName(enabled);

	return (
		<button
			type="button"
			className={className}
			onClick={disabled ? undefined : onToggle}
			aria-label="Toggle fidget switch"
			aria-pressed={enabled}
			aria-hidden={disabled ? "true" : undefined}
			disabled={disabled}
		>
			<span className="toggle-fidget-thumb" />
		</button>
	);
}

function getToggleClassName(enabled: boolean) {
	const classNames = ["toggle-fidget-button"];

	if (enabled) {
		classNames.push("is-on");
	}

	return classNames.join(" ");
}
