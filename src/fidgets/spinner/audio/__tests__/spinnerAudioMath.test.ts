import { SpinnerVariantId } from "../../spinnerTypes";
import { getSpinnerVariant } from "../../spinnerVariants";
import {
	getBearingMicroTickIntervalMs,
	getSpeedIntensity,
	getSpinnerAudioShape,
	getTickThrottleMs,
	shouldPlayBearingMicroTick,
	shouldPlayBearingTick,
} from "../spinnerAudioMath";
import spinnerAudioSettings from "../spinnerAudioSettings";

test("maps spinner speed to a capped audio intensity", () => {
	expect(getSpeedIntensity(0, spinnerAudioSettings)).toBe(0);
	expect(getSpeedIntensity(120, spinnerAudioSettings)).toBe(0);
	expect(getSpeedIntensity(3200, spinnerAudioSettings)).toBe(1);
	expect(getSpeedIntensity(4200, spinnerAudioSettings)).toBe(1);
});

test("maps speed to brighter whirr and stronger rolling gain", () => {
	const slowShape = getSpinnerAudioShape(420, spinnerAudioSettings);
	const mediumShape = getSpinnerAudioShape(1200, spinnerAudioSettings);
	const fastShape = getSpinnerAudioShape(3000, spinnerAudioSettings);

	expect(slowShape.rollingGain).toBe(0);
	expect(mediumShape.rollingGain).toBeGreaterThan(slowShape.rollingGain);
	expect(fastShape.rollingGain).toBeGreaterThan(mediumShape.rollingGain);
	expect(fastShape.rollingBandpassFrequency).toBeGreaterThan(
		mediumShape.rollingBandpassFrequency,
	);
	expect(mediumShape.highpassFrequency).toBeGreaterThanOrEqual(
		spinnerAudioSettings.antiThumpHighpassFrequency,
	);
});

test("adds race texture at medium speed and smooths it at high speed", () => {
	const slowShape = getSpinnerAudioShape(420, spinnerAudioSettings);
	const mediumShape = getSpinnerAudioShape(1200, spinnerAudioSettings);
	const fastShape = getSpinnerAudioShape(3000, spinnerAudioSettings);

	expect(slowShape.textureGain).toBe(0);
	expect(mediumShape.textureGain).toBeGreaterThan(slowShape.textureGain);
	expect(fastShape.textureGain).toBeLessThan(mediumShape.textureGain);
});

test("collection settings make metal spinners rougher than premium spinners", () => {
	const spinner1 = getSpinnerVariant(SpinnerVariantId.Spinner1);
	const spinner15 = getSpinnerVariant(SpinnerVariantId.Spinner15);
	const spinner1Shape = getSpinnerAudioShape(1200, spinner1.audio);
	const spinner15Shape = getSpinnerAudioShape(1200, spinner15.audio);

	expect(spinner1Shape.textureGain).toBeGreaterThan(spinner15Shape.textureGain);
	expect(spinner1Shape.lobeTickGain).toBeGreaterThan(
		spinner15Shape.lobeTickGain,
	);
	expect(spinner1Shape.microTickGain).toBeGreaterThan(
		spinner15Shape.microTickGain,
	);
	expect(spinner1Shape.rollingBandpassFrequency).toBeGreaterThan(
		spinner15Shape.rollingBandpassFrequency,
	);
});

test("basic spinner audio has stronger plastic texture and ticks", () => {
	const basicSpinner = getSpinnerVariant(SpinnerVariantId.Spinner5);
	const premiumSpinner = getSpinnerVariant(SpinnerVariantId.Spinner15);
	const basicShape = getSpinnerAudioShape(1200, basicSpinner.audio);
	const premiumShape = getSpinnerAudioShape(1200, premiumSpinner.audio);

	expect(basicSpinner.audio.textureGainScale).toBeGreaterThan(
		premiumSpinner.audio.textureGainScale,
	);
	expect(basicSpinner.audio.lobeTickGainScale).toBeGreaterThan(
		premiumSpinner.audio.lobeTickGainScale,
	);
	expect(basicSpinner.audio.microTickGainScale).toBeGreaterThan(
		premiumSpinner.audio.microTickGainScale,
	);
	expect(basicShape.textureGain).toBeGreaterThan(premiumShape.textureGain);
	expect(basicShape.lobeTickGain).toBeGreaterThan(premiumShape.lobeTickGain);
});

