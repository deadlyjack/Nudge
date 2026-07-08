export interface SpinnerAudioController {
	unlock(): void;
	start(speed: number): void;
	update(input: SpinnerAudioUpdate): void;
	stop(): void;
	dispose(): void;
}

export interface SpinnerAudioUpdate {
	speed: number;
	tickCrossings: number;
	timestamp: number;
}

export interface SpinnerAudioSettings {
	antiThumpHighpassFrequency: number;
	bearingBallCount: number;
	enabled: boolean;
	highSpeedTickMaxPerSecond: number;
	lobeTickGainScale: number;
	lowSpeedTickMaxPerSecond: number;
	masterVolume: number;
	maxWhirrSpeed: number;
	microTickGainScale: number;
	microTickMaxPerSecond: number;
	minAudibleSpeed: number;
	minWhirrSpeed: number;
	pitchScale: number;
	rollingGainScale: number;
	textureGainScale: number;
}
