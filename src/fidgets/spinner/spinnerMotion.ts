import type {
	SpinnerColorOption,
	SpinnerFrame,
	SpinnerMotionProfile,
} from "./spinnerTypes";

export interface SpinnerMotionVisuals {
	active: number;
	exposureMs: number;
	lobeClarity: number;
	nominalRotorRadius: number;
	lobeOuterRadius: number;
	smearOpacity: number;
	sweepOpacity: number;
}

export const defaultSpinnerMotionProfile: SpinnerMotionProfile = {
	lobeDistanceRatio: getMotionLobeDistanceRatio(),
	lobeRadiusRatio: getMotionLobeRadiusRatio(),
	smearInnerRadiusRatio: 0.4,
	smearOuterRadiusRatio: getSpinnerMotionLobeOuterRadius(),
	sweepAngles: [0, 120, 240],
};

export const defaultSpinnerMotionColor: SpinnerColorOption = {
	accent: "#ffd166",
	deep: "#d9576d",
	id: "default",
	label: "Default",
	light: "#fff0b8",
	ring: "#fff7ce",
	trailRgb: "255, 183, 102",
};

export function getSpinnerMotionVisuals(speed: number): SpinnerMotionVisuals {
	return getSpinnerMotionVisualsForProfile(speed, defaultSpinnerMotionProfile);
}

export function getSpinnerMotionVisualsForProfile(
	speed: number,
	profile: SpinnerMotionProfile,
): SpinnerMotionVisuals {
	const absoluteSpeed = Math.abs(speed);
	const subtleMotion = smoothstep(getRangeValue(absoluteSpeed, 340, 1500));
	const fastMotion = smoothstep(getRangeValue(absoluteSpeed, 1600, 3200));
	const smearOpacity = roundVisualValue(fastMotion * 0.3);
	const sweepOpacity = roundVisualValue(subtleMotion * 0.2 + fastMotion * 0.26);
	const active = sweepOpacity > 0 ? 1 : 0;

	return {
		active,
		exposureMs: getSpinnerMotionExposureMs(active, fastMotion),
		lobeClarity: roundVisualValue(1 - fastMotion * 0.45),
		nominalRotorRadius: getSpinnerNominalRotorRadius(),
		lobeOuterRadius: roundVisualValue(
			profile.lobeDistanceRatio + profile.lobeRadiusRatio,
		),
		smearOpacity,
		sweepOpacity,
	};
}

export function getSpinnerVisibleScale() {
	return 1.16;
}

export function getSpinnerNominalRotorRadius() {
	return roundVisualValue(1 / getSpinnerVisibleScale());
}

export function getSpinnerMotionLobeOuterRadius() {
	return roundVisualValue(
		getMotionLobeDistanceRatio() + getMotionLobeRadiusRatio(),
	);
}

export function drawSpinnerMotionBlur(
	canvas: HTMLCanvasElement | null,
	frame: SpinnerFrame,
	profile = defaultSpinnerMotionProfile,
	color = defaultSpinnerMotionColor,
	clearInactive = false,
) {
	const visuals = getSpinnerMotionVisualsForProfile(
		frame.angularVelocity,
		profile,
	);

	if (!visuals.active && !clearInactive) {
		return visuals;
	}

	if (!canvas) {
		return visuals;
	}

	const context = getCanvasContext(canvas);

	if (!context) {
		return visuals;
	}

	const size = syncCanvasSize(canvas, context);

	if (!size) {
		return visuals;
	}

	clearCanvas(context, size);

	if (!visuals.active) {
		return visuals;
	}

	if (visuals.smearOpacity > 0) {
		drawFastSmear(context, size, profile, color, visuals.smearOpacity);
	}

	drawMotionSweep(
		context,
		size,
		profile,
		color,
		frame.angle,
		frame.angularVelocity,
		visuals.exposureMs,
		visuals.sweepOpacity,
	);

	return visuals;
}

export function clearSpinnerMotionCanvas(canvas: HTMLCanvasElement | null) {
	const context = getCanvasContext(canvas);

	if (!context || !canvas) {
		return;
	}

	const size = syncCanvasSize(canvas, context);

	if (size) {
		clearCanvas(context, size);
	}
}

function getRangeValue(speed: number, minSpeed: number, maxSpeed: number) {
	return Math.min(Math.max((speed - minSpeed) / (maxSpeed - minSpeed), 0), 1);
}

function smoothstep(value: number) {
	return value * value * (3 - 2 * value);
}

function roundVisualValue(value: number) {
	return Math.round(value * 1000) / 1000;
}

function getSpinnerMotionExposureMs(active: number, fastMotion: number) {
	if (!active) {
		return 0;
	}

	return fastMotion > 0.32 ? 45 : 48;
}

