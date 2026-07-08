import { fireEvent, render, screen } from "@testing-library/react";

import KnobFidgetSurface from "components/KnobFidgetSurface";
import type { KnobVariant } from "fidgets/knob/knobTypes";
import { KnobVariantId } from "fidgets/knob/knobTypes";
import { defaultKnobVariant, getKnobVariant } from "fidgets/knob/knobVariants";

import KnobFidget from "../KnobFidget";

jest.mock("lib/haptics", () => ({
	__esModule: true,
	default: jest.fn(),
}));

jest.mock("lib/sounds", () => ({
	__esModule: true,
	default: {
		dial: jest.fn(),
	},
}));

interface PointerCaptureElement extends HTMLElement {
	setPointerCapture(pointerId: number): void;
	releasePointerCapture(pointerId: number): void;
	hasPointerCapture(pointerId: number): boolean;
}

interface AnimationFrameMock {
	flush: () => void;
	getRequestCount: () => number;
	restore: () => void;
}

let animationFrames: AnimationFrameMock;
let restoreBrowserMocks: () => void;

beforeEach(() => {
	restoreBrowserMocks = mockBrowserPointerSupport();
	animationFrames = mockAnimationFrames();
});

afterEach(() => {
	animationFrames.restore();
	restoreBrowserMocks();
});

test("keeps turning past halfway and through a full detented rotation", () => {
	renderKnobFidget();

	const dial = screen.getByRole("button", {
		name: "Turn the fidget dial",
	}) as PointerCaptureElement;

	mockDialBounds(dial);
	const markerRotor = getMarkerRotor(dial);

	dispatchPointerAngle(dial, "pointerdown", 18);
	dispatchPointerAngle(dial, "pointermove", 108);

	expect(markerRotor.style.transform).toBe("translateZ(0) rotate(108deg)");

	dispatchPointerAngle(dial, "pointermove", 198);

	expect(markerRotor.style.transform).toBe("translateZ(0) rotate(198deg)");

	dispatchPointerAngle(dial, "pointermove", 288);

	expect(markerRotor.style.transform).toBe("translateZ(0) rotate(288deg)");

	dispatchPointerAngle(dial, "pointermove", 378);

	expect(markerRotor.style.transform).toBe("translateZ(0) rotate(378deg)");

	dispatchPointerAngle(dial, "pointerup", 378);
});

test("does not move before detent pressure crosses the threshold", () => {
	renderKnobFidget();

	const dial = screen.getByRole("button", {
		name: "Turn the fidget dial",
	}) as PointerCaptureElement;

	mockDialBounds(dial);
	const markerRotor = getMarkerRotor(dial);

	dispatchPointerAngle(dial, "pointerdown", 18);
	dispatchPointerAngle(dial, "pointermove", 28);

	expect(markerRotor.style.transform).toBe("translateZ(0) rotate(18deg)");
});

test("snaps to the next detent when the threshold is crossed", () => {
	renderKnobFidget();

	const dial = screen.getByRole("button", {
		name: "Turn the fidget dial",
	}) as PointerCaptureElement;

	mockDialBounds(dial);
	const markerRotor = getMarkerRotor(dial);

	dispatchPointerAngle(dial, "pointerdown", 18);
	dispatchPointerAngle(dial, "pointermove", 29);

	expect(markerRotor.style.transform).toBe("translateZ(0) rotate(36deg)");
});

test("keeps the current detent when reversing before the threshold", () => {
	renderKnobFidget();

	const dial = screen.getByRole("button", {
		name: "Turn the fidget dial",
	}) as PointerCaptureElement;

	mockDialBounds(dial);
	const markerRotor = getMarkerRotor(dial);

	dispatchPointerAngle(dial, "pointerdown", 18);
	dispatchPointerAngle(dial, "pointermove", 28);
	dispatchPointerAngle(dial, "pointermove", 12);

	expect(markerRotor.style.transform).toBe("translateZ(0) rotate(18deg)");
});

test("advances multiple detents on a fast drag", () => {
	renderKnobFidget();

	const dial = screen.getByRole("button", {
		name: "Turn the fidget dial",
	}) as PointerCaptureElement;

	mockDialBounds(dial);
	const markerRotor = getMarkerRotor(dial);

	dispatchPointerAngle(dial, "pointerdown", 18);
	dispatchPointerAngle(dial, "pointermove", 90);

	expect(markerRotor.style.transform).toBe("translateZ(0) rotate(90deg)");
});

