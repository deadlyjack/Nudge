import "./SpinnerFidget.scss";

import FidgetShell from "components/FidgetShell";
import vibrate from "lib/haptics";
import { ChevronDown } from "lucide-react";
import type { MutableRefObject, PointerEvent } from "react";
import { useEffect, useMemo, useRef } from "react";

import createSpinnerAudio from "./audio/createSpinnerAudio";
import type { SpinnerAudioController } from "./audio/spinnerAudioTypes";
import SpinnerSurface from "./SpinnerSurface";
import {
	clearSpinnerMotionCanvas,
	drawSpinnerMotionBlur,
} from "./spinnerMotion";
import {
	addPointerSample,
	advanceSpinnerFrames,
	clampAngularVelocity,
	getDirectedAngleDelta,
	getPointerAngle,
	getPointerMovementDirection,
	getSampledUnwrappedAngularVelocity,
	getTickCrossings,
	normalizeAngle,
	shouldStartSpinnerDrag,
} from "./spinnerPhysics";
import {
	formatSpinnerSpeed,
	readBestSpinnerSpeed,
	writeBestSpinnerSpeed,
} from "./spinnerStats";
import type {
	SpinnerColorOption,
	SpinnerDragState,
	SpinnerFrame,
	SpinnerVariant,
	SpinnerVariantId,
} from "./spinnerTypes";
import { getSpinnerVariant } from "./spinnerVariants";

interface SpinnerFidgetProps {
	onBack: () => void;
	onOpenSelector?: () => void;
	variantId: SpinnerVariantId;
}

interface SpinnerStatsRefs {
	bestSpeedRef: MutableRefObject<number>;
	bestValueRef: MutableRefObject<HTMLSpanElement | null>;
	displayedAtRef: MutableRefObject<number>;
	displayedBestSpeedRef: MutableRefObject<number>;
	displayedSpeedRef: MutableRefObject<number>;
	speedValueRef: MutableRefObject<HTMLSpanElement | null>;
}

interface SpinnerMotionRefs {
	blurActiveRef: MutableRefObject<boolean>;
	displayedAngleRef: MutableRefObject<number | null>;
}

const SPINNER_SPEED_DISPLAY_INTERVAL_MS = 80;
const SPINNER_MAX_ANIMATION_FRAME_SECONDS = 0.18;
const SPINNER_BEST_FEEDBACK_PATTERN = [4, 22, 8];

