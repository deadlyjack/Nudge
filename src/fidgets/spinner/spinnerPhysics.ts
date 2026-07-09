import { getShortestAngleDelta, normalizeAngle } from "lib/angle";

import type {
	SpinnerFrame,
	SpinnerPhysicsSettings,
	SpinnerPointerSample,
} from "./spinnerTypes";

interface SpinnerFrameAdvanceResult {
	frame: SpinnerFrame;
	remainingElapsedSeconds: number;
	tickCrossings: number;
}

export const SPINNER_DRAG = 0.34;
export const SPINNER_MAX_SPEED = 4200;
export const SPINNER_DIRECTION_AMBIGUITY = 30;
export const SPINNER_MOVEMENT_THRESHOLD = 5;
export const SPINNER_SIMULATION_STEP_SECONDS = 1 / 120;
export const SPINNER_STOP_SPEED = 5;
export const SPINNER_TICK_INTERVAL = 30;
export const defaultSpinnerPhysicsSettings: SpinnerPhysicsSettings = {
	baseDrag: SPINNER_DRAG,
	friction: SPINNER_DRAG,
	highSpeedDragScale: 0.56,
	inertia: 1,
	lowSpeedDragScale: 1.15,
	maxAngularVelocity: SPINNER_MAX_SPEED,
	stopSpeed: SPINNER_STOP_SPEED,
	tickInterval: SPINNER_TICK_INTERVAL,
	weight: 1,
};

export function getPointerAngle(
	clientX: number,
	clientY: number,
	bounds: DOMRect,
) {
	const x = clientX - bounds.left - bounds.width / 2;
	const y = clientY - bounds.top - bounds.height / 2;
	return normalizeAngle(Math.atan2(y, x) * (180 / Math.PI) + 90);
}

export { getShortestAngleDelta, normalizeAngle };

export function getDirectedAngleDelta(
	fromAngle: number,
	toAngle: number,
	directionHint: number,
) {
	const delta = getShortestAngleDelta(fromAngle, toAngle);

	if (
		directionHint !== 0 &&
		Math.abs(Math.abs(delta) - 180) <= SPINNER_DIRECTION_AMBIGUITY
	) {
		return Math.abs(delta) * Math.sign(directionHint);
	}

	return delta;
}

export function getAngularVelocity(
	fromAngle: number,
	toAngle: number,
	elapsedMs: number,
	settings = defaultSpinnerPhysicsSettings,
) {
	if (elapsedMs <= 0) {
		return 0;
	}

	const velocity =
		getShortestAngleDelta(fromAngle, toAngle) / (elapsedMs / 1000);
	return clampAngularVelocity(velocity, settings);
}

export function getGrabbedRotorAngle(
	grabRotorAngle: number,
	grabPointerAngle: number,
	currentPointerAngle: number,
	directionHint = 0,
) {
	return normalizeAngle(
		grabRotorAngle +
			getDirectedAngleDelta(
				grabPointerAngle,
				currentPointerAngle,
				directionHint,
			),
	);
}

export function shouldStartSpinnerDrag(
	startX: number,
	startY: number,
	currentX: number,
	currentY: number,
	threshold = SPINNER_MOVEMENT_THRESHOLD,
) {
	return Math.hypot(currentX - startX, currentY - startY) >= threshold;
}

export function getPointerMovementDirection(
	previousX: number,
	previousY: number,
	currentX: number,
	currentY: number,
	bounds: DOMRect,
) {
	const pointerDelta = getShortestAngleDelta(
		getPointerAngle(previousX, previousY, bounds),
		getPointerAngle(currentX, currentY, bounds),
	);

	if (Math.abs(Math.abs(pointerDelta) - 180) > SPINNER_DIRECTION_AMBIGUITY) {
		return Math.sign(pointerDelta);
	}

	return getLinearMovementDirection(currentX - previousX, currentY - previousY);
}

export function addPointerSample(
	samples: SpinnerPointerSample[],
	sample: SpinnerPointerSample,
	maxAgeMs = 120,
	maxSamples = 6,
) {
	const recentSamples = samples.filter(
		(recentSample) => sample.timestamp - recentSample.timestamp <= maxAgeMs,
	);
	return [...recentSamples, sample].slice(-maxSamples);
}

export function getSampledAngularVelocity(samples: SpinnerPointerSample[]) {
	return getSampledAngularVelocityWithSettings(
		samples,
		defaultSpinnerPhysicsSettings,
	);
}

export function getSampledAngularVelocityWithSettings(
	samples: SpinnerPointerSample[],
	settings: SpinnerPhysicsSettings,
) {
	if (samples.length < 2) {
		return 0;
	}

	const firstSample = samples[0];
	const lastSample = samples[samples.length - 1];
	return getAngularVelocity(
		firstSample.angle,
		lastSample.angle,
		lastSample.timestamp - firstSample.timestamp,
		settings,
	);
}

