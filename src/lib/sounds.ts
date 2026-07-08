let audioContext: AudioContext | null = null;
let masterGain: GainNode | null = null;
const soundPreferenceStorageKey = "nudge.sound.enabled";
let soundEnabled = getInitialSoundPreference();
const soundPreferenceListeners = new Set<() => void>();

interface AudioWindow extends Window {
	AudioContext?: typeof AudioContext;
	webkitAudioContext?: typeof AudioContext;
}

export interface DialSoundProfile {
	bodyDuration?: number;
	bodyFrequency?: number;
	bodyGain?: number;
	clickDuration?: number;
	clickFrequency?: number;
	clickGain?: number;
	duration: number;
	endGain: number;
	frequency: number;
	gain: number;
	harmonicDelay?: number;
	harmonicFrequency?: number;
	harmonicGain?: number;
	noiseDuration: number;
	noiseFrequency: number;
	noiseGain: number;
	noiseQ?: number;
	secondaryFrequency?: number;
	type: OscillatorType;
}

const defaultDialSoundProfile: DialSoundProfile = {
	duration: 0.032,
	endGain: 0.003,
	frequency: 620,
	gain: 0.09,
	harmonicDelay: 0.001,
	noiseDuration: 0.018,
	noiseFrequency: 1400,
	noiseGain: 0.035,
	type: "triangle",
};

const sounds = {
	toggle() {
		if (!isSoundEnabled()) {
			return;
		}

		playTone(260, 0.045, "square", 0.14);
		playTone(620, 0.075, "triangle", 0.12, 0.004, 0.012);
	},
	spin() {
		if (!isSoundEnabled()) {
			return;
		}

		playTone(170, 0.09, "sawtooth", 0.08);
		playTone(420, 0.14, "triangle", 0.08, 0.004, 0.03);
	},
	dial(profile = defaultDialSoundProfile, intensity = 1) {
		if (!isSoundEnabled()) {
			return;
		}

		const dialIntensity = clampDialIntensity(intensity);
		const clickFrequency = profile.clickFrequency ?? profile.frequency * 1.8;
		const clickDuration =
			profile.clickDuration ?? Math.min(profile.duration, 0.008);
		const clickGain = (profile.clickGain ?? profile.gain * 0.6) * dialIntensity;
		const toneGain = profile.gain * (0.62 + dialIntensity * 0.38);
		const bodyFrequency = profile.bodyFrequency ?? profile.frequency * 0.48;
		const bodyGain = (profile.bodyGain ?? profile.gain * 0.24) * dialIntensity;
		const bodyDuration = profile.bodyDuration ?? profile.duration * 1.2;
		const noiseGain = profile.noiseGain * (0.44 + dialIntensity * 0.56);

		playTone(clickFrequency, clickDuration, "square", clickGain, 0.002);
		playTone(
			profile.frequency,
			profile.duration,
			profile.type,
			toneGain,
			profile.endGain,
			0.001,
		);
		playTone(
			bodyFrequency,
			bodyDuration,
			"sine",
			bodyGain,
			profile.endGain,
			0.002,
		);

		if (profile.secondaryFrequency) {
			playTone(
				profile.secondaryFrequency,
				profile.duration * 0.85,
				"sine",
				profile.gain * 0.32 * dialIntensity,
				profile.endGain,
				0.002,
			);
		}

		if (profile.harmonicFrequency && profile.harmonicGain) {
			playTone(
				profile.harmonicFrequency,
				profile.duration * 0.74,
				"sine",
				profile.harmonicGain * dialIntensity,
				profile.endGain,
				profile.harmonicDelay ?? 0.001,
			);
		}

		playNoiseBurst(
			profile.noiseDuration,
			noiseGain,
			profile.noiseFrequency,
			profile.noiseQ,
		);
	},
	pop() {
		if (!isSoundEnabled()) {
			return;
		}

		playTone(760, 0.04, "triangle", 0.12);
		playTone(230, 0.095, "sine", 0.06, 0.004, 0.002);
		playNoiseBurst(0.04, 0.08, 900);
	},
	tap() {
		if (!isSoundEnabled()) {
			return;
		}

		playTone(360, 0.052, "triangle", 0.085);
		playNoiseBurst(0.018, 0.04, 1200);
	},
};

export default sounds;

installAudioUnlock();

export function isSoundEnabled() {
	return soundEnabled;
}

export function setSoundEnabled(enabled: boolean) {
	if (soundEnabled === enabled) {
		return;
	}

	soundEnabled = enabled;
	saveSoundPreference(enabled);
	updateMasterGain();
	notifySoundPreferenceListeners();
}

export function subscribeToSoundPreference(listener: () => void) {
	soundPreferenceListeners.add(listener);

	return () => {
		soundPreferenceListeners.delete(listener);
	};
}