export default function SpinnerFidget({
	onBack,
	onOpenSelector,
	variantId,
}: SpinnerFidgetProps) {
	const activeVariant = useMemo(
		() => getSpinnerVariant(variantId),
		[variantId],
	);
	const activeColor = activeVariant.color;
	const spinnerRef = useRef<HTMLButtonElement>(null);
	const rotorRef = useRef<HTMLSpanElement>(null);
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const speedValueRef = useRef<HTMLSpanElement>(null);
	const bestValueRef = useRef<HTMLSpanElement>(null);
	const animationFrameRef = useRef<number | null>(null);
	const dragVisualFrameRef = useRef<number | null>(null);
	const pendingDragFrameRef = useRef<SpinnerFrame | null>(null);
	const previousFrameTimeRef = useRef<number | null>(null);
	const dragStateRef = useRef<SpinnerDragState | null>(null);
	const animationRemainderRef = useRef(0);
	const carryVelocityRef = useRef(0);
	const lastHapticTickRef = useRef(0);
	const audioRef = useRef<SpinnerAudioController | null>(null);
	const frameRef = useRef<SpinnerFrame>({ angle: 0, angularVelocity: 0 });
	const blurActiveRef = useRef(false);
	const displayedAngleRef = useRef<number | null>(null);
	const bestSpeedRef = useRef(0);
	const displayedSpeedRef = useRef(-1);
	const displayedBestSpeedRef = useRef(-1);
	const displayedAtRef = useRef(0);
	const motionRefs = useMemo(
		() => ({
			blurActiveRef,
			displayedAngleRef,
		}),
		[],
	);
	const statsRefs = useMemo(
		() => ({
			bestSpeedRef,
			bestValueRef,
			displayedAtRef,
			displayedBestSpeedRef,
			displayedSpeedRef,
			speedValueRef,
		}),
		[],
	);

	useEffect(() => {
		const audio = createSpinnerAudio(activeVariant.audio);

		audioRef.current = audio;

		return () => {
			if (audioRef.current === audio) {
				audioRef.current = null;
			}

			audio.dispose();
		};
	}, [activeVariant.audio]);

	useEffect(() => {
		let mounted = true;

		cancelSpinnerAnimation(animationFrameRef);
		cancelPendingDragFrame(dragVisualFrameRef, pendingDragFrameRef);
		dragStateRef.current = null;
		animationRemainderRef.current = 0;
		previousFrameTimeRef.current = null;
		frameRef.current = {
			angle: frameRef.current.angle,
			angularVelocity: 0,
		};
		bestSpeedRef.current = 0;
		displayedSpeedRef.current = -1;
		displayedBestSpeedRef.current = -1;
		displayedAtRef.current = 0;
		resetSpinnerMotion(canvasRef.current, rotorRef.current, motionRefs);
		applySpinnerFrame(
			rotorRef.current,
			canvasRef.current,
			spinnerRef.current,
			statsRefs,
			motionRefs,
			frameRef,
			frameRef.current,
			0,
			activeVariant,
			activeColor,
			true,
		);

		readBestSpinnerSpeed(activeVariant.id)
			.then((bestSpeed) => {
				if (!mounted) {
					return;
				}

				bestSpeedRef.current = Math.max(bestSpeedRef.current, bestSpeed);
				updateSpinnerStats(statsRefs, 0, 0, activeVariant, true);
			})
			.catch(console.error);

		return () => {
			mounted = false;
		};
	}, [activeColor, activeVariant, motionRefs, statsRefs]);

	useEffect(() => {
		applySpinnerFrame(
			rotorRef.current,
			canvasRef.current,
			spinnerRef.current,
			statsRefs,
			motionRefs,
			frameRef,
			frameRef.current,
			0,
			activeVariant,
			activeColor,
		);
	}, [activeColor, activeVariant, motionRefs, statsRefs]);

	useEffect(() => {
		const animationFrame = animationFrameRef;
		const dragVisualFrame = dragVisualFrameRef;
		const pendingDragFrame = pendingDragFrameRef;
		const canvas = canvasRef.current;
		const motion = motionRefs;
		const rotor = rotorRef.current;

		return () => {
			cancelSpinnerAnimation(animationFrame);
			cancelPendingDragFrame(dragVisualFrame, pendingDragFrame);
			resetSpinnerMotion(canvas, rotor, motion);
		};
	}, [motionRefs]);

	return (
		<FidgetShell
			title={activeVariant.label}
			accent={activeColor.accent}
			headerEnd={
				onOpenSelector ? (
					<button
						type="button"
						className="fidget-shell-action"
						onClick={onOpenSelector}
						aria-label="Choose spinner"
					>
						<ChevronDown size={24} strokeWidth={2.4} aria-hidden="true" />
					</button>
				) : null
			}
			onBack={onBack}
		>
			<div className="spinner-fidget" data-spinner-variant={activeVariant.id}>
				<SpinnerSurface
					bodyRef={spinnerRef}
					canvasRef={canvasRef}
					color={activeColor}
					rotorRef={rotorRef}
					variant={activeVariant}
					onPointerDown={(event) =>
						startPointerSpin(
							event,
							spinnerRef.current,
							rotorRef.current,
							canvasRef.current,
							animationFrameRef,
							dragVisualFrameRef,
							pendingDragFrameRef,
							previousFrameTimeRef,
							animationRemainderRef,
							dragStateRef,
							carryVelocityRef,
							audioRef.current,
							statsRefs,
							motionRefs,
							frameRef,
							activeVariant,
							activeColor,
						)
					}
					onPointerMove={(event) =>
						updatePointerSpin(
							event,
							spinnerRef.current,
							rotorRef.current,
							canvasRef.current,
							dragVisualFrameRef,
							pendingDragFrameRef,
							dragStateRef,
							carryVelocityRef,
							lastHapticTickRef,
							statsRefs,
							motionRefs,
							frameRef,
							activeVariant,
							activeColor,
						)
					}
					onPointerUp={(event) =>
						releasePointerSpin(
							event,
							spinnerRef.current,
							rotorRef.current,
							canvasRef.current,
							animationFrameRef,
							dragVisualFrameRef,
							pendingDragFrameRef,
							previousFrameTimeRef,
							animationRemainderRef,
							dragStateRef,
							audioRef.current,
							lastHapticTickRef,
							statsRefs,
							motionRefs,
							frameRef,
							activeVariant,
							activeColor,
						)
					}
					onPointerCancel={(event) =>
						releasePointerSpin(
							event,
							spinnerRef.current,
							rotorRef.current,
							canvasRef.current,
							animationFrameRef,
							dragVisualFrameRef,
							pendingDragFrameRef,
							previousFrameTimeRef,
							animationRemainderRef,
							dragStateRef,
							audioRef.current,
							lastHapticTickRef,
							statsRefs,
							motionRefs,
							frameRef,
							activeVariant,
							activeColor,
						)
					}
				/>
				<div className="spinner-fidget-stats">
					<span
						className="spinner-fidget-stat spinner-fidget-stat-current"
						data-testid="spinner-current-speed"
					>
						<span ref={speedValueRef} className="spinner-fidget-stat-value">
							0
						</span>
					</span>
					<span
						className="spinner-fidget-stat spinner-fidget-stat-best"
						data-testid="spinner-best-speed"
					>
						<span ref={bestValueRef} className="spinner-fidget-stat-value">
							0
						</span>
					</span>
				</div>
			</div>
		</FidgetShell>
	);
}

