import type { DialSoundProfile } from "lib/sounds";

export enum KnobVariantId {
	BasicPlastic = "knob-basic-plastic",
	SoftRubber = "knob-soft-rubber",
	BrushedAluminum = "knob-brushed-aluminum",
	KnurledSteel = "knob-knurled-steel",
	Titanium = "knob-titanium",
	PolishedMetal = "knob-polished-metal",
	VintageBakelite = "knob-vintage-bakelite",
	RibbedSynth = "knob-ribbed-synth",
	LaboratoryDial = "knob-laboratory-dial",
	AircraftPointer = "knob-aircraft-pointer",
	StudioConsole = "knob-studio-console",
	CarbonFiber = "knob-carbon-fiber",
}

export type KnobBodyShape =
	| "anodized"
	| "chunky"
	| "carbon-composite"
	| "cylindrical"
	| "domed"
	| "fluted"
	| "instrument-skirt"
	| "knurled"
	| "precision"
	| "polished"
	| "scalloped"
	| "soft"
	| "tapered";

export type KnobFinish =
	| "anodized-black"
	| "bakelite"
	| "brushed-aluminum"
	| "carbon-composite"
	| "ceramic-ivory"
	| "dark-steel"
	| "matte-plastic"
	| "olive-gunmetal"
	| "polished-chrome"
	| "synth-rubber"
	| "soft-rubber"
	| "titanium";

export type KnobGripType =
	| "coarse"
	| "diamond"
	| "fine"
	| "fluted"
	| "machined"
	| "ribbed"
	| "rubber"
	| "scalloped"
	| "smooth";

export type KnobIndicatorShape =
	| "arrow"
	| "groove"
	| "line"
	| "notch"
	| "pill"
	| "slot";

export type KnobMaterial =
	| "anodized-aluminum"
	| "bakelite"
	| "brushed-aluminum"
	| "carbon-composite"
	| "ceramic-ivory"
	| "knurled-steel"
	| "matte-plastic"
	| "olive-gunmetal"
	| "polished-chrome"
	| "soft-rubber"
	| "synth-plastic"
	| "titanium";

export interface KnobVisualProfile {
	accent: string;
	baseColor: string;
	bevelDepth: number;
	bodyShape: KnobBodyShape;
	brushDensity: number;
	capInset: number;
	chromeContrast: number;
	darkColor: string;
	finish: KnobFinish;
	gripType: KnobGripType;
	highlightColor: string;
	indicatorColor: string;
	indicatorRadius: number;
	indicatorScale: number;
	indicatorShape: KnobIndicatorShape;
	lightColor: string;
	material: KnobMaterial;
	midColor: string;
	reflectionStrength: number;
	shadowColor: string;
	sideGrip: KnobGripType;
	skirtDepth: number;
	textureColor: string;
}

export interface KnobDetentImpulse {
	sequence: number;
	strength: number;
}

export interface KnobVariant {
	detentInterval: number;
	hapticStrength: number;
	id: KnobVariantId;
	label: string;
	sound: DialSoundProfile;
	visual: KnobVisualProfile;
}
