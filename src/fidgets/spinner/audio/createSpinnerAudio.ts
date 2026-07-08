import { isSoundEnabled, subscribeToSoundPreference } from "lib/sounds";

import {
	getSpeedIntensity,
	getSpinnerAudioShape,
	shouldPlayBearingMicroTick,
	shouldPlayBearingTick,
} from "./spinnerAudioMath";
import spinnerAudioSettings from "./spinnerAudioSettings";
import type {
	SpinnerAudioController,
	SpinnerAudioSettings,
	SpinnerAudioUpdate,
} from "./spinnerAudioTypes";

interface SpinnerAudioWindow extends Window {
	AudioContext?: typeof AudioContext;
	webkitAudioContext?: typeof AudioContext;
}

interface BearingWhirrGraph {
	rollingBandpassFilter: BiquadFilterNode;
	rollingGain: GainNode;
	rollingHighpassFilter: BiquadFilterNode;
	rollingNoise: AudioBufferSourceNode;
	masterGain: GainNode;
	stopTimer: number | null;
	textureBandpassFilter: BiquadFilterNode;
	textureGain: GainNode;
	textureHighpassFilter: BiquadFilterNode;
	textureNoise: AudioBufferSourceNode;
}

interface TickVoice {
	duration: number;
	frequency: number;
	gain: number;
	maxDelay: number;
	q: number;
}

let sharedAudioContext: AudioContext | null = null;
let sharedNoiseBuffer: AudioBuffer | null = null;

export default function createSpinnerAudio(
	settings: SpinnerAudioSettings = spinnerAudioSettings,
): SpinnerAudioController {
	let graph: BearingWhirrGraph | null = null;
	let disposed = false;
	let lastLobeTickTimestamp = 0;
	let lastMicroTickTimestamp = 0;
	const unsubscribeSoundPreference = subscribeToSoundPreference(() => {
		if (disposed || isSoundEnabled()) {
			return;
		}

		graph = stopWhirrGraph(graph);
		lastLobeTickTimestamp = 0;
		lastMicroTickTimestamp = 0;
	});

	return {
		unlock() {
			if (!settings.enabled || disposed || !isSoundEnabled()) {
				return;
			}

			getAudioContext();
		},
		start(speed: number) {
			if (!settings.enabled || disposed || !isSoundEnabled()) {
				return;
			}

			try {
				const context = getAudioContext();

				if (!context || Math.abs(speed) <= settings.minAudibleSpeed) {
					return;
				}

				graph = startWhirrGraph(graph, context, settings, speed);
			} catch (error) {
				reportSpinnerAudioError("Spinner audio start unavailable", error);
			}
		},
		update(input: SpinnerAudioUpdate) {
			if (!settings.enabled || disposed || !isSoundEnabled()) {
				graph = stopWhirrGraph(graph);
				return;
			}

			try {
				const context = getAudioContext();

				if (!context) {
					return;
				}

				if (Math.abs(input.speed) <= settings.minAudibleSpeed) {
					graph = stopWhirrGraph(graph);
					return;
				}

				graph = startWhirrGraph(graph, context, settings, input.speed);
				updateWhirrGraph(graph, context, settings, input.speed);

				if (
					shouldPlayBearingTick(
						input.tickCrossings,
						input.speed,
						input.timestamp,
						lastLobeTickTimestamp,
						settings,
					)
				) {
					lastLobeTickTimestamp = input.timestamp;
					playBearingTick(
						context,
						settings,
						input.speed,
						graph.masterGain,
						"lobe",
					);
				}

				if (
					shouldPlayBearingMicroTick(
						input.speed,
						input.timestamp,
						lastMicroTickTimestamp,
						settings,
					)
				) {
					lastMicroTickTimestamp = input.timestamp;
					playBearingTick(
						context,
						settings,
						input.speed,
						graph.masterGain,
						"micro",
					);
				}
			} catch (error) {
				reportSpinnerAudioError("Spinner audio update unavailable", error);
			}
		},
		stop() {
			graph = stopWhirrGraph(graph);
			lastLobeTickTimestamp = 0;
			lastMicroTickTimestamp = 0;
		},
		dispose() {
			disposed = true;
			unsubscribeSoundPreference();
			graph = stopWhirrGraph(graph);
			lastLobeTickTimestamp = 0;
			lastMicroTickTimestamp = 0;
		},
	};
}

function getAudioContext() {
	if (typeof window === "undefined") {
		return null;
	}

	const audioWindow = window as SpinnerAudioWindow;
	const AudioContextClass =
		audioWindow.AudioContext ?? audioWindow.webkitAudioContext;

	if (!AudioContextClass) {
		return null;
	}

	if (!sharedAudioContext) {
		sharedAudioContext = new AudioContextClass();
	}

	const context = sharedAudioContext;

	if (context.state === "suspended") {
		context.resume().catch((error) => {
			reportSpinnerAudioError("Spinner audio resume unavailable", error);
		});
	}

	return context;
}

