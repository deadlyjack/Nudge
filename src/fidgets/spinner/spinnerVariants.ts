import spinnerAsset1 from "./assets/Fidget Spinner (1).svg";
import spinnerAsset2 from "./assets/Fidget Spinner (2).svg";
import spinnerAsset3 from "./assets/Fidget Spinner (3).svg";
import spinnerAsset4 from "./assets/Fidget Spinner (4).svg";
import spinnerAsset5 from "./assets/Fidget Spinner (5).svg";
import spinnerAsset6 from "./assets/Fidget Spinner (6).svg";
import spinnerAsset7 from "./assets/Fidget Spinner (7).svg";
import spinnerAsset8 from "./assets/Fidget Spinner (8).svg";
import spinnerAsset9 from "./assets/Fidget Spinner (9).svg";
import spinnerAsset10 from "./assets/Fidget Spinner (10).svg";
import spinnerAsset11 from "./assets/Fidget Spinner (11).svg";
import spinnerAsset12 from "./assets/Fidget Spinner (12).svg";
import spinnerAsset13 from "./assets/Fidget Spinner (13).svg";
import spinnerAsset14 from "./assets/Fidget Spinner (14).svg";
import spinnerAsset15 from "./assets/Fidget Spinner (15).svg";

import spinnerAudioSettings from "./audio/spinnerAudioSettings";
import type { SpinnerAudioSettings } from "./audio/spinnerAudioTypes";
import {
	type SpinnerCollectionItem,
	type SpinnerCollectionType,
	spinnersCollection,
} from "./spinnersCollection";
import type {
	SpinnerMotionProfile,
	SpinnerPhysicsSettings,
	SpinnerVariant,
	SpinnerVisualProfile,
} from "./spinnerTypes";
import { SpinnerVariantId } from "./spinnerTypes";

const spinnerAssetSources = [
	spinnerAsset1,
	spinnerAsset2,
	spinnerAsset3,
	spinnerAsset4,
	spinnerAsset5,
	spinnerAsset6,
	spinnerAsset7,
	spinnerAsset8,
	spinnerAsset9,
	spinnerAsset10,
	spinnerAsset11,
	spinnerAsset12,
	spinnerAsset13,
	spinnerAsset14,
	spinnerAsset15,
] as const;

const spinnerAspectRatios = [
	316.25 / 720,
	360.76 / 720,
	541.6 / 720,
	720 / 685.4,
	688.53 / 720,
	393.38 / 720,
	720 / 692.46,
	243 / 720,
	658.8 / 720,
	698.43 / 720,
	720 / 606.78,
	720 / 662.05,
	720 / 662.05,
	720 / 662.05,
	720 / 662.05,
] as const;

const minimumSpinnerWeight = Math.min(
	...spinnersCollection.map((spinner) => spinner.weight),
);
const maximumSpinnerWeight = Math.max(
	...spinnersCollection.map((spinner) => spinner.weight),
);
const minimumSpinnerFriction = Math.min(
	...spinnersCollection.map((spinner) => spinner.friction),
);
const maximumSpinnerFriction = Math.max(
	...spinnersCollection.map((spinner) => spinner.friction),
);
const spinnerCoastFrictionScale = 0.38;

interface SpinnerTypeAudioProfile {
	antiThumpHighpassFrequencyOffset: number;
	bearingBallCountOffset: number;
	highSpeedTickMaxPerSecondOffset: number;
	lobeTickGainScaleMultiplier: number;
	lowSpeedTickMaxPerSecondOffset: number;
	masterVolumeMultiplier: number;
	maxWhirrSpeedOffset: number;
	microTickGainScaleMultiplier: number;
	microTickMaxPerSecondOffset: number;
	minAudibleSpeedOffset: number;
	minWhirrSpeedOffset: number;
	pitchScaleMultiplier: number;
	rollingGainScaleMultiplier: number;
	textureGainScaleMultiplier: number;
}

const spinnerTypeAudioProfiles: Record<
	SpinnerCollectionType,
	SpinnerTypeAudioProfile