test("metal spinner audio has a brighter whirr than basic spinners", () => {
	const basicSpinner = getSpinnerVariant(SpinnerVariantId.Spinner5);
	const metalSpinner = getSpinnerVariant(SpinnerVariantId.Spinner8);
	const basicShape = getSpinnerAudioShape(1600, basicSpinner.audio);
	const metalShape = getSpinnerAudioShape(1600, metalSpinner.audio);

	expect(metalSpinner.audio.antiThumpHighpassFrequency).toBeGreaterThan(
		basicSpinner.audio.antiThumpHighpassFrequency,
	);
	expect(metalSpinner.audio.pitchScale).toBeGreaterThan(
		basicSpinner.audio.pitchScale,
	);
	expect(metalShape.rollingBandpassFrequency).toBeGreaterThan(
		basicShape.rollingBandpassFrequency,
	);
	expect(metalShape.highpassFrequency).toBeGreaterThan(
		basicShape.highpassFrequency,
	);
});

test("premium spinner audio is quieter and cleaner", () => {
	const basicSpinner = getSpinnerVariant(SpinnerVariantId.Spinner5);
	const premiumSpinner = getSpinnerVariant(SpinnerVariantId.Spinner15);
	const basicShape = getSpinnerAudioShape(1600, basicSpinner.audio);
	const premiumShape = getSpinnerAudioShape(1600, premiumSpinner.audio);

	expect(premiumSpinner.audio.masterVolume).toBeLessThan(
		basicSpinner.audio.masterVolume,
	);
	expect(premiumSpinner.audio.minAudibleSpeed).toBeGreaterThan(
		basicSpinner.audio.minAudibleSpeed,
	);
	expect(premiumSpinner.audio.textureGainScale).toBeLessThan(
		basicSpinner.audio.textureGainScale,
	);
	expect(premiumShape.textureGain).toBeLessThan(basicShape.textureGain);
	expect(premiumShape.microTickGain).toBeLessThan(basicShape.microTickGain);
});

test("throttles bearing ticks more at high speed", () => {
	const slowThrottle = getTickThrottleMs(500, spinnerAudioSettings);
	const fastThrottle = getTickThrottleMs(
		spinnerAudioSettings.maxWhirrSpeed,
		spinnerAudioSettings,
	);

	expect(slowThrottle).toBeLessThan(fastThrottle);
	expect(fastThrottle).toBeCloseTo(1000 / 6);
});

test("spaces micro bearing ticks by speed until the cap", () => {
	const slowInterval = getBearingMicroTickIntervalMs(360, spinnerAudioSettings);
	const mediumInterval = getBearingMicroTickIntervalMs(
		1200,
		spinnerAudioSettings,
	);
	const cappedInterval = getBearingMicroTickIntervalMs(
		8000,
		spinnerAudioSettings,
	);

	expect(slowInterval).toBeGreaterThan(mediumInterval);
	expect(cappedInterval).toBeCloseTo(
		1000 / spinnerAudioSettings.microTickMaxPerSecond,
	);
});

test("does not schedule audio ticks below minimum audible speed", () => {
	expect(getBearingMicroTickIntervalMs(80, spinnerAudioSettings)).toBe(
		Number.POSITIVE_INFINITY,
	);
	expect(shouldPlayBearingMicroTick(80, 100, 0, spinnerAudioSettings)).toBe(
		false,
	);
	expect(shouldPlayBearingTick(1, 80, 100, 0, spinnerAudioSettings)).toBe(
		false,
	);
});

test("limits high-speed bearing tick frequency", () => {
	expect(shouldPlayBearingTick(1, 3000, 100, 0, spinnerAudioSettings)).toBe(
		true,
	);
	expect(shouldPlayBearingTick(1, 3000, 180, 100, spinnerAudioSettings)).toBe(
		false,
	);
	expect(shouldPlayBearingTick(1, 3000, 280, 100, spinnerAudioSettings)).toBe(
		true,
	);
});

test("limits high-speed micro bearing tick frequency", () => {
	expect(shouldPlayBearingMicroTick(8000, 100, 0, spinnerAudioSettings)).toBe(
		true,
	);
	expect(shouldPlayBearingMicroTick(8000, 110, 100, spinnerAudioSettings)).toBe(
		false,
	);
	expect(shouldPlayBearingMicroTick(8000, 130, 100, spinnerAudioSettings)).toBe(
		true,
	);
});
