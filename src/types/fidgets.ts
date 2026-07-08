export enum FidgetId {
	ToggleSwitch = "toggle-switch",
	Spinner = "spinner",
	Knob = "knob",
	BubblePop = "bubble-pop",
	PatternTap = "pattern-tap",
	Counter = "counter",
}

export interface FidgetDefinition {
	id: FidgetId;
	title: string;
	subtitle: string;
	accent: string;
}
