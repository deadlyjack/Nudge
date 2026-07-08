import { KnobVariantId } from "fidgets/knob/knobTypes";
import { getKnobVariant } from "fidgets/knob/knobVariants";
import sounds, { clampDialIntensity } from "lib/sounds";

interface AudioWindow extends Window {
	AudioContext?: typeof AudioContext;
	webkitAudioContext?: typeof AudioContext;
}

test("does not throw when Web Audio is unavailable", () => {
	const audioWindow = window as AudioWindow;
	const originalAudioContext = audioWindow.AudioContext;
	const originalWebkitAudioContext = audioWindow.webkitAudioContext;

	Object.defineProperty(window, "AudioContext", {
		configurable: true,
		value: undefined,
	});
	Object.defineProperty(window, "webkitAudioContext", {
		configurable: true,
		value: undefined,
	});

	expect(() => sounds.toggle()).not.toThrow();
	expect(() => sounds.spin()).not.toThrow();
	expect(() => sounds.dial()).not.toThrow();
	expect(() => sounds.dial(undefined, 4)).not.toThrow();
	expect(() => sounds.pop()).not.toThrow();
	expect(() => sounds.tap()).not.toThrow();

	Object.defineProperty(window, "AudioContext", {
		configurable: true,
		value: originalAudioContext,
	});
	Object.defineProperty(window, "webkitAudioContext", {
		configurable: true,
		value: originalWebkitAudioContext,
	});
});

test("clamps dial intensity to a tactile range", () => {
	expect(clampDialIntensity(-2)).toBe(0.35);
	expect(clampDialIntensity(0.8)).toBe(0.8);
	expect(clampDialIntensity(9)).toBe(1.4);
	expect(clampDialIntensity(Number.NaN)).toBe(1);
});

test("premium knob sound profiles include harmonic ring data", () => {
	const polishedMetal = getKnobVariant(KnobVariantId.PolishedMetal);
	const carbonFiber = getKnobVariant(KnobVariantId.CarbonFiber);

	expect(polishedMetal.sound.harmonicFrequency).toBeGreaterThan(0);
	expect(polishedMetal.sound.harmonicGain).toBeGreaterThan(0);
	expect(carbonFiber.sound.harmonicFrequency).toBeGreaterThan(0);
	expect(carbonFiber.sound.harmonicGain).toBeGreaterThan(0);
});
