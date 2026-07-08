import "./SpinnerSurface.scss";

import type { PointerEventHandler, RefObject } from "react";

import SpinnerRotor from "./SpinnerRotor";
import type { SpinnerColorOption, SpinnerVariant } from "./spinnerTypes";

interface SpinnerSurfaceProps {
	bodyRef?: RefObject<HTMLButtonElement | null>;
	canvasRef?: RefObject<HTMLCanvasElement | null>;
	color: SpinnerColorOption;
	disabled?: boolean;
	mode?: "full" | "icon";
	onPointerCancel?: PointerEventHandler<HTMLButtonElement>;
	onPointerDown?: PointerEventHandler<HTMLButtonElement>;
	onPointerMove?: PointerEventHandler<HTMLButtonElement>;
	onPointerUp?: PointerEventHandler<HTMLButtonElement>;
	rotorRef?: RefObject<HTMLSpanElement | null>;
	variant: SpinnerVariant;
}

export default function SpinnerSurface({
	bodyRef,
	canvasRef,
	color,
	disabled,
	mode = "full",
	onPointerCancel,
	onPointerDown,
	onPointerMove,
	onPointerUp,
	rotorRef,
	variant,
}: SpinnerSurfaceProps) {
	return (
		<button
			ref={bodyRef}
			type="button"
			className={getSpinnerSurfaceClassName(mode)}
			disabled={disabled}
			onPointerCancel={disabled ? undefined : onPointerCancel}
			onPointerDown={disabled ? undefined : onPointerDown}
			onPointerMove={disabled ? undefined : onPointerMove}
			onPointerUp={disabled ? undefined : onPointerUp}
			aria-hidden={disabled ? "true" : undefined}
			aria-label="Flick the spinner"
		>
			<span className="spinner-fidget-stage">
				{canvasRef ? (
					<canvas ref={canvasRef} className="spinner-fidget-motion-canvas" />
				) : null}
				<SpinnerRotor
					color={color}
					preview={mode === "icon"}
					rotorRef={rotorRef}
					variant={variant}
				/>
			</span>
		</button>
	);
}

function getSpinnerSurfaceClassName(mode: "full" | "icon") {
	return mode === "icon"
		? "spinner-fidget-body is-icon"
		: "spinner-fidget-body";
}