function startPointerSpin(
	event: PointerEvent<HTMLButtonElement>,
	element: HTMLButtonElement | null,
	rotor: HTMLElement | null,
	canvas: HTMLCanvasElement | null,
	animationFrameRef: MutableRefObject<number | null>,
	dragVisualFrameRef: MutableRefObject<number | null>,
	pendingDragFrameRef: MutableRefObject<SpinnerFrame | null>,
	previousFrameTimeRef: MutableRefObject<number | null>,
	animationRemainderRef: MutableRefObject<number>,
	dragStateRef: MutableRefObject<SpinnerDragState | null>,
	carryVelocityRef: MutableRefObject<number>,
	audio: SpinnerAudioController | null,
	statsRefs: SpinnerStatsRefs,
	motionRefs: SpinnerMotionRefs,
	frameRef: MutableRefObject<SpinnerFrame>,
	variant: SpinnerVariant,
	color: SpinnerColorOption,
) {
	if (!element) {
		return;
	}

	event.currentTarget.setPointerCapture(event.pointerId);
	cancelSpinnerAnimation(animationFrameRef);
	cancelPendingDragFrame(dragVisualFrameRef, pendingDragFrameRef);
	audio?.stop();
	audio?.unlock();
	resetSpinnerMotion(canvas, rotor, motionRefs);
	previousFrameTimeRef.current = null;
	animationRemainderRef.current = 0;
	carryVelocityRef.current = frameRef.current.angularVelocity;
	applySpinnerFrame(
		rotor,
		canvas,
		element,
		statsRefs,
		motionRefs,
		frameRef,
		frameRef.current,
		event.timeStamp,
		variant,
		color,
		true,
		false,
		false,
	);

	const bounds = element.getBoundingClientRect();
	const grabPointerAngle = getPointerAngle(
		event.clientX,
		event.clientY,
		bounds,
	);

	dragStateRef.current = {
		bounds,
		directionHint: 0,
		hasMoved: false,
		lastPointerAngle: grabPointerAngle,
		lastX: event.clientX,
		lastY: event.clientY,
		startX: event.clientX,
		startY: event.clientY,
		samples: [{ angle: frameRef.current.angle, timestamp: event.timeStamp }],
		unwrappedAngle: frameRef.current.angle,
	};

	vibrate(5);
}