function startWhirrGraph(
	graph: BearingWhirrGraph | null,
	context: AudioContext,
	settings: SpinnerAudioSettings,
	speed: number,
) {
	if (graph) {
		clearStopTimer(graph);
		updateWhirrGraph(graph, context, settings, speed);
		return graph;
	}

	const nextGraph = createWhirrGraph(context);

	nextGraph.rollingNoise.start();
	nextGraph.textureNoise.start();
	updateWhirrGraph(nextGraph, context, settings, speed);
	fadeInMasterGain(nextGraph, context, settings);

	return nextGraph;
}

function createWhirrGraph(context: AudioContext): BearingWhirrGraph {
	const rollingNoise = context.createBufferSource();
	const rollingHighpassFilter = context.createBiquadFilter();
	const rollingBandpassFilter = context.createBiquadFilter();
	const rollingGain = context.createGain();
	const textureNoise = context.createBufferSource();
	const textureHighpassFilter = context.createBiquadFilter();
	const textureBandpassFilter = context.createBiquadFilter();
	const textureGain = context.createGain();
	const masterGain = context.createGain();

	rollingNoise.buffer = getNoiseBuffer(context);
	rollingNoise.loop = true;
	rollingHighpassFilter.type = "highpass";
	rollingHighpassFilter.frequency.setValueAtTime(420, context.currentTime);
	rollingBandpassFilter.type = "bandpass";
	rollingBandpassFilter.Q.setValueAtTime(0.72, context.currentTime);
	rollingGain.gain.setValueAtTime(0.0001, context.currentTime);

	textureNoise.buffer = getNoiseBuffer(context);
	textureNoise.loop = true;
	textureHighpassFilter.type = "highpass";
	textureHighpassFilter.frequency.setValueAtTime(520, context.currentTime);
	textureBandpassFilter.type = "bandpass";
	textureBandpassFilter.Q.setValueAtTime(1.25, context.currentTime);
	textureGain.gain.setValueAtTime(0.0001, context.currentTime);

	masterGain.gain.setValueAtTime(0.0001, context.currentTime);

	rollingNoise.connect(rollingHighpassFilter);
	rollingHighpassFilter.connect(rollingBandpassFilter);
	rollingBandpassFilter.connect(rollingGain);
	rollingGain.connect(masterGain);
	textureNoise.connect(textureHighpassFilter);
	textureHighpassFilter.connect(textureBandpassFilter);
	textureBandpassFilter.connect(textureGain);
	textureGain.connect(masterGain);
	masterGain.connect(context.destination);

	return {
		masterGain,
		rollingBandpassFilter,
		rollingGain,
		rollingHighpassFilter,
		rollingNoise,
		stopTimer: null,
		textureBandpassFilter,
		textureGain,
		textureHighpassFilter,
		textureNoise,
	};
}

function updateWhirrGraph(
	graph: BearingWhirrGraph,
	context: AudioContext,
	settings: SpinnerAudioSettings,
	speed: number,
) {
	const shape = getSpinnerAudioShape(speed, settings);
	const now = context.currentTime;

	graph.rollingGain.gain.cancelScheduledValues(now);
	graph.textureGain.gain.cancelScheduledValues(now);
	graph.rollingBandpassFilter.frequency.cancelScheduledValues(now);
	graph.rollingHighpassFilter.frequency.cancelScheduledValues(now);
	graph.textureBandpassFilter.frequency.cancelScheduledValues(now);
	graph.textureHighpassFilter.frequency.cancelScheduledValues(now);
	graph.rollingGain.gain.linearRampToValueAtTime(
		Math.max(shape.rollingGain, 0.0001),
		now + 0.055,
	);
	graph.textureGain.gain.linearRampToValueAtTime(
		Math.max(shape.textureGain, 0.0001),
		now + 0.055,
	);
	graph.rollingBandpassFilter.frequency.linearRampToValueAtTime(
		shape.rollingBandpassFrequency,
		now + 0.055,
	);
	graph.rollingHighpassFilter.frequency.linearRampToValueAtTime(
		shape.highpassFrequency,
		now + 0.055,
	);
	graph.textureBandpassFilter.frequency.linearRampToValueAtTime(
		shape.textureBandpassFrequency,
		now + 0.055,
	);
	graph.textureHighpassFilter.frequency.linearRampToValueAtTime(
		Math.max(shape.highpassFrequency, 520),
		now + 0.055,
	);
}

function fadeInMasterGain(
	graph: BearingWhirrGraph,
	context: AudioContext,
	settings: SpinnerAudioSettings,
) {
	const now = context.currentTime;

	resetAudioParam(graph.masterGain.gain, now);
	graph.masterGain.gain.setValueAtTime(0.0001, now);
	graph.masterGain.gain.linearRampToValueAtTime(
		settings.masterVolume,
		now + 0.1,
	);
}