> = {
	basic: {
		antiThumpHighpassFrequencyOffset: -30,
		bearingBallCountOffset: -1,
		highSpeedTickMaxPerSecondOffset: 2,
		lobeTickGainScaleMultiplier: 1.18,
		lowSpeedTickMaxPerSecondOffset: 3,
		masterVolumeMultiplier: 1.16,
		maxWhirrSpeedOffset: -120,
		microTickGainScaleMultiplier: 1.14,
		microTickMaxPerSecondOffset: 5,
		minAudibleSpeedOffset: -12,
		minWhirrSpeedOffset: -70,
		pitchScaleMultiplier: 0.92,
		rollingGainScaleMultiplier: 0.92,
		textureGainScaleMultiplier: 1.24,
	},
	metal: {
		antiThumpHighpassFrequencyOffset: 90,
		bearingBallCountOffset: 1,
		highSpeedTickMaxPerSecondOffset: 1,
		lobeTickGainScaleMultiplier: 1.02,
		lowSpeedTickMaxPerSecondOffset: 1,
		masterVolumeMultiplier: 1.04,
		maxWhirrSpeedOffset: 120,
		microTickGainScaleMultiplier: 1.08,
		microTickMaxPerSecondOffset: 2,
		minAudibleSpeedOffset: 0,
		minWhirrSpeedOffset: -10,
		pitchScaleMultiplier: 1.12,
		rollingGainScaleMultiplier: 1.18,
		textureGainScaleMultiplier: 0.96,
	},
	premium: {
		antiThumpHighpassFrequencyOffset: 140,
		bearingBallCountOffset: 1,
		highSpeedTickMaxPerSecondOffset: -2,
		lobeTickGainScaleMultiplier: 0.62,
		lowSpeedTickMaxPerSecondOffset: -4,
		masterVolumeMultiplier: 0.78,
		maxWhirrSpeedOffset: 180,
		microTickGainScaleMultiplier: 0.55,
		microTickMaxPerSecondOffset: -8,
		minAudibleSpeedOffset: 28,
		minWhirrSpeedOffset: 90,
		pitchScaleMultiplier: 1.05,
		rollingGainScaleMultiplier: 1.04,
		textureGainScaleMultiplier: 0.58,
	},
};

export const spinnerVariants: SpinnerVariant[] =
	spinnersCollection.map(createSpinnerVariant);

export const defaultSpinnerVariant = getInitialSpinnerVariant();

export function getSpinnerVariant(variantId: SpinnerVariantId) {
	return (
		spinnerVariants.find((variant) => variant.id === variantId) ??
		defaultSpinnerVariant
	);
}

function createSpinnerVariant(
	collectionItem: SpinnerCollectionItem,
): SpinnerVariant {
	const progress = getCollectionProgress(collectionItem);
	const assetIndex = collectionItem.assetIndex;
	const motion = getIndexedMotionProfile(assetIndex);
	const visual: SpinnerVisualProfile = {
		aspectRatio: spinnerAspectRatios[assetIndex - 1],
		assetIndex,
		assetSrc: spinnerAssetSources[assetIndex - 1],
		motionProfile: motion,
		originOffset: collectionItem.originOffset,
	};

	return {
		accent: collectionItem.colorProfile.accent,
		audio: getCollectionAudioSettings(collectionItem, progress),
		color: collectionItem.colorProfile,
		id: collectionItem.id,
		label: collectionItem.name,
		lobeCount: motion.sweepAngles.length,
		motion,
		physics: getCollectionPhysicsSettings(collectionItem, progress),
		subtitle: collectionItem.type,
		visual,
	};
}

