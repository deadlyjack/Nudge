import "./SpinnerRotor.scss";

import type { CSSProperties, MutableRefObject } from "react";

import type { SpinnerColorOption, SpinnerVariant } from "./spinnerTypes";

interface SpinnerRotorProps {
	angle?: number;
	color: SpinnerColorOption;
	heroHidden?: boolean;
	heroId?: string;
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
	transform?: string;
}

export default function SpinnerRotor({
	angle = 0,
	color,
	heroHidden,
	heroId,
	preview = false,
	rotorRef,
	variant,
}: SpinnerRotorProps) {
	return (
		<span
			ref={rotorRef}
			className="spinner-rotor"
			data-fidget-hero={heroId}
			data-fidget-hero-hidden={heroHidden ? "true" : undefined}
			data-spinner-asset={variant.visual.assetIndex}
			data-spinner-preview={preview ? "true" : "false"}
			style={getSpinnerRotorStyle(color, variant, angle)}
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
	angle: number,
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
		transform: `translateZ(0) rotate(${angle}deg)`,
	};
}
