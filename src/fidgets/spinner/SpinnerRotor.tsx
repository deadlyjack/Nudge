import "./SpinnerRotor.scss";

import type { CSSProperties, MutableRefObject } from "react";

import type { SpinnerColorOption, SpinnerVariant } from "./spinnerTypes";

interface SpinnerRotorProps {
	color: SpinnerColorOption;
	preview?: boolean;
	rotorRef?: MutableRefObject<HTMLSpanElement | null>;
	variant: SpinnerVariant;
}

interface SpinnerRotorStyle extends CSSProperties {
	"--spinner-accent": string;
	"--spinner-asset": string;
	"--spinner-deep": string;
	"--spinner-light": string;
	"--spinner-lobe-clarity": string;
	"--spinner-origin-x": string;
	"--spinner-origin-y": string;
	"--spinner-ring": string;
	"--spinner-shadow": string;
}

export default function SpinnerRotor({
	color,
	preview = false,
	rotorRef,
	variant,
}: SpinnerRotorProps) {
	return (
		<span
			ref={rotorRef}
			className="spinner-rotor"
			data-spinner-asset={variant.visual.assetIndex}
			data-spinner-preview={preview ? "true" : "false"}
			style={getSpinnerRotorStyle(color, variant)}
		>
			<span
				className="spinner-rotor-art"
				data-testid="spinner-rotor-art"
				aria-hidden="true"
			/>
		</span>
	);
}

function getSpinnerRotorStyle(
	color: SpinnerColorOption,
	variant: SpinnerVariant,
): SpinnerRotorStyle {
	return {
		"--spinner-accent": color.accent,
		"--spinner-asset": `url("${variant.visual.assetSrc}")`,
		"--spinner-deep": color.deep,
		"--spinner-light": color.light,
		"--spinner-lobe-clarity": "1",
		"--spinner-origin-x": `${variant.visual.originOffset.x * 100}%`,
		"--spinner-origin-y": `${variant.visual.originOffset.y * 100}%`,
		"--spinner-ring": color.ring,
		"--spinner-shadow": "rgba(0, 0, 0, 0.22)",
	};
}
