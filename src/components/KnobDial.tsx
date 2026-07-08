import "./KnobDial.scss";

import type { KnobDetentImpulse, KnobVariant } from "fidgets/knob/knobTypes";
import type {
	CSSProperties,
	HTMLAttributes,
	MutableRefObject,
	PointerEventHandler,
	RefObject,
} from "react";
import KnobHardwareArt from "./KnobHardwareArt";

interface KnobDialProps {
	active?: boolean;
	angle: number;
	detentImpulse?: KnobDetentImpulse;
	dialRef?: RefObject<HTMLButtonElement | null>;
	disabled?: boolean;
	markerRotorRef?: MutableRefObject<HTMLSpanElement | null>;
	motionRef?: MutableRefObject<HTMLSpanElement | null>;
	onPointerCancel?: PointerEventHandler<HTMLButtonElement>;
	onPointerDown?: PointerEventHandler<HTMLButtonElement>;
	onPointerMove?: PointerEventHandler<HTMLButtonElement>;
	onPointerUp?: PointerEventHandler<HTMLButtonElement>;
	variant: KnobVariant;
}

interface KnobDialStyle extends CSSProperties {
	"--knob-angle": string;
}

interface KnobMarkerRotorStyle extends CSSProperties {
	transform: string;
}

const idleDetentImpulse: KnobDetentImpulse = {
	sequence: 0,
	strength: 0,
};

export default function KnobDial({
	active,
	angle,
	detentImpulse = idleDetentImpulse,
	dialRef,
	disabled,
	markerRotorRef,
	motionRef,
	onPointerCancel,
	onPointerDown,
	onPointerMove,
	onPointerUp,
	variant,
}: KnobDialProps) {
	const className = getKnobClassName(active);
	const style = getKnobStyle(angle);
	const markerRotorStyle = getMarkerRotorStyle(angle);
	const content = renderKnobHardware(
		detentImpulse,
		markerRotorRef,
		markerRotorStyle,
		motionRef,
		variant,
	);
	const dataAttributes = getKnobDataAttributes(variant);

	if (disabled) {
		const previewProps: HTMLAttributes<HTMLSpanElement> = {
			"aria-hidden": "true",
			className,
			style,
			...dataAttributes,
		};

		return <span {...previewProps}>{content}</span>;
	}

	return (
		<button
			ref={dialRef}
			type="button"
			className={className}
			style={style}
			{...dataAttributes}
			onPointerDown={disabled ? undefined : onPointerDown}
			onPointerMove={disabled ? undefined : onPointerMove}
			onPointerUp={disabled ? undefined : onPointerUp}
			onPointerCancel={disabled ? undefined : onPointerCancel}
			aria-label="Turn the fidget dial"
		>
			{content}
		</button>
	);
}

function getKnobClassName(active?: boolean) {
	const classNames = ["knob-fidget-dial"];

	if (active) {
		classNames.push("is-active");
	}

	return classNames.join(" ");
}

function getKnobStyle(angle: number): KnobDialStyle {
	return { "--knob-angle": `${angle}deg` };
}

function getMarkerRotorStyle(angle: number): KnobMarkerRotorStyle {
	return { transform: `translateZ(0) rotate(${angle}deg)` };
}

function getKnobDataAttributes(variant: KnobVariant) {
	return {
		"data-knob-body": variant.visual.bodyShape,
		"data-knob-finish": variant.visual.finish,
		"data-knob-grip": variant.visual.gripType,
		"data-knob-indicator": variant.visual.indicatorShape,
		"data-knob-material": variant.visual.material,
		"data-knob-variant": variant.id,
	};
}

function renderKnobHardware(
	detentImpulse: KnobDetentImpulse,
	markerRotorRef: MutableRefObject<HTMLSpanElement | null> | undefined,
	markerRotorStyle: KnobMarkerRotorStyle,
	motionRef: MutableRefObject<HTMLSpanElement | null> | undefined,
	variant: KnobVariant,
) {
	return (
		<KnobHardwareArt
			detentImpulse={detentImpulse}
			markerRotorRef={markerRotorRef}
			markerRotorStyle={markerRotorStyle}
			motionRef={motionRef}
			variant={variant}
		/>
	);
}