function updatePointerSpin(
	event: PointerEvent<HTMLButtonElement>,
	element: HTMLButtonElement | null,
	rotor: HTMLElement | null,
	canvas: HTMLCanvasElement | null,
	dragVisualFrameRef: MutableRefObject<number | null>,
	pendingDragFrameRef: MutableRefObject<SpinnerFrame | null>,
	dragStateRef: MutableRefObject<SpinnerDragState | null>,
	carryVelocityRef: MutableRefObject<number>,
	lastHapticTickRef: MutableRefObject<number>,
	statsRefs: SpinnerStatsRefs,
	motionRefs: SpinnerMotionRefs,
	frameRef: MutableRefObject<SpinnerFrame>,
	variant: SpinnerVariant,
	color: SpinnerColorOption,
) {
	const dragState = dragStateRef.current;

	if (!element || !dragState) {
		return;
	}

	if (
		!dragState.hasMoved &&
		!shouldStartSpinnerDrag(
			dragState.startX,
			dragState.startY,
			event.clientX,
			event.clientY,
		)
	) {
		return;
	}

	dragState.hasMoved = true;

	const pointerAngle = getPointerAngle(
		event.clientX,
		event.clientY,
		dragState.bounds,
	);
	const movementDirection = getPointerMovementDirection(
		dragState.lastX,
		dragState.lastY,
		event.clientX,
		event.clientY,
		dragState.bounds,
	);

	if (movementDirection !== 0) {
		dragState.directionHint = movementDirection;
	}

	const pointerDelta = getDirectedAngleDelta(
		dragState.lastPointerAngle,
		pointerAngle,
		dragState.directionHint,
	);
	const unwrappedAngle = dragState.unwrappedAngle + pointerDelta;
	const angle = normalizeAngle(unwrappedAngle);
	const previousAngle = frameRef.current.angle;
	const samples = addPointerSample(dragState.samples, {
		angle: unwrappedAngle,
		timestamp: event.timeStamp,
	});
	const angularVelocity = clampAngularVelocity(
		getComposedDragAngularVelocity(
			getSampledUnwrappedAngularVelocity(samples, variant.physics),
			carryVelocityRef.current,
		),
		variant.physics,
	);
	const nextFrame = { angle, angularVelocity };
	const tickCrossings = getTickCrossings(
		previousAngle,
		angle,
		variant.physics.tickInterval,
	);

	dragState.samples = samples;
	dragState.lastPointerAngle = pointerAngle;
	dragState.lastX = event.clientX;
	dragState.lastY = event.clientY;
	dragState.unwrappedAngle = unwrappedAngle;
	scheduleDragSpinnerFrame(
		rotor,
		canvas,
		element,
		dragVisualFrameRef,
		pendingDragFrameRef,
		statsRefs,
		motionRefs,
		frameRef,
		nextFrame,
		event.timeStamp,
		variant,
		color,
	);
	handleTickFeedback(
		tickCrossings,
		angularVelocity,
		event.timeStamp,
		lastHapticTickRef,
	);
}

function releasePointerSpin(
	event: PointerEvent<HTMLButtonElement>,
	element: HTMLButtonElement | null,
	rotor: HTMLElement | null,
	canvas: HTMLCanvasElement | null,
	animationFrameRef: MutableRefObject<number | null>,
	dragVisualFrameRef: MutableRefObject<number | null>,
	pendingDragFrameRef: MutableRefObject<SpinnerFrame | null>,
	previousFrameTimeRef: MutableRefObject<number | null>,
	animationRemainderRef: MutableRefObject<number>,
	dragStateRef: MutableRefObject<SpinnerDragState | null>,
	audio: SpinnerAudioController | null,
	lastHapticTickRef: MutableRefObject<number>,
	statsRefs: SpinnerStatsRefs,
	motionRefs: SpinnerMotionRefs,
	frameRef: MutableRefObject<SpinnerFrame>,
	variant: SpinnerVariant,
	color: SpinnerColorOption,
) {
	const dragState = dragStateRef.current;

	if (!dragState) {
		return;
	}

	flushPendingDragFrame(
		rotor,
		canvas,
		element,
		dragVisualFrameRef,
		pendingDragFrameRef,
		statsRefs,
		motionRefs,
		frameRef,
		variant,
		color,
	);

	if (event.currentTarget.hasPointerCapture(event.pointerId)) {
		event.currentTarget.releasePointerCapture(event.pointerId);
	}

	dragStateRef.current = null;

	if (!dragState.hasMoved) {
		frameRef.current = { ...frameRef.current, angularVelocity: 0 };
		applySpinnerFrame(
			rotor,
			canvas,
			element,
			statsRefs,
			motionRefs,
			frameRef,
			frameRef.current,
			event.timeStamp,
			variant,
			color,
			true,
			true,
			false,
		);
		resetSpinnerMotion(canvas, rotor, motionRefs);
		audio?.stop();
		return;
	}

	if (Math.abs(frameRef.current.angularVelocity) > 700) {
		vibrate(8);
	}

	startSpinnerAnimation(
		rotor,
		canvas,
		element,
		animationFrameRef,
		previousFrameTimeRef,
		animationRemainderRef,
		audio,
		lastHapticTickRef,
		statsRefs,
		motionRefs,
		frameRef,
		variant,
		color,
	);
}

