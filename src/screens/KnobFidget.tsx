import FidgetShell from "components/FidgetShell";
import KnobFidgetSurface from "components/KnobFidgetSurface";
import type {
	KnobDetentImpulse,
	KnobVariant,
	KnobVariantId,
} from "fidgets/knob/knobTypes";
import { getKnobVariant } from "fidgets/knob/knobVariants";
import { getShortestAngleDelta, normalizeAngle } from "lib/angle";
import vibrate from "lib/haptics";
import sounds from "lib/sounds";
import { ChevronDown } from "lucide-react";
import type { MutableRefObject, PointerEvent } from "react";
import { useRef } from "react";

interface KnobFidgetProps {
	onBack: () => void;
	onOpenSelector?: () => void;
	variantId: KnobVariantId;
}

interface KnobDragState {
	lastPointerAngle: number;
	lastPointerTime: number;
	pressureAngle: number;
}

const INITIAL_KNOB_ANGLE = 24;
const KNOB_DETENT_THRESHOLD_RATIO = 0.58;
const KNOB_MAX_FEEDBACK_PULSES = 4;

export default function KnobFidget({
	onBack,
	onOpenSelector,
	variantId,
}: KnobFidgetProps) {
	const variant = getKnobVariant(variantId);
	const dialRef = useRef<HTMLButtonElement>(null);
	const markerRotorRef = useRef<HTMLSpanElement>(null);
	const motionRef = useRef<HTMLSpanElement>(null);
	const dragStateRef = useRef<KnobDragState | null>(null);
	const angleRef = useRef(getNearestDetentAngle(INITIAL_KNOB_ANGLE, variant));
	const detentSequenceRef = useRef(0);
	const idleDetentImpulse: KnobDetentImpulse = {
		sequence: 0,
		strength: 0,
	};

	return (
		<FidgetShell
			title={variant.label}
			accent={variant.visual.accent}
			headerEnd={
				onOpenSelector ? (
					<button
						type="button"
						className="fidget-shell-action"
						onClick={onOpenSelector}
						aria-label="Choose knob"
					>
						<ChevronDown size={24} strokeWidth={2.4} aria-hidden="true" />
					</button>
				) : null
			}
			onBack={onBack}
		>
			<KnobFidgetSurface
				angle={angleRef.current}
				detentImpulse={idleDetentImpulse}
				dialRef={dialRef}
				onPointerDown={(event) =>
					startTurn(
						event,
						dialRef.current,
						markerRotorRef.current,
						dragStateRef,
						angleRef,
					)
				}
				onPointerMove={(event) =>
					turnDial(
						event,
						dialRef.current,
						markerRotorRef.current,
						motionRef.current,
						dragStateRef,
						angleRef,
						detentSequenceRef,
						variant,
					)
				}
				onPointerUp={(event) =>
					stopTurn(
						event,
						dialRef.current,
						markerRotorRef.current,
						angleRef,
						dragStateRef,
					)
				}
				onPointerCancel={(event) =>
					stopTurn(
						event,
						dialRef.current,
						markerRotorRef.current,
						angleRef,
						dragStateRef,
					)
				}
				markerRotorRef={markerRotorRef}
				motionRef={motionRef}
				variant={variant}
			/>
		</FidgetShell>
	);
}

function startTurn(
	event: PointerEvent<HTMLButtonElement>,
	element: HTMLButtonElement | null,
	markerRotor: HTMLSpanElement | null,
	dragStateRef: MutableRefObject<KnobDragState | null>,
	angleRef: MutableRefObject<number>,
) {
	if (!element) {
		return;
	}

	event.currentTarget.setPointerCapture(event.pointerId);
	element.classList.add("is-active");

	const pointerAngle = getPointerAngle(event, element);

	if (pointerAngle === null) {
		return;
	}

	dragStateRef.current = {
		lastPointerAngle: pointerAngle,
		lastPointerTime: event.timeStamp,
		pressureAngle: 0,
	};
	applyKnobFrame(markerRotor, angleRef.current);
}

function turnDial(
	event: PointerEvent<HTMLButtonElement>,
	element: HTMLButtonElement | null,
	markerRotor: HTMLSpanElement | null,
	motion: HTMLSpanElement | null,
	dragStateRef: MutableRefObject<KnobDragState | null>,
	angleRef: MutableRefObject<number>,
	detentSequenceRef: MutableRefObject<number>,
	variant: KnobVariant,
) {
	const pointerAngle = getPointerAngle(event, element);
	const dragState = dragStateRef.current;

	if (pointerAngle === null || !dragState) {
		return;
	}

	const angleDelta = getShortestAngleDelta(
		dragState.lastPointerAngle,
		pointerAngle,
	);
	const elapsed = Math.max(1, event.timeStamp - dragState.lastPointerTime);
	const velocity = angleDelta / elapsed;
	const pressureAngle = dragState.pressureAngle + angleDelta;
	const detentMovement = getDetentMovement(pressureAngle, variant);

	dragStateRef.current = {
		lastPointerAngle: pointerAngle,
		lastPointerTime: event.timeStamp,
		pressureAngle: detentMovement.pressureAngle,
	};

	if (detentMovement.steps === 0) {
		return;
	}

	commitDetentMovement(
		detentMovement.steps,
		velocity,
		markerRotor,
		motion,
		angleRef,
		detentSequenceRef,
		variant,
	);
}

