import {
	drawSpinnerMotionBlur,
	getSpinnerMotionVisuals,
	getSpinnerMotionVisualsForProfile,
	getSpinnerNominalRotorRadius,
	getSpinnerVisibleScale,
} from "../spinnerMotion";
import { SpinnerVariantId } from "../spinnerTypes";
import { getSpinnerVariant } from "../spinnerVariants";

test("keeps the spinner crisp at low speed", () => {
	const visuals = getSpinnerMotionVisuals(300);

	expect(visuals.active).toBe(0);
	expect(visuals.exposureMs).toBe(0);
	expect(visuals.smearOpacity).toBe(0);
	expect(visuals.sweepOpacity).toBe(0);
	expect(visuals.lobeClarity).toBe(1);
	expect(visuals.lobeOuterRadius).toBe(1);
	expect(visuals.nominalRotorRadius).toBeLessThan(1);
});

test("increases motion trails at medium speed", () => {
	const slowVisuals = getSpinnerMotionVisuals(450);
	const mediumVisuals = getSpinnerMotionVisuals(1200);

	expect(mediumVisuals.active).toBe(1);
	expect(mediumVisuals.exposureMs).toBeGreaterThan(0);
	expect(mediumVisuals.sweepOpacity).toBeGreaterThan(slowVisuals.sweepOpacity);
});

test("reduces lobe clarity at high speed", () => {
	const mediumVisuals = getSpinnerMotionVisuals(1200);
	const fastVisuals = getSpinnerMotionVisuals(3200);

	expect(fastVisuals.smearOpacity).toBeGreaterThan(mediumVisuals.smearOpacity);
	expect(fastVisuals.sweepOpacity).toBeGreaterThan(mediumVisuals.sweepOpacity);
	expect(fastVisuals.lobeClarity).toBeLessThan(mediumVisuals.lobeClarity);
});

test("matches blur geometry to the visible spinner footprint", () => {
	const visuals = getSpinnerMotionVisuals(3200);

	expect(getSpinnerVisibleScale()).toBeGreaterThan(1);
	expect(getSpinnerNominalRotorRadius()).toBeLessThan(1);
	expect(visuals.lobeOuterRadius).toBe(1);
	expect(visuals.lobeOuterRadius).toBeGreaterThan(visuals.nominalRotorRadius);
});

test("maps negative speed by absolute velocity", () => {
	expect(getSpinnerMotionVisuals(-2200)).toEqual(getSpinnerMotionVisuals(2200));
});

test("matches blur geometry to spinner shape", () => {
	const bar = getSpinnerVariant(SpinnerVariantId.Spinner2);
	const quad = getSpinnerVariant(SpinnerVariantId.Spinner4);
	const tri = getSpinnerVariant(SpinnerVariantId.Spinner15);

	expect(bar.motion.sweepAngles).toEqual([0, 180]);
	expect(quad.motion.sweepAngles).toEqual([0, 90, 180, 270]);
	expect(tri.motion.sweepAngles).toEqual([0, 120, 240]);
	expect(
		getSpinnerMotionVisualsForProfile(3200, bar.motion).lobeOuterRadius,
	).toBeCloseTo(0.94);
});

test("draws trails with selected color and shape offsets", () => {
	const originalDevicePixelRatio = window.devicePixelRatio;
	const bar = getSpinnerVariant(SpinnerVariantId.Spinner8);
	const context = createMockContext();
	const canvas = createMockCanvas(context);

	Object.defineProperty(window, "devicePixelRatio", {
		configurable: true,
		value: 1,
	});

	drawSpinnerMotionBlur(
		canvas,
		{ angle: 0, angularVelocity: 3200 },
		bar.motion,
		bar.color,
		true,
	);

	expect(context.fillStyle).toContain(bar.color.trailRgb);
	expect(context.strokeStyle).toContain(bar.color.trailRgb);
	expect(context.moveTo).toHaveBeenCalledTimes(bar.motion.sweepAngles.length);

	Object.defineProperty(window, "devicePixelRatio", {
		configurable: true,
		value: originalDevicePixelRatio,
	});
});

function createMockContext() {
	return {
		arc: jest.fn(),
		beginPath: jest.fn(),
		clearRect: jest.fn(),
		fill: jest.fn(),
		fillStyle: "",
		lineCap: "",
		lineJoin: "",
		lineTo: jest.fn(),
		lineWidth: 0,
		moveTo: jest.fn(),
		restore: jest.fn(),
		save: jest.fn(),
		setTransform: jest.fn(),
		stroke: jest.fn(),
		strokeStyle: "",
	} as unknown as CanvasRenderingContext2D & {
		fillStyle: string;
		moveTo: jest.Mock;
		strokeStyle: string;
	};
}

function createMockCanvas(context: CanvasRenderingContext2D) {
	return {
		getBoundingClientRect: () =>
			({
				bottom: 200,
				height: 200,
				left: 0,
				right: 200,
				toJSON: () => ({}),
				top: 0,
				width: 200,
				x: 0,
				y: 0,
			}) as DOMRect,
		getContext: () => context,
		height: 0,
		parentElement: null,
		width: 0,
	} as unknown as HTMLCanvasElement;
}
