import { readFileSync } from "node:fs";
import { join } from "node:path";

import createSpinnerAudio from "../createSpinnerAudio";
import spinnerAudioSettings from "../spinnerAudioSettings";

interface AudioWindow extends Window {
	AudioContext?: typeof AudioContext;
	webkitAudioContext?: typeof AudioContext;
}

test("spinner audio controller is safe when Web Audio is unavailable", () => {
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

	const spinnerAudio = createSpinnerAudio();

	expect(() => spinnerAudio.unlock()).not.toThrow();
	expect(() => spinnerAudio.start(1800)).not.toThrow();
	expect(() =>
		spinnerAudio.update({ speed: 1400, tickCrossings: 1, timestamp: 120 }),
	).not.toThrow();
	expect(() => spinnerAudio.stop()).not.toThrow();
	expect(() => spinnerAudio.dispose()).not.toThrow();

	Object.defineProperty(window, "AudioContext", {
		configurable: true,
		value: originalAudioContext,
	});
	Object.defineProperty(window, "webkitAudioContext", {
		configurable: true,
		value: originalWebkitAudioContext,
	});
});

test("spinner audio start does not trigger a release chirp", () => {
	const source = readFileSync(
		join(process.cwd(), "src/fidgets/spinner/audio/createSpinnerAudio.ts"),
		"utf8",
	);

	expect(source).not.toContain("playReleaseChirp");
});

test("spinner audio nodes only connect to destination through master gain", () => {
	const source = readFileSync(
		join(process.cwd(), "src/fidgets/spinner/audio/createSpinnerAudio.ts"),
		"utf8",
	);
	const destinationConnections =
		source.match(/\w+\.connect\(context\.destination\)/g) ?? [];

	expect(destinationConnections).toEqual([
		"masterGain.connect(context.destination)",
	]);
});

test("spinner audio does not create a low body hum oscillator", () => {
	const source = readFileSync(
		join(process.cwd(), "src/fidgets/spinner/audio/createSpinnerAudio.ts"),
		"utf8",
	);

	expect(source).not.toContain("createOscillator");
	expect(source).not.toContain("bodyHum");
	expect(source).not.toContain("bodyGain");
});

test("spinner audio filter floors stay above the anti-thump range", () => {
	const source = readFileSync(
		join(process.cwd(), "src/fidgets/spinner/audio/createSpinnerAudio.ts"),
		"utf8",
	);
	const frequencyFloors = Array.from(
		source.matchAll(/frequency\.setValueAtTime\((\d+)/g),
		(match) => Number(match[1]),
	);

	expect(
		spinnerAudioSettings.antiThumpHighpassFrequency,
	).toBeGreaterThanOrEqual(300);
	expect(frequencyFloors.every((frequency) => frequency >= 300)).toBe(true);
});
