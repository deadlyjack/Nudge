import type { SpinnerAudioSettings } from "./spinnerAudioTypes";

export interface SpinnerAudioShape {
	highpassFrequency: number;
	lobeTickFrequency: number;
	lobeTickGain: number;
	microTickFrequency: number;
	microTickGain: number;
	rollingBandpassFrequency: number;
	rollingGain: number;
	textureBandpassFrequency: number;
	textureGain: number;
}

export function getSpeedIntensity(
	speed: number,
	settings: Pick<SpinnerAudioSettings, "maxWhirrSpeed" | "minAudibleSpeed">,
) {
	const absoluteSpeed = Math.abs(speed);

	if (absoluteSpeed <= settings.minAudibleSpeed) {
		return 0;
	}

	const normalizedSpeed = clamp(
		(absoluteSpeed - settings.minAudibleSpeed) /
			(settings.maxWhirrSpeed - settings.minAudibleSpeed),
		0,
		1,
	);

	return Math.log1p(normalizedSpeed * 5) / Math.log1p(5);
}

export function getSpinnerAudioShape(
	speed: number,
	settings: Pick<
		SpinnerAudioSettings,
		| "antiThumpHighpassFrequency"
		| "lobeTickGainScale"
		| "maxWhirrSpeed"
		| "microTickGainScale"
		| "minAudibleSpeed"
		| "minWhirrSpeed"
		| "pitchScale"
		| "rollingGainScale"
		| "textureGainScale"
	>,
): SpinnerAudioShape {
	const absoluteSpeed = Math.abs(speed);
	const intensity = getSpeedIntensity(speed, settings);
	const whirrIntensity = getRangeIntensity(
		absoluteSpeed,
		settings.minWhirrSpeed,
		settings.maxWhirrSpeed,
	);
	const highSpeedSmoothness = getRangeIntensity(
		absoluteSpeed,
		1600,
		settings.maxWhirrSpeed,
	);
	const lowSpeedTickPresence = 1 - getRangeIntensity(absoluteSpeed, 900, 2200);

	return {
		highpassFrequency:
			settings.antiThumpHighpassFrequency +
			whirrIntensity * 520 * settings.pitchScale,
		lobeTickFrequency: (950 + intensity * 1450) * settings.pitchScale,
		lobeTickGain:
			(0.012 + lowSpeedTickPresence * 0.016) *
			(1 - intensity * 0.34) *
			settings.lobeTickGainScale,
		microTickFrequency: (1550 + intensity * 2900) * settings.pitchScale,
		microTickGain: (0.003 + intensity * 0.004) * settings.microTickGainScale,
		rollingBandpassFrequency: (680 + intensity * 2700) * settings.pitchScale,
		rollingGain:
			whirrIntensity *
			(0.006 + highSpeedSmoothness * 0.018) *
			settings.rollingGainScale,
		textureBandpassFrequency: (520 + intensity * 950) * settings.pitchScale,
		textureGain:
			whirrIntensity *
			(1 - highSpeedSmoothness * 0.9) *
			0.012 *
			settings.textureGainScale,
	};
}

export function getTickThrottleMs(
	speed: number,
	settings: Pick<
		SpinnerAudioSettings,
		"highSpeedTickMaxPerSecond" | "lowSpeedTickMaxPerSecond" | "maxWhirrSpeed"
	>,
) {
	const intensity = Math.min(Math.abs(speed) / settings.maxWhirrSpeed, 1);
	const ticksPerSecond =
		settings.lowSpeedTickMaxPerSecond -
		(settings.lowSpeedTickMaxPerSecond - settings.highSpeedTickMaxPerSecond) *
			intensity;

	return 1000 / ticksPerSecond;
}

export function getBearingMicroTickIntervalMs(
	speed: number,
	settings: Pick<
		SpinnerAudioSettings,
		| "bearingBallCount"
		| "microTickMaxPerSecond"
		| "minAudibleSpeed"
		| "minWhirrSpeed"
	>,
) {
	const absoluteSpeed = Math.abs(speed);

	if (absoluteSpeed <= settings.minAudibleSpeed) {
		return Number.POSITIVE_INFINITY;
	}

	const revolutionsPerSecond = absoluteSpeed / 360;
	const lowSpeedScale =
		0.35 +
		getRangeIntensity(
			absoluteSpeed,
			settings.minAudibleSpeed,
			settings.minWhirrSpeed,
		) *
			0.65;
	const contactsPerSecond = Math.min(
		revolutionsPerSecond * settings.bearingBallCount * lowSpeedScale,
		settings.microTickMaxPerSecond,
	);

	if (contactsPerSecond <= 0) {
		return Number.POSITIVE_INFINITY;
	}

	return 1000 / contactsPerSecond;
}

export function shouldPlayBearingMicroTick(
	speed: number,
	timestamp: number,
	lastTickTimestamp: number,
	settings: Pick<
		SpinnerAudioSettings,
		| "bearingBallCount"
		| "microTickMaxPerSecond"
		| "minAudibleSpeed"
		| "minWhirrSpeed"
	>,
) {
	if (Math.abs(speed) <= settings.minAudibleSpeed) {
		return false;
	}

	if (lastTickTimestamp === 0) {
		return true;
	}

	return (
		timestamp - lastTickTimestamp >=
		getBearingMicroTickIntervalMs(speed, settings)
	);
}

export function shouldPlayBearingTick(
	tickCrossings: number,
	speed: number,
	timestamp: number,
	lastTickTimestamp: number,
	settings: Pick<
		SpinnerAudioSettings,
		| "highSpeedTickMaxPerSecond"
		| "lowSpeedTickMaxPerSecond"
		| "maxWhirrSpeed"
		| "minAudibleSpeed"
	>,
) {
	if (tickCrossings <= 0 || Math.abs(speed) <= settings.minAudibleSpeed) {
		return false;
	}

	if (lastTickTimestamp === 0) {
		return true;
	}

	return timestamp - lastTickTimestamp >= getTickThrottleMs(speed, settings);
}

function getRangeIntensity(speed: number, minSpeed: number, maxSpeed: number) {
	return smoothstep(clamp((speed - minSpeed) / (maxSpeed - minSpeed), 0, 1));
}

function smoothstep(value: number) {
	return value * value * (3 - 2 * value);
}

function clamp(value: number, minValue: number, maxValue: number) {
	return Math.min(Math.max(value, minValue), maxValue);
}