test("does not jump to the touch angle on pointer down", () => {
	renderKnobFidget();

	const dial = screen.getByRole("button", {
		name: "Turn the fidget dial",
	}) as PointerCaptureElement;

	mockDialBounds(dial);
	const markerRotor = getMarkerRotor(dial);

	dispatchPointerAngle(dial, "pointerdown", 270);

	expect(markerRotor.style.transform).toBe("translateZ(0) rotate(18deg)");
});

test("rotates only the marker layer and keeps body texture stationary", () => {
	renderKnobFidget();

	const dial = screen.getByRole("button", {
		name: "Turn the fidget dial",
	}) as PointerCaptureElement;

	mockDialBounds(dial);

	dispatchPointerAngle(dial, "pointerdown", 18);
	dispatchPointerAngle(dial, "pointermove", 29);

	const markerRotor = getMarkerRotor(dial);
	const hardwareBody = dial.querySelector(
		".knob-fidget-hardware-body",
	) as HTMLElement;
	const brush = dial.querySelector(".knob-fidget-brush") as HTMLElement;
	const reflection = dial.querySelector(
		".knob-fidget-reflection",
	) as HTMLElement;
	const indicator = dial.querySelector(".knob-fidget-indicator") as HTMLElement;

	expect(dial.style.transform).toBe("");
	expect(hardwareBody.style.transform).toBe("");
	expect(brush.style.transform).toBe("");
	expect(reflection.style.transform).toBe("");
	expect(markerRotor.style.transform).toBe("translateZ(0) rotate(36deg)");
	expect(indicator).toBeTruthy();
	expect(dial.style.getPropertyValue("--knob-angle")).toBe("18deg");
});

test("does not queue visual frames while moving the indicator", () => {
	renderKnobFidget();

	const dial = screen.getByRole("button", {
		name: "Turn the fidget dial",
	}) as PointerCaptureElement;

	mockDialBounds(dial);
	const markerRotor = getMarkerRotor(dial);

	dispatchPointerAngle(dial, "pointerdown", 18);
	dispatchPointerAngle(dial, "pointermove", 29);

	expect(animationFrames.getRequestCount()).toBe(0);
	expect(markerRotor.style.transform).toBe("translateZ(0) rotate(36deg)");
});

test("uses the same procedural variant data for preview and actual knob", () => {
	const variant = getKnobVariant(KnobVariantId.Titanium);
	const { container } = render(
		<>
			<KnobFidgetSurface angle={20} variant={variant} />
			<KnobFidgetSurface angle={20} mode="icon" disabled variant={variant} />
		</>,
	);

	const dials = Array.from(
		container.querySelectorAll(".knob-fidget-dial"),
	) as HTMLElement[];
	const markers = Array.from(
		container.querySelectorAll(".knob-fidget-indicator"),
	) as HTMLElement[];
	const bodies = Array.from(
		container.querySelectorAll(".knob-fidget-hardware-body"),
	) as HTMLElement[];

	expect(dials).toHaveLength(2);
	expect(markers).toHaveLength(2);
	expect(bodies).toHaveLength(2);

	for (const dial of dials) {
		expect(dial.dataset.knobVariant).toBe(variant.id);
		expect(dial.dataset.knobIndicator).toBe(variant.visual.indicatorShape);
		expect(dial.dataset.knobGrip).toBe(variant.visual.gripType);
		expect(dial.dataset.knobMaterial).toBe(variant.visual.material);
	}

	for (const body of bodies) {
		expect(body.dataset.knobMaterial).toBe(variant.visual.material);
		expect(body.dataset.knobBody).toBe(variant.visual.bodyShape);
	}

	expect(container.querySelector(".knob-fidget-vector")).toBeNull();
	expect(container.querySelector(".knob-fidget-asset-image")).toBeNull();
});