export function getSampledUnwrappedAngularVelocity(
	samples: SpinnerPointerSample[],
	settings = defaultSpinnerPhysicsSettings,
) {
	if (samples.length < 2) {
		return 0;
	}

	const firstSample = samples[0];
	const lastSample = samples[samples.length - 1];
	const elapsedMs = lastSample.timestamp - firstSample.timestamp;

	if (elapsedMs <= 0) {
		return 0;
	}

	return clampAngularVelocity(
		getInertiaAdjustedAngularVelocity(
			(lastSample.angle - firstSample.angle) / (elapsedMs / 1000),
			settings,
		),
		settings,
	);
}

export function getTickCrossings(
	fromAngle: number,
	toAngle: number,
	interval = defaultSpinnerPhysicsSettings.tickInterval,
) {
	const delta = getShortestAngleDelta(fromAngle, toAngle);

	if (delta === 0 || interval <= 0) {
		return 0;
	}

	const direction = Math.sign(delta);
	const start = normalizeAngle(fromAngle);
	const unwrappedEnd = start + delta;
	let boundary =
		direction > 0
			? Math.floor(start / interval) * interval + interval
			: Math.ceil(start / interval) * interval - interval;
	let crossings = 0;

	while (direction > 0 ? boundary <= unwrappedEnd : boundary >= unwrappedEnd) {
		crossings += 1;
		boundary += direction * interval;
	}

	return crossings;
}

export function advanceSpinnerFrame(
	frame: SpinnerFrame,
	elapsedSeconds: number,
	settings = defaultSpinnerPhysicsSettings,
	drag = getDragForVelocity(frame.angularVelocity, settings),
) {
	const angle = normalizeAngle(
		frame.angle + frame.angularVelocity * elapsedSeconds,
	);
	const angularVelocity = decayAngularVelocity(
		frame.angularVelocity,
		elapsedSeconds,
		drag,
		settings,
	);

	return { angle, angularVelocity };
}

export function advanceSpinnerFrames(
	frame: SpinnerFrame,
	elapsedSeconds: number,
	settings = defaultSpinnerPhysicsSettings,
	stepSeconds = SPINNER_SIMULATION_STEP_SECONDS,
): SpinnerFrameAdvanceResult {
	if (elapsedSeconds <= 0 || stepSeconds <= 0) {
		return {
			frame,
			remainingElapsedSeconds: Math.max(elapsedSeconds, 0),
			tickCrossings: 0,
		};
	}

	let currentFrame = frame;
	let remainingElapsedSeconds = elapsedSeconds;
	let tickCrossings = 0;

	while (remainingElapsedSeconds + Number.EPSILON >= stepSeconds) {
		const previousAngle = currentFrame.angle;

		currentFrame = advanceSpinnerFrame(currentFrame, stepSeconds, settings);
		tickCrossings += getTickCrossings(
			previousAngle,
			currentFrame.angle,
			settings.tickInterval,
		);
		remainingElapsedSeconds -= stepSeconds;

		if (currentFrame.angularVelocity === 0) {
			remainingElapsedSeconds = 0;
			break;
		}
	}

	return {
		frame: currentFrame,
		remainingElapsedSeconds,
		tickCrossings,
	};
}

export function decayAngularVelocity(
	angularVelocity: number,
	elapsedSeconds: number,
	drag = getDragForVelocity(angularVelocity),
	settings = defaultSpinnerPhysicsSettings,
) {
	const decayedVelocity = angularVelocity * Math.exp(-drag * elapsedSeconds);

	if (Math.abs(decayedVelocity) < settings.stopSpeed) {
		return 0;
	}

	return decayedVelocity;
}

export function clampAngularVelocity(
	angularVelocity: number,
	settings = defaultSpinnerPhysicsSettings,
) {
	return Math.max(
		-settings.maxAngularVelocity,
		Math.min(settings.maxAngularVelocity, angularVelocity),
	);
}

export function getDragForVelocity(
	angularVelocity: number,
	settings = defaultSpinnerPhysicsSettings,
) {
	const speed = Math.abs(angularVelocity);

	if (speed > 2600) {
		return getBaseFriction(settings) * settings.highSpeedDragScale;
	}

	if (speed < 260) {
		return getBaseFriction(settings) * settings.lowSpeedDragScale;
	}

	return getBaseFriction(settings);
}

export function getInertiaAdjustedAngularVelocity(
	angularVelocity: number,
	settings = defaultSpinnerPhysicsSettings,
) {
	return angularVelocity / settings.inertia;
}

function getLinearMovementDirection(movementX: number, movementY: number) {
	if (Math.abs(movementX) >= Math.abs(movementY)) {
		return Math.sign(movementX);
	}

	return Math.sign(movementY);
}

function getBaseFriction(settings: SpinnerPhysicsSettings) {
	return settings.friction || settings.baseDrag;
}
