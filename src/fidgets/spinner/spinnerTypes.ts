import type { SpinnerAudioSettings } from "./audio/spinnerAudioTypes";

export interface SpinnerFrame {
	angle: number;
	angularVelocity: number;
}

export enum SpinnerVariantId {
	Spinner1 = "spinner-1",
	Spinner2 = "spinner-2",
	Spinner3 = "spinner-3",
	Spinner4 = "spinner-4",
	Spinner5 = "spinner-5",
	Spinner6 = "spinner-6",
	Spinner7 = "spinner-7",
	Spinner8 = "spinner-8",
	Spinner9 = "spinner-9",
	Spinner10 = "spinner-10",
	Spinner11 = "spinner-11",
	Spinner12 = "spinner-12",
	Spinner13 = "spinner-13",
	Spinner14 = "spinner-14",
	Spinner15 = "spinner-15",
}

export interface SpinnerColorOption {
	accent: string;
	deep: string;
	id: string;
	label: string;
	light: string;
	ring: string;
	trailRgb: string;
}

export interface SpinnerMotionProfile {
	lobeDistanceRatio: number;
	lobeRadiusRatio: number;
	smearInnerRadiusRatio: number;
	smearOuterRadiusRatio: number;
	sweepAngles: number[];
}

export interface SpinnerPhysicsSettings {
	baseDrag: number;
	friction: number;
	highSpeedDragScale: number;
	inertia: number;
	lowSpeedDragScale: number;
	maxAngularVelocity: number;
	stopSpeed: number;
	tickInterval: number;
	weight: number;
}

export interface SpinnerVisualProfile {
	aspectRatio: number;
	assetIndex: number;
	assetSrc: string;
	motionProfile: SpinnerMotionProfile;
	originOffset: SpinnerVisualOriginOffset;
}

export interface SpinnerVisualOriginOffset {
	x: number;
	y: number;
}

export interface SpinnerVariant {
	accent: string;
	audio: SpinnerAudioSettings;
	color: SpinnerColorOption;
	id: SpinnerVariantId;
	label: string;
	lobeCount: number;
	motion: SpinnerMotionProfile;
	physics: SpinnerPhysicsSettings;
	subtitle: string;
	visual: SpinnerVisualProfile;
}

export interface SpinnerPointerSample {
	angle: number;
	timestamp: number;
}

export interface SpinnerDragState {
	bounds: DOMRect;
	directionHint: number;
	hasMoved: boolean;
	lastPointerAngle: number;
	lastX: number;
	lastY: number;
	startX: number;
	startY: number;
	samples: SpinnerPointerSample[];
	unwrappedAngle: number;
}