function getCollectionAudioSettings(
	collectionItem: SpinnerCollectionItem,
	progress: number,
): SpinnerAudioSettings {
	const profile = spinnerTypeAudioProfiles[collectionItem.type];
	const settings: SpinnerAudioSettings = {
		...spinnerAudioSettings,
		antiThumpHighpassFrequency: Math.round(interpolate(260, 480, progress)),
		bearingBallCount: Math.round(interpolate(6, 9, progress)),
		highSpeedTickMaxPerSecond: Math.round(interpolate(9, 4, progress)),
		lobeTickGainScale: roundVariantValue(interpolate(1.42, 0.58, progress)),
		lowSpeedTickMaxPerSecond: Math.round(interpolate(26, 13, progress)),
		masterVolume: roundVariantValue(interpolate(0.19, 0.11, progress)),
		maxWhirrSpeed: Math.round(interpolate(2600, 4200, progress)),
		microTickGainScale: roundVariantValue(interpolate(1.38, 0.5, progress)),
		microTickMaxPerSecond: Math.round(interpolate(52, 28, progress)),
		minAudibleSpeed: Math.round(interpolate(90, 150, progress)),
		minWhirrSpeed: Math.round(interpolate(260, 640, progress)),
		pitchScale: roundVariantValue(interpolate(0.9, 1.2, progress)),
		rollingGainScale: roundVariantValue(interpolate(0.9, 1.05, progress)),
		textureGainScale: roundVariantValue(interpolate(1.65, 0.34, progress)),
	};

	return {
		...settings,
		antiThumpHighpassFrequency:
			settings.antiThumpHighpassFrequency +
			profile.antiThumpHighpassFrequencyOffset,
		bearingBallCount: Math.max(
			1,
			settings.bearingBallCount + profile.bearingBallCountOffset,
		),
		highSpeedTickMaxPerSecond: Math.max(
			1,
			settings.highSpeedTickMaxPerSecond +
				profile.highSpeedTickMaxPerSecondOffset,
		),
		lobeTickGainScale: roundVariantValue(
			settings.lobeTickGainScale * profile.lobeTickGainScaleMultiplier,
		),
		lowSpeedTickMaxPerSecond: Math.max(
			1,
			settings.lowSpeedTickMaxPerSecond +
				profile.lowSpeedTickMaxPerSecondOffset,
		),
		masterVolume: roundVariantValue(
			settings.masterVolume * profile.masterVolumeMultiplier,
		),
		maxWhirrSpeed: settings.maxWhirrSpeed + profile.maxWhirrSpeedOffset,
		microTickGainScale: roundVariantValue(
			settings.microTickGainScale * profile.microTickGainScaleMultiplier,
		),
		microTickMaxPerSecond: Math.max(
			1,
			settings.microTickMaxPerSecond + profile.microTickMaxPerSecondOffset,
		),
		minAudibleSpeed: Math.max(
			0,
			settings.minAudibleSpeed + profile.minAudibleSpeedOffset,
		),
		minWhirrSpeed: Math.max(
			0,
			settings.minWhirrSpeed + profile.minWhirrSpeedOffset,
		),
		pitchScale: roundVariantValue(
			settings.pitchScale * profile.pitchScaleMultiplier,
		),
		rollingGainScale: roundVariantValue(
			settings.rollingGainScale * profile.rollingGainScaleMultiplier,
		),
		textureGainScale: roundVariantValue(
			settings.textureGainScale * profile.textureGainScaleMultiplier,
		),
	};
}

function getCollectionPhysicsSettings(
	collectionItem: SpinnerCollectionItem,
	progress: number,
): SpinnerPhysicsSettings {
	return {
		baseDrag: roundVariantValue(
			collectionItem.friction * spinnerCoastFrictionScale,
		),
		friction: roundVariantValue(
			collectionItem.friction * spinnerCoastFrictionScale,
		),
		highSpeedDragScale: roundVariantValue(interpolate(0.62, 0.43, progress)),
		inertia: roundVariantValue(interpolate(0.9, 1.75, progress)),
		lowSpeedDragScale: roundVariantValue(interpolate(1.08, 0.94, progress)),
		maxAngularVelocity: Math.round(interpolate(3200, 5400, progress)),
		stopSpeed: roundVariantValue(interpolate(7, 2, progress)),
		tickInterval: Math.round(interpolate(24, 45, progress)),
		weight: collectionItem.weight,
	};
}

function getIndexedMotionProfile(assetIndex: number): SpinnerMotionProfile {
	if ([1, 2, 3, 6, 8].includes(assetIndex)) {
		return {
			lobeDistanceRatio: 0.7,
			lobeRadiusRatio: 0.24,
			smearInnerRadiusRatio: 0.34,
			smearOuterRadiusRatio: 0.88,
			sweepAngles: [0, 180],
		};
	}

	if (assetIndex === 4) {
		return {
			lobeDistanceRatio: 0.68,
			lobeRadiusRatio: 0.22,
			smearInnerRadiusRatio: 0.36,
			smearOuterRadiusRatio: 0.88,
			sweepAngles: [0, 90, 180, 270],
		};
	}

	return {
		lobeDistanceRatio: 0.73,
		lobeRadiusRatio: 0.27,
		smearInnerRadiusRatio: 0.36,
		smearOuterRadiusRatio: 0.9,
		sweepAngles: [0, 120, 240],
	};
}

function getCollectionProgress(collectionItem: SpinnerCollectionItem) {
	const weightProgress = normalize(
		collectionItem.weight,
		minimumSpinnerWeight,
		maximumSpinnerWeight,
	);
	const frictionProgress =
		1 -
		normalize(
			collectionItem.friction,
			minimumSpinnerFriction,
			maximumSpinnerFriction,
		);

	return roundVariantValue((weightProgress + frictionProgress) / 2);
}

function normalize(value: number, minimum: number, maximum: number) {
	if (maximum === minimum) {
		return 0;
	}

	return (value - minimum) / (maximum - minimum);
}

function interpolate(fromValue: number, toValue: number, progress: number) {
	return fromValue + (toValue - fromValue) * progress;
}

function roundVariantValue(value: number) {
	return Math.round(value * 1000) / 1000;
}

function getInitialSpinnerVariant() {
	return (
		spinnerVariants.find(
			(variant) => variant.id === SpinnerVariantId.Spinner12,
		) ?? spinnerVariants[0]
	);
}