test("uses procedural chrome layers for polished metal", () => {
	const variant = getKnobVariant(KnobVariantId.PolishedMetal);
	const { container } = render(
		<KnobFidgetSurface angle={20} variant={variant} />,
	);
	const dial = container.querySelector(".knob-fidget-dial") as HTMLElement;
	const markerRotor = container.querySelector(
		".knob-fidget-marker-rotor",
	) as HTMLElement;
	const body = container.querySelector(
		".knob-fidget-hardware-body",
	) as HTMLElement;

	expect(dial.dataset.knobIndicator).toBe("slot");
	expect(dial.dataset.knobMaterial).toBe("polished-chrome");
	expect(body.dataset.knobMaterial).toBe("polished-chrome");
	expect(markerRotor.style.transform).toBe("translateZ(0) rotate(20deg)");
	expect(container.querySelector(".knob-fidget-reflection")).toBeTruthy();
	expect(container.querySelector(".knob-fidget-brush")).toBeTruthy();
	expect(container.querySelector(".knob-fidget-vector")).toBeNull();
	expect(container.querySelector(".knob-fidget-asset-image")).toBeNull();
});

test("renders new carbon fiber variant with shared procedural data", () => {
	const variant = getKnobVariant(KnobVariantId.CarbonFiber);
	const { container } = render(
		<>
			<KnobFidgetSurface angle={20} variant={variant} />
			<KnobFidgetSurface angle={20} mode="icon" disabled variant={variant} />
		</>,
	);
	const dials = Array.from(
		container.querySelectorAll(".knob-fidget-dial"),
	) as HTMLElement[];
	const bodies = Array.from(
		container.querySelectorAll(".knob-fidget-hardware-body"),
	) as HTMLElement[];
	const markerRotors = Array.from(
		container.querySelectorAll(".knob-fidget-marker-rotor"),
	) as HTMLElement[];

	expect(dials).toHaveLength(2);
	expect(bodies).toHaveLength(2);
	expect(markerRotors).toHaveLength(2);

	for (const dial of dials) {
		expect(dial.dataset.knobVariant).toBe(KnobVariantId.CarbonFiber);
		expect(dial.dataset.knobMaterial).toBe("carbon-composite");
		expect(dial.dataset.knobBody).toBe("carbon-composite");
		expect(dial.dataset.knobGrip).toBe("machined");
	}

	for (const body of bodies) {
		expect(body.dataset.knobMaterial).toBe("carbon-composite");
		expect(body.style.transform).toBe("");
	}

	for (const markerRotor of markerRotors) {
		expect(markerRotor.style.transform).toBe("translateZ(0) rotate(20deg)");
	}
});

test("derives tiny indicator metrics from knob geometry", () => {
	const variants = [
		getKnobVariant(KnobVariantId.BasicPlastic),
		getKnobVariant(KnobVariantId.LaboratoryDial),
		getKnobVariant(KnobVariantId.CarbonFiber),
	];
	const { container } = render(
		variants.map((variant) => (
			<KnobFidgetSurface
				key={variant.id}
				angle={20}
				disabled
				mode="icon"
				variant={variant}
			/>
		)),
	);
	const hardwareLayers = Array.from(
		container.querySelectorAll(".knob-fidget-hardware"),
	) as HTMLElement[];
	const metrics = hardwareLayers.map((layer) => getIndicatorMetricData(layer));

	expect(hardwareLayers).toHaveLength(3);
	expect(new Set(metrics.map((metric) => metric.width)).size).toBeGreaterThan(
		1,
	);
	expect(new Set(metrics.map((metric) => metric.length)).size).toBeGreaterThan(
		1,
	);

	for (const metric of metrics) {
		expect(metric.width).toBeGreaterThanOrEqual(1.2);
		expect(metric.width).toBeLessThanOrEqual(4.4);
		expect(metric.length).toBeGreaterThanOrEqual(7.5);
		expect(metric.length).toBeLessThanOrEqual(14);
		expect(metric.markerInset).toBeGreaterThan(metric.capInset);
		expect(metric.markerInset).toBeLessThanOrEqual(23);
	}
});