function startSpinnerAnimation(
	rotor: HTMLElement | null,
	canvas: HTMLCanvasElement | null,
	element: HTMLButtonElement | null,
	animationFrameRef: MutableRefObject<number | null>,
	previousFrameTimeRef: MutableRefObject<number | null>,
	animationRemainderRef: MutableRefObject<number>,
	audio: SpinnerAudioController | null,
	lastHapticTickRef: MutableRefObject<number>,
	statsRefs: SpinnerStatsRefs,
	motionRefs: SpinnerMotionRefs,
	frameRef: MutableRefObject<SpinnerFrame>,
	variant: SpinnerVariant,
	color: SpinnerColorOption,
) {
	if (Math.abs(frameRef.current.angularVelocity) <= variant.physics.stopSpeed) {
		resetSpinnerMotion(canvas, rotor, motionRefs);
		updateSpinnerStats(statsRefs, 0, 0, variant, true);
		audio?.stop();
		return;
	}

	cancelSpinnerAnimation(animationFrameRef);
	previousFrameTimeRef.current = null;
	animationRemainderRef.current = 0;
	audio?.start(frameRef.current.angularVelocity);

	const step = (timestamp: number) => {
		const previousTimestamp = previousFrameTimeRef.current ?? timestamp;
		const elapsedSeconds = Math.min(
			(timestamp - previousTimestamp) / 1000,
			SPINNER_MAX_ANIMATION_FRAME_SECONDS,
		);
		animationRemainderRef.current += elapsedSeconds;

		const advanceResult = advanceSpinnerFrames(
			frameRef.current,
			animationRemainderRef.current,
			variant.physics,
		);
		const nextFrame = advanceResult.frame;
		const tickCrossings = advanceResult.tickCrossings;

		previousFrameTimeRef.current = timestamp;
		animationRemainderRef.current = advanceResult.remainingElapsedSeconds;
		applySpinnerFrame(
			rotor,
			canvas,
			element,
			statsRefs,
			motionRefs,
			frameRef,
			nextFrame,
			timestamp,
			variant,
			color,
		);
		audio?.update({
			speed: nextFrame.angularVelocity,
			tickCrossings,
			timestamp,
		});
		handleTickFeedback(
			tickCrossings,
			nextFrame.angularVelocity,
			timestamp,
			lastHapticTickRef,
		);

		if (Math.abs(nextFrame.angularVelocity) <= variant.physics.stopSpeed) {
			animationFrameRef.current = null;
			previousFrameTimeRef.current = null;
			resetSpinnerMotion(canvas, rotor, motionRefs);
			updateSpinnerStats(statsRefs, 0, timestamp, variant, true);
			audio?.stop();
			return;
		}

		animationFrameRef.current = window.requestAnimationFrame(step);
	};

	animationFrameRef.current = window.requestAnimationFrame(step);
}

function applySpinnerFrame(
	rotor: HTMLElement | null,
	canvas: HTMLCanvasElement | null,
	element: HTMLButtonElement | null,
	statsRefs: SpinnerStatsRefs,
	motionRefs: SpinnerMotionRefs,
	frameRef: MutableRefObject<SpinnerFrame>,
	frame: SpinnerFrame,
	timestamp: number,
	variant: SpinnerVariant,
	color: SpinnerColorOption,
	forceStats = false,
	allowBestFeedback = !forceStats,
	allowMotionBlur = true,
) {
	frameRef.current = frame;
	updateSpinnerStats(
		statsRefs,
		frame.angularVelocity,
		timestamp,
		variant,
		forceStats,
		allowBestFeedback,
	);

	if (rotor) {
		const lobeClarity = allowMotionBlur
			? updateSpinnerMotionBlur(canvas, frame, variant, color, motionRefs)
			: clearSpinnerHeldMotion(canvas, motionRefs);

		if (motionRefs.displayedAngleRef.current !== frame.angle) {
			motionRefs.displayedAngleRef.current = frame.angle;
			rotor.style.transform = `translateZ(0) rotate(${frame.angle}deg)`;
		}

		rotor.style.setProperty("--spinner-lobe-clarity", `${lobeClarity}`);
	}

	element?.classList.toggle("is-fast", Math.abs(frame.angularVelocity) > 1600);
}

