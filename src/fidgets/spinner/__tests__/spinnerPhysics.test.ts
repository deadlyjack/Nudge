import {
	addPointerSample,
	advanceSpinnerFrame,
	advanceSpinnerFrames,
	clampAngularVelocity,
	decayAngularVelocity,
	getAngularVelocity,
	getDirectedAngleDelta,
	getGrabbedRotorAngle,
	getPointerMovementDirection,
	getSampledAngularVelocity,
	getSampledUnwrappedAngularVelocity,
	getShortestAngleDelta,
	getTickCrossings,
	SPINNER_STOP_SPEED,
	shouldStartSpinnerDrag,
} from "../spinnerPhysics";
import { SpinnerVariantId } from "../spinnerTypes";
import { getSpinnerVariant } from "../spinnerVariants";

test("wraps angle deltas across zero", () => {
	expect(getShortestAngleDelta(350, 10)).toBe(20);
	expect(getShortestAngleDelta(10, 350)).toBe(-20);
});

test("uses direction hint for ambiguous half-turn flicks", () => {
	expect(getDirectedAngleDelta(315, 135, 1)).toBe(180);
	expect(getDirectedAngleDelta(315, 135, -1)).toBe(-180);
	expect(getDirectedAngleDelta(315, 135, 0)).toBe(-180);
	expect(getDirectedAngleDelta(315, 140, 1)).toBe(175);
});

test("derives angular velocity from angle change and elapsed time", () => {
	expect(getAngularVelocity(0, 90, 250)).toBe(360);
	expect(getAngularVelocity(90, 0, 250)).toBe(-360);
});

test("decays angular velocity over time", () => {
	const decayedVelocity = decayAngularVelocity(1000, 0.5);

	expect(decayedVelocity).toBeGreaterThan(SPINNER_STOP_SPEED);
	expect(decayedVelocity).toBeLessThan(1000);
});

test("keeps enough momentum for a longer coast", () => {
	expect(decayAngularVelocity(1000, 1)).toBeGreaterThan(700);
});

test("keeps spinner variant momentum for a much longer coast", () => {
	const spinner1 = getSpinnerVariant(SpinnerVariantId.Spinner1);
	const frame = advanceSpinnerFrames(
		{ angle: 0, angularVelocity: 1000 },
		3,
		spinner1.physics,
	).frame;

	expect(frame.angularVelocity).toBeGreaterThan(650);
});

test("advances consistently across low and high frame rates", () => {
	const spinner1 = getSpinnerVariant(SpinnerVariantId.Spinner1);
	const lowFrameRateFrame = advanceSpinnerSequence(30, 2, spinner1.physics);
	const highFrameRateFrame = advanceSpinnerSequence(120, 2, spinner1.physics);

	expect(lowFrameRateFrame.angularVelocity).toBeCloseTo(
		highFrameRateFrame.angularVelocity,
		6,
	);
	expect(
		Math.abs(
			getShortestAngleDelta(lowFrameRateFrame.angle, highFrameRateFrame.angle),
		),
	).toBeLessThan(0.001);
});

test("decays higher-friction basic spinners faster than premium spinners", () => {
	const basicSpinner = getSpinnerVariant(SpinnerVariantId.Spinner5);
	const spinner15 = getSpinnerVariant(SpinnerVariantId.Spinner15);
	const basicFrame = advanceSpinnerFrame(
		{ angle: 0, angularVelocity: 1000 },
		1,
		basicSpinner.physics,
	);
	const spinner15Frame = advanceSpinnerFrame(
		{ angle: 0, angularVelocity: 1000 },
		1,
		spinner15.physics,
	);

	expect(basicFrame.angularVelocity).toBeLessThan(
		spinner15Frame.angularVelocity,
	);
});

test("derives spinner physics from collection weight and friction", () => {
	const basicSpinner = getSpinnerVariant(SpinnerVariantId.Spinner5);
	const metalSpinner = getSpinnerVariant(SpinnerVariantId.Spinner8);
	const spinner15 = getSpinnerVariant(SpinnerVariantId.Spinner15);

	expect(basicSpinner.physics.weight).toBe(0.88);
	expect(metalSpinner.physics.weight).toBe(1.4);
	expect(spinner15.physics.weight).toBe(1.65);
	expect(basicSpinner.physics.inertia).toBeLessThan(spinner15.physics.inertia);
	expect(basicSpinner.physics.friction).toBeGreaterThan(
		spinner15.physics.friction,
	);
	expect(basicSpinner.physics.tickInterval).toBeLessThan(
		spinner15.physics.tickInterval,
	);
});