test("keeps preview and live indicator metrics identical for a variant", () => {
	const variant = getKnobVariant(KnobVariantId.LaboratoryDial);
	const { container } = render(
		<>
			<KnobFidgetSurface angle={20} variant={variant} />
			<KnobFidgetSurface angle={20} mode="icon" disabled variant={variant} />
		</>,
	);
	const hardwareLayers = Array.from(
		container.querySelectorAll(".knob-fidget-hardware"),
	) as HTMLElement[];

	expect(hardwareLayers).toHaveLength(2);
	expect(getIndicatorMetricData(hardwareLayers[0])).toEqual(
		getIndicatorMetricData(hardwareLayers[1]),
	);
});

function mockBrowserPointerSupport() {
	const originalSetPointerCapture = HTMLElement.prototype.setPointerCapture;
	const originalReleasePointerCapture =
		HTMLElement.prototype.releasePointerCapture;
	const originalHasPointerCapture = HTMLElement.prototype.hasPointerCapture;

	HTMLElement.prototype.setPointerCapture = () => undefined;
	HTMLElement.prototype.releasePointerCapture = () => undefined;
	HTMLElement.prototype.hasPointerCapture = () => true;

	return () => {
		HTMLElement.prototype.setPointerCapture = originalSetPointerCapture;
		HTMLElement.prototype.releasePointerCapture = originalReleasePointerCapture;
		HTMLElement.prototype.hasPointerCapture = originalHasPointerCapture;
	};
}

function mockAnimationFrames(): AnimationFrameMock {
	const originalRequestAnimationFrame = window.requestAnimationFrame;
	const originalCancelAnimationFrame = window.cancelAnimationFrame;
	const callbacks = new Map<number, FrameRequestCallback>();
	let nextFrameId = 1;
	let requestCount = 0;

	window.requestAnimationFrame = (callback) => {
		const frameId = nextFrameId;

		nextFrameId += 1;
		requestCount += 1;
		callbacks.set(frameId, callback);

		return frameId;
	};
	window.cancelAnimationFrame = (frameId) => {
		callbacks.delete(frameId);
	};

	return {
		flush() {
			const queuedCallbacks = Array.from(callbacks.entries());

			callbacks.clear();

			for (const [frameId, callback] of queuedCallbacks) {
				callback(frameId * 16);
			}
		},
		getRequestCount() {
			return requestCount;
		},
		restore() {
			window.requestAnimationFrame = originalRequestAnimationFrame;
			window.cancelAnimationFrame = originalCancelAnimationFrame;
		},
	};
}

function getMarkerRotor(dial: HTMLElement) {
	return dial.querySelector(".knob-fidget-marker-rotor") as HTMLElement;
}

function renderKnobFidget(variant: KnobVariant = defaultKnobVariant) {
	return render(<KnobFidget onBack={() => undefined} variantId={variant.id} />);
}

function mockDialBounds(dial: PointerCaptureElement) {
	dial.getBoundingClientRect = () =>
		({
			x: 0,
			y: 0,
			left: 0,
			top: 0,
			right: 300,
			bottom: 300,
			width: 300,
			height: 300,
			toJSON: () => ({}),
		}) as DOMRect;
}

function dispatchPointerEvent(
	element: HTMLElement,
	type: string,
	clientX: number,
	clientY: number,
) {
	const event = new Event(type, { bubbles: true, cancelable: true });

	Object.defineProperties(event, {
		clientX: { value: clientX },
		clientY: { value: clientY },
		pointerId: { value: 1 },
	});

	fireEvent(element, event);
}

function dispatchPointerAngle(
	element: HTMLElement,
	type: string,
	angle: number,
) {
	const radians = ((angle - 90) * Math.PI) / 180;
	const radius = 150;
	const center = 150;

	dispatchPointerEvent(
		element,
		type,
		center + Math.cos(radians) * radius,
		center + Math.sin(radians) * radius,
	);
}

function getIndicatorMetricData(layer: HTMLElement) {
	return {
		capInset: readPercentVariable(layer, "--knob-cap-inset"),
		length: readPercentVariable(layer, "--knob-indicator-length"),
		markerInset: readPercentVariable(layer, "--knob-marker-inset"),
		top: readPercentVariable(layer, "--knob-indicator-top"),
		width: readPercentVariable(layer, "--knob-indicator-width"),
	};
}

function readPercentVariable(layer: HTMLElement, property: string) {
	return Number.parseFloat(layer.style.getPropertyValue(property));
}