function scheduleDragSpinnerFrame(
	rotor: HTMLElement | null,
	canvas: HTMLCanvasElement | null,
	element: HTMLButtonElement | null,
	dragVisualFrameRef: MutableRefObject<number | null>,
	pendingDragFrameRef: MutableRefObject<SpinnerFrame | null>,
	statsRefs: SpinnerStatsRefs,
	motionRefs: SpinnerMotionRefs,
	frameRef: MutableRefObject<SpinnerFrame>,
	frame: SpinnerFrame,
	timestamp: number,
	variant: SpinnerVariant,
	color: SpinnerColorOption,
) {
	frameRef.current = frame;
	pendingDragFrameRef.current = frame;

	if (dragVisualFrameRef.current) {
		return;
	}

	dragVisualFrameRef.current = window.requestAnimationFrame(() => {
		dragVisualFrameRef.current = null;

		const pendingFrame = pendingDragFrameRef.current;
		pendingDragFrameRef.current = null;

		if (pendingFrame) {
			applySpinnerFrame(
				rotor,
				canvas,
				element,
				statsRefs,
				motionRefs,
				frameRef,
				pendingFrame,
				timestamp,
				variant,
				color,
			);
		}
	});
}

function flushPendingDragFrame(
	rotor: HTMLElement | null,
	canvas: HTMLCanvasElement | null,
	element: HTMLButtonElement | null,
	dragVisualFrameRef: MutableRefObject<number | null>,
	pendingDragFrameRef: MutableRefObject<SpinnerFrame | null>,
	statsRefs: SpinnerStatsRefs,
	motionRefs: SpinnerMotionRefs,
	frameRef: MutableRefObject<SpinnerFrame>,
	variant: SpinnerVariant,
	color: SpinnerColorOption,
) {
	const pendingFrame = pendingDragFrameRef.current;

	cancelPendingDragFrame(dragVisualFrameRef, pendingDragFrameRef);

	if (pendingFrame) {
		applySpinnerFrame(
			rotor,
			canvas,
			element,
			statsRefs,
			motionRefs,
			frameRef,
			pendingFrame,
			0,
			variant,
			color,
			true,
		);
	}
}

function cancelPendingDragFrame(
	dragVisualFrameRef: MutableRefObject<number | null>,
	pendingDragFrameRef: MutableRefObject<SpinnerFrame | null>,
) {
	if (dragVisualFrameRef.current) {
		window.cancelAnimationFrame(dragVisualFrameRef.current);
	}

	dragVisualFrameRef.current = null;
	pendingDragFrameRef.current = null;
}

function resetSpinnerMotion(
	canvas: HTMLCanvasElement | null,
	rotor: HTMLElement | null,
	motionRefs?: SpinnerMotionRefs,
) {
	clearSpinnerMotionCanvas(canvas);

	if (motionRefs) {
		motionRefs.blurActiveRef.current = false;
		motionRefs.displayedAngleRef.current = null;
	}

	rotor?.style.setProperty("--spinner-lobe-clarity", "1");
}

function updateSpinnerMotionBlur(
	canvas: HTMLCanvasElement | null,
	frame: SpinnerFrame,
	variant: SpinnerVariant,
	color: SpinnerColorOption,
	motionRefs: SpinnerMotionRefs,
) {
	const visuals = drawSpinnerMotionBlur(
		canvas,
		frame,
		variant.motion,
		color,
		motionRefs.blurActiveRef.current,
	);

	motionRefs.blurActiveRef.current = visuals.active === 1;

	return visuals.lobeClarity;
}