function stopTurn(
	event: PointerEvent<HTMLButtonElement>,
	element: HTMLButtonElement | null,
	markerRotor: HTMLSpanElement | null,
	angleRef: MutableRefObject<number>,
	dragStateRef: MutableRefObject<KnobDragState | null>,
) {
	if (event.currentTarget.hasPointerCapture(event.pointerId)) {
		event.currentTarget.releasePointerCapture(event.pointerId);
	}

	applyKnobFrame(markerRotor, angleRef.current);
	element?.classList.remove("is-active");
	dragStateRef.current = null;
}

function getPointerAngle(
	event: PointerEvent<HTMLButtonElement>,
	element: HTMLButtonElement | null,
) {
	if (!element) {
		return null;
	}

	const bounds = element.getBoundingClientRect();
	const x = event.clientX - bounds.left - bounds.width / 2;
	const y = event.clientY - bounds.top - bounds.height / 2;
	const degrees = Math.atan2(y, x) * (180 / Math.PI) + 90;

	return normalizeAngle(degrees);
}

function commitDetentMovement(
	steps: number,
	velocity: number,
	markerRotor: HTMLSpanElement | null,
	motion: HTMLSpanElement | null,
	angleRef: MutableRefObject<number>,
	detentSequenceRef: MutableRefObject<number>,
	variant: KnobVariant,
) {
	angleRef.current += steps * variant.detentInterval;
	applyKnobFrame(markerRotor, angleRef.current);

	scheduleDetentFeedback(
		motion,
		detentSequenceRef,
		getDetentIntensity(velocity, variant),
		Math.abs(steps),
		variant,
	);
}

function applyKnobFrame(markerRotor: HTMLSpanElement | null, angle: number) {
	markerRotor?.style.setProperty("transform", getMarkerRotorTransform(angle));
}

function getDetentMovement(pressureAngle: number, variant: KnobVariant) {
	const threshold = variant.detentInterval * KNOB_DETENT_THRESHOLD_RATIO;
	let nextPressureAngle = pressureAngle;
	let steps = 0;

	while (nextPressureAngle >= threshold) {
		steps += 1;
		nextPressureAngle -= variant.detentInterval;
	}

	while (nextPressureAngle <= -threshold) {
		steps -= 1;
		nextPressureAngle += variant.detentInterval;
	}

	return { pressureAngle: nextPressureAngle, steps };
}

function scheduleDetentFeedback(
	motion: HTMLSpanElement | null,
	detentSequenceRef: MutableRefObject<number>,
	intensity: number,
	steps: number,
	variant: KnobVariant,
) {
	window.setTimeout(() => {
		const feedbackCount = Math.min(steps, KNOB_MAX_FEEDBACK_PULSES);

		for (let index = 0; index < feedbackCount; index += 1) {
			triggerDetentImpact(motion, detentSequenceRef, intensity);
			vibrate(variant.hapticStrength);
			sounds.dial(variant.sound, intensity);
		}
	}, 0);
}

function triggerDetentImpact(
	motion: HTMLSpanElement | null,
	detentSequenceRef: MutableRefObject<number>,
	intensity: number,
) {
	if (!motion) {
		return;
	}

	const strength = getVisualDetentStrength(intensity);
	const sequence = detentSequenceRef.current + 1;
	const impactClassName = getImpactClassName(sequence);

	detentSequenceRef.current = sequence;
	motion.style.setProperty("--knob-impact", `${strength}`);
	motion.style.setProperty("--knob-impact-distance", `${strength * 0.8}px`);
	motion.style.setProperty("--knob-impact-scale", `${1 - strength * 0.002}`);
	motion.style.setProperty("--knob-impact-tilt", `${strength * 0.35}deg`);
	motion.dataset.knobImpact = String(sequence);
	motion.classList.remove("is-impact-a", "is-impact-b");
	motion.classList.add(impactClassName);
}

function getImpactClassName(sequence: number) {
	return sequence % 2 === 0 ? "is-impact-b" : "is-impact-a";
}

function getMarkerRotorTransform(angle: number) {
	return `translateZ(0) rotate(${angle}deg)`;
}

function getNearestDetentAngle(angle: number, variant: KnobVariant) {
	return Math.round(angle / variant.detentInterval) * variant.detentInterval;
}

function getDetentIntensity(velocity: number, variant: KnobVariant) {
	const normalizedVelocity =
		Math.abs(velocity) / Math.max(0.3, variant.detentInterval / 90);

	return Math.min(1.4, Math.max(0.35, 0.44 + normalizedVelocity * 0.72));
}

function getVisualDetentStrength(intensity: number) {
	return Math.min(0.22, Math.max(0.06, intensity * 0.14));
}
