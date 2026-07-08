import "./CounterFidgetSurface.scss";

interface CounterFidgetSurfaceProps {
	disabled?: boolean;
	mode?: "full" | "icon";
	onCount?: () => void;
}

export default function CounterFidgetSurface({
	disabled,
	mode = "full",
	onCount,
}: CounterFidgetSurfaceProps) {
	return (
		<div className={getCounterSurfaceClassName(mode)}>
			<button
				type="button"
				className="counter-fidget-button"
				onClick={disabled ? undefined : onCount}
				aria-label={getCounterLabel(disabled)}
				aria-hidden={disabled ? "true" : undefined}
				disabled={disabled}
			/>
		</div>
	);
}

function getCounterSurfaceClassName(mode: "full" | "icon") {
	return mode === "icon" ? "counter-fidget is-icon" : "counter-fidget";
}

function getCounterLabel(disabled?: boolean) {
	if (disabled) {
		return "Counter fidget preview";
	}

	return "Tap counter";
}