function clearSpinnerHeldMotion(
	canvas: HTMLCanvasElement | null,
	motionRefs: SpinnerMotionRefs,
) {
	clearSpinnerMotionCanvas(canvas);
	motionRefs.blurActiveRef.current = false;

	return 1;
}

function updateSpinnerStats(
	statsRefs: SpinnerStatsRefs,
	speed: number,
	timestamp: number,
	variant: SpinnerVariant,
	force = false,
	allowBestFeedback = !force,
) {
	const absoluteSpeed = Math.abs(speed);
	const displayedSpeed = Math.round(absoluteSpeed);
	let bestSpeed = statsRefs.bestSpeedRef.current;
	let bestSpeedChanged = false;

	if (absoluteSpeed > bestSpeed) {
		bestSpeed = absoluteSpeed;
		bestSpeedChanged = true;
		statsRefs.bestSpeedRef.current = bestSpeed;
		writeBestSpinnerSpeed(bestSpeed, variant.id).catch(console.error);
	}

	if (
		displayedSpeed !== statsRefs.displayedSpeedRef.current &&
		shouldUpdateCurrentSpeed(statsRefs, timestamp, force, bestSpeedChanged)
	) {
		statsRefs.displayedSpeedRef.current = displayedSpeed;
		statsRefs.displayedAtRef.current = timestamp;

		if (statsRefs.speedValueRef.current) {
			statsRefs.speedValueRef.current.textContent =
				formatSpinnerSpeed(displayedSpeed);
		}
	}

	if (Math.round(bestSpeed) !== statsRefs.displayedBestSpeedRef.current) {
		statsRefs.displayedBestSpeedRef.current = Math.round(bestSpeed);

		if (statsRefs.bestValueRef.current) {
			statsRefs.bestValueRef.current.textContent =
				formatSpinnerSpeed(bestSpeed);
		}
	}

	if (bestSpeedChanged && allowBestFeedback) {
		triggerBestScoreFeedback(statsRefs);
	}
}

function triggerBestScoreFeedback(statsRefs: SpinnerStatsRefs) {
	const bestValue = statsRefs.bestValueRef.current;

	if (bestValue) {
		bestValue.classList.remove("is-best-updated");
		bestValue.getBoundingClientRect();
		bestValue.classList.add("is-best-updated");
	}

	vibrate(SPINNER_BEST_FEEDBACK_PATTERN);
}

function shouldUpdateCurrentSpeed(
	statsRefs: SpinnerStatsRefs,
	timestamp: number,
	force: boolean,
	bestSpeedChanged: boolean,
) {
	return (
		force ||
		bestSpeedChanged ||
		timestamp - statsRefs.displayedAtRef.current >=
			SPINNER_SPEED_DISPLAY_INTERVAL_MS
	);
}

function handleTickFeedback(
	tickCrossings: number,
	speed: number,
	timestamp: number,
	lastHapticTickRef: MutableRefObject<number>,
) {
	if (
		tickCrossings > 0 &&
		timestamp - lastHapticTickRef.current > getHapticThrottle(speed)
	) {
		lastHapticTickRef.current = timestamp;
		vibrate(getHapticDuration(speed));
	}
}

function getComposedDragAngularVelocity(
	dragVelocity: number,
	carryVelocity: number,
) {
	if (carryVelocity === 0 || dragVelocity === 0) {
		return dragVelocity || carryVelocity;
	}

	const sameDirection = Math.sign(dragVelocity) === Math.sign(carryVelocity);
	const carryScale = sameDirection ? 0.42 : 0.68;

	return dragVelocity + carryVelocity * carryScale;
}

function cancelSpinnerAnimation(
	animationFrameRef: MutableRefObject<number | null>,
) {
	if (!animationFrameRef.current) {
		return;
	}

	window.cancelAnimationFrame(animationFrameRef.current);
	animationFrameRef.current = null;
}

function getHapticThrottle(speed: number) {
	const absoluteSpeed = Math.abs(speed);

	if (absoluteSpeed < 900) {
		return 90;
	}

	if (absoluteSpeed < 2200) {
		return 145;
	}

	return 240;
}

function getHapticDuration(speed: number) {
	const absoluteSpeed = Math.abs(speed);

	if (absoluteSpeed < 900) {
		return 3;
	}

	if (absoluteSpeed < 2200) {
		return 2;
	}

	return 1;
}