function getCanvasContext(canvas: HTMLCanvasElement | null) {
	if (!canvas || typeof canvas.getContext !== "function") {
		return null;
	}

	try {
		return canvas.getContext("2d");
	} catch {
		return null;
	}
}

function syncCanvasSize(
	canvas: HTMLCanvasElement,
	context: CanvasRenderingContext2D,
) {
	const bounds = getCanvasBounds(canvas);

	if (!bounds) {
		return null;
	}

	const pixelRatio = getDevicePixelRatio();
	const pixelWidth = Math.max(1, Math.round(bounds.width * pixelRatio));
	const pixelHeight = Math.max(1, Math.round(bounds.height * pixelRatio));

	if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
		canvas.width = pixelWidth;
		canvas.height = pixelHeight;
	}

	context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

	return {
		height: bounds.height,
		pixelHeight,
		pixelWidth,
		width: bounds.width,
	};
}

function getCanvasBounds(canvas: HTMLCanvasElement) {
	const bounds = canvas.getBoundingClientRect();

	if (bounds.width > 0 && bounds.height > 0) {
		return bounds;
	}

	let parentElement = canvas.parentElement;

	while (parentElement) {
		const parentBounds = parentElement.getBoundingClientRect();

		if (parentBounds.width > 0 && parentBounds.height > 0) {
			return parentBounds;
		}

		parentElement = parentElement.parentElement;
	}

	return null;
}

function clearCanvas(
	context: CanvasRenderingContext2D,
	size: { pixelHeight: number; pixelWidth: number },
) {
	context.save();
	context.setTransform(1, 0, 0, 1, 0, 0);
	context.clearRect(0, 0, size.pixelWidth, size.pixelHeight);
	context.restore();
}

function drawFastSmear(
	context: CanvasRenderingContext2D,
	size: { height: number; width: number },
	profile: SpinnerMotionProfile,
	color: SpinnerColorOption,
	opacity: number,
) {
	const centerX = size.width / 2;
	const centerY = size.height / 2;
	const radius = Math.min(size.width, size.height) / 2;
	const outerRadius = radius * profile.smearOuterRadiusRatio;
	const innerRadius = radius * profile.smearInnerRadiusRatio;

	context.save();
	context.fillStyle = `rgba(${color.trailRgb}, ${opacity})`;
	context.beginPath();
	context.arc(centerX, centerY, outerRadius, 0, Math.PI * 2);
	context.arc(centerX, centerY, innerRadius, Math.PI * 2, 0, true);
	context.fill();
	context.restore();
}

function drawMotionSweep(
	context: CanvasRenderingContext2D,
	size: { height: number; width: number },
	profile: SpinnerMotionProfile,
	color: SpinnerColorOption,
	angle: number,
	angularVelocity: number,
	exposureMs: number,
	opacity: number,
) {
	if (opacity <= 0 || exposureMs <= 0) {
		return;
	}

	for (const offsetAngle of profile.sweepAngles) {
		drawMotionLobeSweep(
			context,
			size,
			profile,
			color,
			angle + offsetAngle,
			angularVelocity,
			exposureMs,
			opacity,
		);
	}
}

function drawMotionLobeSweep(
	context: CanvasRenderingContext2D,
	size: { height: number; width: number },
	profile: SpinnerMotionProfile,
	color: SpinnerColorOption,
	angle: number,
	angularVelocity: number,
	exposureMs: number,
	opacity: number,
) {
	const centerX = size.width / 2;
	const centerY = size.height / 2;
	const radius = Math.min(size.width, size.height) / 2;
	const lobeDistance = radius * profile.lobeDistanceRatio;
	const lobeRadius = radius * profile.lobeRadiusRatio;
	const trailSteps = 12;

	context.save();
	context.lineCap = "round";
	context.lineJoin = "round";
	context.lineWidth = lobeRadius * 2;
	context.strokeStyle = `rgba(${color.trailRgb}, ${opacity})`;
	context.beginPath();

	for (let index = 0; index < trailSteps; index += 1) {
		const exposureProgress = index / (trailSteps - 1);
		const sampleAngle =
			angle - angularVelocity * (exposureMs / 1000) * exposureProgress;
		const radians = sampleAngle * (Math.PI / 180);
		const x = centerX + Math.sin(radians) * lobeDistance;
		const y = centerY + Math.cos(radians) * lobeDistance;

		if (index === 0) {
			context.moveTo(x, y);
		} else {
			context.lineTo(x, y);
		}
	}

	context.stroke();
	context.restore();
}

function getDevicePixelRatio() {
	if (typeof window === "undefined") {
		return 1;
	}

	return Math.max(1, Math.min(window.devicePixelRatio || 1, 2));
}

function getMotionLobeDistanceRatio() {
	return roundVisualValue(getSpinnerNominalRotorRadius() * 0.85);
}

function getMotionLobeRadiusRatio() {
	return roundVisualValue(getSpinnerNominalRotorRadius() * 0.31);
}