function stopWhirrGraph(graph: BearingWhirrGraph | null) {
	if (!graph) {
		return null;
	}

	const context = sharedAudioContext;

	if (!context) {
		stopWhirrNodes(graph);
		return null;
	}

	const graphToStop = graph;
	const now = context.currentTime;

	clearStopTimer(graphToStop);
	resetAudioParam(graphToStop.masterGain.gain, now);
	graphToStop.rollingGain.gain.cancelScheduledValues(now);
	graphToStop.textureGain.gain.cancelScheduledValues(now);
	graphToStop.masterGain.gain.linearRampToValueAtTime(0.0001, now + 0.13);
	graphToStop.rollingGain.gain.linearRampToValueAtTime(0.0001, now + 0.13);
	graphToStop.textureGain.gain.linearRampToValueAtTime(0.0001, now + 0.13);
	graphToStop.stopTimer = window.setTimeout(() => {
		stopWhirrNodes(graphToStop);
	}, 160);

	return null;
}

function playBearingTick(
	context: AudioContext,
	settings: SpinnerAudioSettings,
	speed: number,
	outputNode: AudioNode,
	kind: "lobe" | "micro",
) {
	const intensity = getSpeedIntensity(speed, settings);
	const shape = getSpinnerAudioShape(speed, settings);
	const now = context.currentTime;
	const tickNoise = context.createBufferSource();
	const tickFilter = context.createBiquadFilter();
	const tickGain = context.createGain();
	const jitter = 0.85 + Math.random() * 0.3;
	const voice = getTickVoice(kind, shape, intensity, jitter);
	const startTime = now + Math.random() * voice.maxDelay;
	const endTime = startTime + voice.duration;

	tickNoise.buffer = createTickBuffer(context);
	tickFilter.type = "bandpass";
	tickFilter.frequency.setValueAtTime(voice.frequency, now);
	tickFilter.Q.setValueAtTime(voice.q, now);
	tickGain.gain.setValueAtTime(0.0001, now);
	tickGain.gain.linearRampToValueAtTime(voice.gain, startTime + 0.002);
	tickGain.gain.exponentialRampToValueAtTime(0.0001, endTime);

	tickNoise.connect(tickFilter);
	tickFilter.connect(tickGain);
	tickGain.connect(outputNode);
	tickNoise.start(startTime);
	tickNoise.stop(endTime);
}

function getTickVoice(
	kind: "lobe" | "micro",
	shape: ReturnType<typeof getSpinnerAudioShape>,
	intensity: number,
	jitter: number,
): TickVoice {
	if (kind === "micro") {
		return {
			duration: 0.006 + intensity * 0.004,
			frequency: shape.microTickFrequency * jitter,
			gain: shape.microTickGain * jitter,
			maxDelay: 0.0025,
			q: 1.4 + intensity * 1.1,
		};
	}

	return {
		duration: 0.014 + (1 - intensity) * 0.01,
		frequency: shape.lobeTickFrequency * jitter,
		gain: shape.lobeTickGain * jitter,
		maxDelay: 0.004,
		q: 0.9 + intensity * 0.6,
	};
}

function getNoiseBuffer(context: AudioContext) {
	if (
		sharedNoiseBuffer &&
		sharedNoiseBuffer.sampleRate === context.sampleRate
	) {
		return sharedNoiseBuffer;
	}

	const sampleCount = Math.max(1, Math.floor(context.sampleRate * 0.35));
	const buffer = context.createBuffer(1, sampleCount, context.sampleRate);
	const channel = buffer.getChannelData(0);

	for (let index = 0; index < sampleCount; index += 1) {
		channel[index] = (Math.random() * 2 - 1) * 0.16;
	}

	sharedNoiseBuffer = buffer;
	return buffer;
}

function createTickBuffer(context: AudioContext) {
	const sampleCount = Math.max(1, Math.floor(context.sampleRate * 0.024));
	const buffer = context.createBuffer(1, sampleCount, context.sampleRate);
	const channel = buffer.getChannelData(0);

	for (let index = 0; index < sampleCount; index += 1) {
		const envelope = 1 - index / sampleCount;
		channel[index] = (Math.random() * 2 - 1) * envelope;
	}

	return buffer;
}

function clearStopTimer(graph: BearingWhirrGraph) {
	if (graph.stopTimer) {
		window.clearTimeout(graph.stopTimer);
		graph.stopTimer = null;
	}
}

function resetAudioParam(parameter: AudioParam, time: number) {
	const supportedParameter = parameter as AudioParam & {
		cancelAndHoldAtTime?: (cancelTime: number) => AudioParam;
	};
	const cancelAndHoldAtTime = supportedParameter.cancelAndHoldAtTime;

	if (typeof cancelAndHoldAtTime === "function") {
		cancelAndHoldAtTime.call(supportedParameter, time);
		return;
	}

	parameter.cancelScheduledValues(time);
}

function stopWhirrNodes(graph: BearingWhirrGraph) {
	clearStopTimer(graph);
	stopAudioSource(graph.rollingNoise);
	stopAudioSource(graph.textureNoise);
}

function stopAudioSource(source: AudioScheduledSourceNode) {
	try {
		source.stop();
	} catch {
		return;
	}
}

function reportSpinnerAudioError(message: string, error: unknown) {
	if (typeof process !== "undefined" && process.env.DEV_MODE) {
		console.error(message, error);
	}
}
