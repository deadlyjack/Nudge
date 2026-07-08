import type {
	KnobDetentImpulse,
	KnobVariant,
	KnobVisualProfile,
} from "fidgets/knob/knobTypes";
import type { CSSProperties, MutableRefObject } from "react";

interface KnobHardwareArtProps {
	detentImpulse: KnobDetentImpulse;
	markerRotorRef?: MutableRefObject<HTMLSpanElement | null>;
	markerRotorStyle: CSSProperties;
	motionRef?: MutableRefObject<HTMLSpanElement | null>;
	variant: KnobVariant;
}

interface KnobHardwareStyle extends CSSProperties {
	"--knob-accent": string;
	"--knob-base": string;
	"--knob-bevel-depth": string;
	"--knob-brush-density": string;
	"--knob-brush-opacity": string;
	"--knob-cap-inset": string;
	"--knob-chrome-contrast": string;
	"--knob-dark": string;
	"--knob-boss-opacity": string;
	"--knob-grip-opacity": string;
	"--knob-highlight": string;
	"--knob-impact": string;
	"--knob-impact-distance": string;
	"--knob-impact-scale": string;
	"--knob-impact-tilt": string;
	"--knob-indicator": string;
	"--knob-indicator-length": string;
	"--knob-indicator-radius": string;
	"--knob-indicator-top": string;
	"--knob-indicator-width": string;
	"--knob-light": string;
	"--knob-mid": string;
	"--knob-marker-inset": string;
	"--knob-polished-reflection-opacity": string;
	"--knob-reflection-strength": string;
	"--knob-shadow": string;
	"--knob-skirt-depth": string;
	"--knob-texture": string;
}

interface KnobIndicatorMetrics {
	length: number;
	markerInset: number;
	top: number;
	width: number;
}

export default function KnobHardwareArt({
	detentImpulse,
	markerRotorRef,
	markerRotorStyle,
	motionRef,
	variant,
}: KnobHardwareArtProps) {
	const visual = variant.visual;
	const style = getHardwareStyle(visual, detentImpulse.strength);
	const motionClassName = getMotionClassName(detentImpulse);

	return (
		<span className="knob-fidget-hardware" style={style} aria-hidden="true">
			<span
				ref={motionRef}
				className={motionClassName}
				data-knob-impact={detentImpulse.sequence}
			>
				<span
					className="knob-fidget-hardware-body"
					data-knob-body={visual.bodyShape}
					data-knob-finish={visual.finish}
					data-knob-grip={visual.gripType}
					data-knob-material={visual.material}
				>
					<span className="knob-fidget-skirt" />
					<span className="knob-fidget-sidewall">
						<span className="knob-fidget-side-grip" />
					</span>
					<span className="knob-fidget-cap">
						<span className="knob-fidget-cap-shadow" />
						<span className="knob-fidget-brush" />
						<span className="knob-fidget-reflection" />
						<span className="knob-fidget-bevel-ring" />
						<span className="knob-fidget-center-boss" />
					</span>
					<span
						ref={markerRotorRef}
						className="knob-fidget-marker-rotor"
						style={markerRotorStyle}
					>
						<span className="knob-fidget-indicator" />
					</span>
				</span>
			</span>
		</span>
	);
}

