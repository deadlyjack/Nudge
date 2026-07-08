import "./KnobFidgetSurface.scss";

import KnobDial from "components/KnobDial";
import type { KnobDetentImpulse, KnobVariant } from "fidgets/knob/knobTypes";
import { defaultKnobVariant } from "fidgets/knob/knobVariants";
import type { MutableRefObject, PointerEventHandler, RefObject } from "react";

interface KnobFidgetSurfaceProps {
	active?: boolean;
	angle: number;
	detentImpulse?: KnobDetentImpulse;
	dialRef?: RefObject<HTMLButtonElement | null>;
	disabled?: boolean;
	markerRotorRef?: MutableRefObject<HTMLSpanElement | null>;
	mode?: "full" | "icon";
	motionRef?: MutableRefObject<HTMLSpanElement | null>;
	onPointerCancel?: PointerEventHandler<HTMLButtonElement>;
	onPointerDown?: PointerEventHandler<HTMLButtonElement>;
	onPointerMove?: PointerEventHandler<HTMLButtonElement>;
	onPointerUp?: PointerEventHandler<HTMLButtonElement>;
	variant?: KnobVariant;
}

export default function KnobFidgetSurface({
	active,
	angle,
	detentImpulse,
	dialRef,
	disabled,
	markerRotorRef,
	mode = "full",
	motionRef,
	onPointerCancel,
	onPointerDown,
	onPointerMove,
	onPointerUp,
	variant = defaultKnobVariant,
}: KnobFidgetSurfaceProps) {
	return (
		<div className={getKnobSurfaceClassName(mode)}>
			<KnobDial
				active={active}
				angle={angle}
				detentImpulse={detentImpulse}
				dialRef={dialRef}
				disabled={disabled}
				markerRotorRef={markerRotorRef}
				motionRef={motionRef}
				onPointerCancel={onPointerCancel}
				onPointerDown={onPointerDown}
				onPointerMove={onPointerMove}
				onPointerUp={onPointerUp}
				variant={variant}
			/>
		</div>
	);
}

function getKnobSurfaceClassName(mode: "full" | "icon") {
	return mode === "icon" ? "knob-fidget is-icon" : "knob-fidget";
}