export function clampDialIntensity(intensity: number) {
	if (!Number.isFinite(intensity)) {
		return 1;
	}

	return Math.min(1.4, Math.max(0.35, intensity));
}

function playTone(
	frequency: number,
	duration: number,
	type: OscillatorType,
	startGain: number,
	endGain = 0.003,
	delay = 0,
) {
	try {
		const context = getAudioContext();
		const output = getMasterGain();
		if (!context || !output) {
			return;
		}

		const oscillator = context.createOscillator();
		const gain = context.createGain();
		const startTime = context.currentTime + delay;
		const endTime = startTime + duration;

		oscillator.type = type;
		oscillator.frequency.setValueAtTime(frequency, startTime);
		gain.gain.setValueAtTime(0.0001, startTime);
		gain.gain.linearRampToValueAtTime(startGain, startTime + 0.006);
		gain.gain.exponentialRampToValueAtTime(endGain, endTime);

		oscillator.connect(gain);
		gain.connect(output);
		oscillator.start(startTime);
		oscillator.stop(endTime);
	} catch (error) {
		console.error("Sound unavailable", error);
	}
}

function playNoiseBurst(
	duration: number,
	startGain: number,
	frequency: number,
	q = 0.9,
) {
	try {
		const context = getAudioContext();
		const output = getMasterGain();
		if (!context || !output) {
			return;
		}

		const sampleCount = Math.max(1, Math.floor(context.sampleRate * duration));
		const buffer = context.createBuffer(1, sampleCount, context.sampleRate);
		const channel = buffer.getChannelData(0);

		for (let index = 0; index < sampleCount; index += 1) {
			const envelope = 1 - index / sampleCount;
			channel[index] = (Math.random() * 2 - 1) * envelope;
		}

		const source = context.createBufferSource();
		const filter = context.createBiquadFilter();
		const gain = context.createGain();
		const startTime = context.currentTime;
		const endTime = startTime + duration;

		source.buffer = buffer;
		filter.type = "bandpass";
		filter.frequency.setValueAtTime(frequency, startTime);
		filter.Q.setValueAtTime(q, startTime);
		gain.gain.setValueAtTime(startGain, startTime);
		gain.gain.exponentialRampToValueAtTime(0.002, endTime);

		source.connect(filter);
		filter.connect(gain);
		gain.connect(output);
		source.start(startTime);
		source.stop(endTime);
	} catch (error) {
		console.error("Noise burst unavailable", error);
	}
}

function getInitialSoundPreference() {
	if (typeof window === "undefined") {
		return true;
	}

	try {
		return window.localStorage.getItem(soundPreferenceStorageKey) !== "false";
	} catch (error) {
		console.error("Sound preference unavailable", error);
		return true;
	}
}

function getAudioContext() {
	if (typeof window === "undefined") {
		return null;
	}

	const audioWindow = window as AudioWindow;
	const AudioContextClass =
		audioWindow.AudioContext ?? audioWindow.webkitAudioContext;
	if (!AudioContextClass) {
		return null;
	}

	if (!audioContext) {
		audioContext = new AudioContextClass();
	}

	const context = audioContext;

	if (context.state === "suspended") {
		context.resume().catch((error) => {
			console.error("Audio resume unavailable", error);
		});
	}

	return context;
}

function getMasterGain() {
	const context = getAudioContext();
	if (!context) {
		return null;
	}

	if (!masterGain) {
		masterGain = context.createGain();
		masterGain.gain.setValueAtTime(getMasterVolume(), context.currentTime);
		masterGain.connect(context.destination);
	}

	return masterGain;
}

function installAudioUnlock() {
	if (typeof window === "undefined") {
		return;
	}

	const unlockAudio = () => {
		if (!isSoundEnabled()) {
			return;
		}

		getAudioContext();
		window.removeEventListener("pointerdown", unlockAudio, true);
		window.removeEventListener("touchstart", unlockAudio, true);
		window.removeEventListener("click", unlockAudio, true);
	};

	window.addEventListener("pointerdown", unlockAudio, true);
	window.addEventListener("touchstart", unlockAudio, true);
	window.addEventListener("click", unlockAudio, true);
}

function saveSoundPreference(enabled: boolean) {
	if (typeof window === "undefined") {
		return;
	}

	try {
		window.localStorage.setItem(soundPreferenceStorageKey, String(enabled));
	} catch (error) {
		console.error("Sound preference unavailable", error);
	}
}

function updateMasterGain() {
	if (!audioContext || !masterGain) {
		return;
	}

	masterGain.gain.setValueAtTime(getMasterVolume(), audioContext.currentTime);
}

function getMasterVolume() {
	return isSoundEnabled() ? 0.72 : 0.0001;
}

function notifySoundPreferenceListeners() {
	for (const listener of soundPreferenceListeners) {
		listener();
	}
}