test("clamps speed by spinner variant", () => {
	const spinner1 = getSpinnerVariant(SpinnerVariantId.Spinner1);
	const spinner15 = getSpinnerVariant(SpinnerVariantId.Spinner15);

	expect(clampAngularVelocity(6000, spinner1.physics)).toBe(
		spinner1.physics.maxAngularVelocity,
	);
	expect(clampAngularVelocity(6000, spinner15.physics)).toBe(
		spinner15.physics.maxAngularVelocity,
	);
});

test("stops when angular velocity falls below threshold", () => {
	expect(decayAngularVelocity(SPINNER_STOP_SPEED - 1, 0.1)).toBe(0);
});

test("stops according to variant stop speed", () => {
	const spinner1 = getSpinnerVariant(SpinnerVariantId.Spinner1);
	const spinner15 = getSpinnerVariant(SpinnerVariantId.Spinner15);

	expect(
		advanceSpinnerFrame(
			{ angle: 0, angularVelocity: spinner1.physics.stopSpeed - 1 },
			0.1,
			spinner1.physics,
		).angularVelocity,
	).toBe(0);
	expect(
		advanceSpinnerFrame(
			{ angle: 0, angularVelocity: spinner15.physics.stopSpeed - 1 },
			0.1,
			spinner15.physics,
		).angularVelocity,
	).toBe(0);
});

test("advances angle and preserves inertial direction", () => {
	const frame = advanceSpinnerFrame({ angle: 350, angularVelocity: 120 }, 0.25);

	expect(frame.angle).toBeCloseTo(20);
	expect(frame.angularVelocity).toBeGreaterThan(0);
});

test("uses grab offset without snapping to pointer angle", () => {
	expect(getGrabbedRotorAngle(45, 10, 10)).toBe(45);
	expect(getGrabbedRotorAngle(45, 10, 40)).toBe(75);
	expect(getGrabbedRotorAngle(0, 315, 135, 1)).toBe(180);
});

test("movement threshold prevents accidental rotation", () => {
	expect(shouldStartSpinnerDrag(10, 10, 12, 12)).toBe(false);
	expect(shouldStartSpinnerDrag(10, 10, 20, 10)).toBe(true);
});

test("infers clockwise diagonal flick direction", () => {
	const bounds = createBounds();

	expect(getPointerMovementDirection(0, 0, 300, 300, bounds)).toBe(1);
	expect(getPointerMovementDirection(300, 300, 0, 0, bounds)).toBe(-1);
});

test("samples recent angles for release velocity", () => {
	const samples = addPointerSample(
		addPointerSample([{ angle: 0, timestamp: 0 }], {
			angle: 12,
			timestamp: 40,
		}),
		{ angle: 54, timestamp: 90 },
	);

	expect(getSampledAngularVelocity(samples)).toBe(600);
});

test("samples unwrapped angles without reversing after a half turn", () => {
	const samples = [
		{ angle: 0, timestamp: 0 },
		{ angle: 120, timestamp: 40 },
		{ angle: 240, timestamp: 80 },
	];

	expect(getSampledUnwrappedAngularVelocity(samples)).toBe(3000);
});

test("detects tick crossings across bearing intervals", () => {
	expect(getTickCrossings(10, 95, 30)).toBe(3);
	expect(getTickCrossings(95, 10, 30)).toBe(3);
	expect(getTickCrossings(350, 20, 30)).toBe(1);
});

function createBounds() {
	return {
		bottom: 300,
		height: 300,
		left: 0,
		right: 300,
		toJSON: () => ({}),
		top: 0,
		width: 300,
		x: 0,
		y: 0,
	} as DOMRect;
}

function advanceSpinnerSequence(
	frameRate: number,
	seconds: number,
	settings = getSpinnerVariant(SpinnerVariantId.Spinner1).physics,
) {
	let frame = { angle: 0, angularVelocity: 3000 };
	const frameCount = frameRate * seconds;

	for (let index = 0; index < frameCount; index += 1) {
		frame = advanceSpinnerFrames(frame, 1 / frameRate, settings).frame;
	}

	return frame;
}