function getHardwareStyle(
	visual: KnobVisualProfile,
	impact: number,
): KnobHardwareStyle {
	const indicatorMetrics = getIndicatorMetrics(visual);

	return {
		"--knob-accent": visual.accent,
		"--knob-base": visual.baseColor,
		"--knob-bevel-depth": `${visual.bevelDepth}px`,
		"--knob-brush-density": `${visual.brushDensity}`,
		"--knob-brush-opacity": `${0.18 + visual.reflectionStrength * 0.32}`,
		"--knob-cap-inset": `${visual.capInset}%`,
		"--knob-chrome-contrast": `${visual.chromeContrast}`,
		"--knob-dark": visual.darkColor,
		"--knob-boss-opacity": `${0.68 + visual.chromeContrast * 0.22}`,
		"--knob-grip-opacity": `${0.34 + visual.chromeContrast * 0.42}`,
		"--knob-highlight": visual.highlightColor,
		"--knob-impact": `${impact}`,
		"--knob-impact-distance": `${impact * 0.8}px`,
		"--knob-impact-scale": `${1 - impact * 0.002}`,
		"--knob-impact-tilt": `${impact * 0.35}deg`,
		"--knob-indicator": visual.indicatorColor,
		"--knob-indicator-length": `${indicatorMetrics.length}%`,
		"--knob-indicator-radius": `${visual.indicatorRadius}px`,
		"--knob-indicator-top": `${indicatorMetrics.top}%`,
		"--knob-indicator-width": `${indicatorMetrics.width}%`,
		"--knob-light": visual.lightColor,
		"--knob-mid": visual.midColor,
		"--knob-marker-inset": `${indicatorMetrics.markerInset}%`,
		"--knob-polished-reflection-opacity": `${visual.reflectionStrength + 0.08}`,
		"--knob-reflection-strength": `${visual.reflectionStrength}`,
		"--knob-shadow": visual.shadowColor,
		"--knob-skirt-depth": `${visual.skirtDepth}px`,
		"--knob-texture": visual.textureColor,
	};
}

function getIndicatorMetrics(visual: KnobVisualProfile): KnobIndicatorMetrics {
	const scale = visual.indicatorScale;
	const bevelSafePadding = clamp(visual.bevelDepth * 0.28, 1.2, 3.2);
	const markerInset = clamp(visual.capInset + bevelSafePadding, 10, 23);
	const length = clamp(getIndicatorBaseLength(visual) * scale, 7.5, 14);
	const width = clamp(
		getIndicatorBaseWidth(visual) *
			getIndicatorBodyWidthMultiplier(visual) *
			scale,
		1.2,
		4.4,
	);
	const top = clamp(0.65 + visual.bevelDepth * 0.05, 0.7, 1.7);

	return {
		length,
		markerInset,
		top,
		width,
	};
}

function getIndicatorBaseLength(visual: KnobVisualProfile) {
	switch (visual.bodyShape) {
		case "carbon-composite":
			return 10.6;
		case "domed":
			return 9.2;
		case "fluted":
			return 8.8;
		case "instrument-skirt":
			return 12.2;
		case "polished":
			return 12;
		case "scalloped":
			return 10.8;
		case "soft":
			return 8.8;
		default:
			return 10;
	}
}

function getIndicatorBaseWidth(visual: KnobVisualProfile) {
	switch (visual.indicatorShape) {
		case "arrow":
			return 3.8;
		case "groove":
			return 1.7;
		case "line":
			return 1.8;
		case "notch":
			return 2.6;
		case "pill":
			return 2.3;
		case "slot":
			return 1.55;
	}
}

function getIndicatorBodyWidthMultiplier(visual: KnobVisualProfile) {
	switch (visual.material) {
		case "carbon-composite":
		case "polished-chrome":
		case "anodized-aluminum":
			return 0.82;
		case "bakelite":
		case "matte-plastic":
		case "olive-gunmetal":
			return 1.08;
		case "ceramic-ivory":
			return 0.95;
		default:
			return 1;
	}
}

function getMotionClassName(detentImpulse: KnobDetentImpulse) {
	const classNames = ["knob-fidget-hardware-motion"];

	if (detentImpulse.strength > 0) {
		classNames.push(getImpactClassName(detentImpulse.sequence));
	}

	return classNames.join(" ");
}

function getImpactClassName(sequence: number) {
	return sequence % 2 === 0 ? "is-impact-b" : "is-impact-a";
}

function clamp(value: number, min: number, max: number) {
	return Math.min(max, Math.max(min, value));
}
