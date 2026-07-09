import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import vibrate from "lib/haptics";
import store from "lib/store";
import type { ComponentProps } from "react";
import createSpinnerAudio from "../audio/createSpinnerAudio";
import SpinnerFidget from "../SpinnerFidget";
import { advanceSpinnerFrames } from "../spinnerPhysics";
import { SpinnerVariantId } from "../spinnerTypes";
import { getSpinnerVariant } from "../spinnerVariants";

const mockCreateSpinnerAudioController = () => ({
	dispose: jest.fn(),
	start: jest.fn(),
	stop: jest.fn(),
	unlock: jest.fn(),
	update: jest.fn(),
});
let mockSpinnerAudio = mockCreateSpinnerAudioController();
const mockSpinnerAudioControllers: ReturnType<
	typeof mockCreateSpinnerAudioController
>[] = [];
const mockCanvasContextMethods = {
	arc: jest.fn(),
	beginPath: jest.fn(),
	clearRect: jest.fn(),
	fill: jest.fn(),
	lineTo: jest.fn(),
	moveTo: jest.fn(),
	restore: jest.fn(),
	save: jest.fn(),
	setTransform: jest.fn(),
	stroke: jest.fn(),
};
const mockCanvasContext =
	mockCanvasContextMethods as unknown as CanvasRenderingContext2D;

jest.mock("../audio/createSpinnerAudio", () => ({
	__esModule: true,
	default: jest.fn(() => {
		mockSpinnerAudio = mockCreateSpinnerAudioController();
		mockSpinnerAudioControllers.push(mockSpinnerAudio);
		return mockSpinnerAudio;
	}),
}));

jest.mock("lib/haptics", () => ({
	__esModule: true,
	default: jest.fn(),
}));

jest.mock("lib/store", () => ({
	__esModule: true,
	default: {
		get: jest.fn(),
		remove: jest.fn(),
		set: jest.fn(),
	},
}));

const mockStore = store as jest.Mocked<typeof store>;
const mockVibrate = vibrate as jest.MockedFunction<typeof vibrate>;

interface PointerCaptureElement extends HTMLElement {
	setPointerCapture(pointerId: number): void;
	releasePointerCapture(pointerId: number): void;
	hasPointerCapture(pointerId: number): boolean;
}

beforeEach(() => {
	jest.clearAllMocks();
	mockSpinnerAudioControllers.length = 0;
	mockStore.get.mockResolvedValue(null);
	mockStore.set.mockResolvedValue(undefined);
	window.localStorage.clear();
	clearCanvasMocks();
});

test("renders the spinner fidget", () => {
	renderSpinnerFidget();

	expect(screen.getByRole("heading", { name: "Curved Bar" })).toBeTruthy();
	expect(getShellTitleText()).toBe("");
	expect(
		screen.getByRole("button", { name: "Flick the spinner" }),
	).toBeTruthy();
	expect(screen.queryByText("Drag and flick the edge.")).toBeNull();
	expect(screen.queryByText("Speed")).toBeNull();
	expect(screen.queryByText("Best")).toBeNull();
	expect(screen.queryByText(/rpm/)).toBeNull();
	expect(screen.getAllByText("0")).toHaveLength(2);
	expect(screen.getByTestId("spinner-current-speed")).toBeTruthy();
	expect(screen.getByTestId("spinner-best-speed")).toBeTruthy();
	expect(createSpinnerAudio).toHaveBeenCalled();
	expect(screen.queryByRole("combobox", { name: "Spinner type" })).toBeNull();

	const spinner = screen.getByRole("button", {
		name: "Flick the spinner",
	});
	const visualStage = spinner.querySelector(".spinner-fidget-stage");
	const motionCanvas = spinner.querySelector(".spinner-fidget-motion-canvas");
	const rotor = spinner.querySelector(".spinner-rotor");

	expect(visualStage).toBeTruthy();
	expect(motionCanvas).toBeTruthy();
	expect(visualStage?.contains(motionCanvas)).toBe(true);
	expect(visualStage?.contains(rotor)).toBe(true);
	expect(rotor?.contains(motionCanvas)).toBe(false);

	const currentSpeed = screen.getByTestId("spinner-current-speed");
	const bestSpeed = screen.getByTestId("spinner-best-speed");

	expect(getComputedStyle(currentSpeed).transform).toBe(
		getComputedStyle(bestSpeed).transform,
	);
});

test("renders titlebar selector action when provided", () => {
	const onOpenSelector = jest.fn();

	renderSpinnerFidget({ onOpenSelector });

	fireEvent.click(screen.getByRole("button", { name: "Choose spinner" }));

	expect(onOpenSelector).toHaveBeenCalledTimes(1);
});

test("loads best speed separately for each spinner type", async () => {
	mockStore.get.mockImplementation(async (key) =>
		key === "nudge.spinner.bestSpeed.spinner-15" ? 2400 : null,
	);

	renderSpinnerFidget({
		variantId: SpinnerVariantId.Spinner15,
	});

	expect(screen.getByRole("heading", { name: "Ring Tri" })).toBeTruthy();
	await waitFor(() =>
		expect(screen.getByTestId("spinner-best-speed").textContent).toBe("400"),
	);
	expect(screen.getByTestId("spinner-current-speed").textContent).toBe("0");
});

test("restores saved rotor angle for the selected spinner", () => {
	window.localStorage.setItem("nudge.spinner.angle.spinner-1", "123");

	renderSpinnerFidget();

	const spinner = screen.getByRole("button", {
		name: "Flick the spinner",
	});
	const rotor = spinner.querySelector(".spinner-rotor") as HTMLElement;

	expect(rotor.style.transform).toBe("translateZ(0) rotate(123deg)");
});

test("uses selected spinner 15 and keeps flicking usable", () => {
	const restoreBrowserMocks = mockBrowserPointerSupport();
	let animationStep: FrameRequestCallback | null = null;

	window.requestAnimationFrame = (callback) => {
		animationStep = callback;
		return 1;
	};

	renderSpinnerFidget({
		variantId: SpinnerVariantId.Spinner15,
	});

	const spinner = screen.getByRole("button", {
		name: "Flick the spinner",
	}) as PointerCaptureElement;
	const fidget = spinner.closest(".spinner-fidget");

	mockSpinnerBounds(spinner);

	dispatchPointerEvent(spinner, "pointerdown", 150, 0, 10);
	dispatchPointerEvent(spinner, "pointermove", 300, 150, 30);

	expect(fidget?.getAttribute("data-spinner-variant")).toBe("spinner-15");
	expect(animationStep).not.toBeNull();
	expect(() => animationStep?.(36)).not.toThrow();
	expect(screen.getAllByText("429")).toHaveLength(2);
	expect(
		Number(window.localStorage.getItem("nudge.spinner.bestSpeed.spinner-15")),
	).toBeCloseTo(2571.43);

	dispatchPointerEvent(spinner, "pointerup", 300, 150, 40);

	expect(mockSpinnerAudio.start).toHaveBeenCalled();

	restoreBrowserMocks();
});

test("does not rotate on pointer down or tiny accidental movement", () => {
	const restoreBrowserMocks = mockBrowserPointerSupport();

	renderSpinnerFidget();

	const spinner = screen.getByRole("button", {
		name: "Flick the spinner",
	}) as PointerCaptureElement;
	const rotor = spinner.querySelector(".spinner-rotor") as HTMLElement;

	mockSpinnerBounds(spinner);

	const initialTransform = rotor.style.transform;

	dispatchPointerEvent(spinner, "pointerdown", 150, 0, 10);
	dispatchPointerEvent(spinner, "pointermove", 152, 0, 20);

	expect(rotor.style.transform).toBe(initialTransform);
	expect(mockCanvasContextMethods.clearRect).toHaveBeenCalled();
	expect(mockSpinnerAudio.unlock).toHaveBeenCalledTimes(1);

	restoreBrowserMocks();
});

test("resets motion when released without movement", () => {
	const restoreBrowserMocks = mockBrowserPointerSupport();

	renderSpinnerFidget();

	const spinner = screen.getByRole("button", {
		name: "Flick the spinner",
	}) as PointerCaptureElement;
	const rotor = spinner.querySelector(".spinner-rotor") as HTMLElement;

	mockSpinnerBounds(spinner);

	rotor.style.setProperty("--spinner-lobe-clarity", "0.4");

	dispatchPointerEvent(spinner, "pointerdown", 150, 0, 10);
	dispatchPointerEvent(spinner, "pointerup", 150, 0, 20);

	expect(mockCanvasContextMethods.clearRect).toHaveBeenCalled();
	expect(mockCanvasContextMethods.fill).not.toHaveBeenCalled();
	expect(mockCanvasContextMethods.stroke).not.toHaveBeenCalled();
	expect(rotor.style.getPropertyValue("--spinner-lobe-clarity")).toBe("1");
	expect(screen.getByTestId("spinner-current-speed").textContent).toBe("0");

	restoreBrowserMocks();
});

test("accepts a drag flick and releases into inertial animation", () => {
	const restoreBrowserMocks = mockBrowserPointerSupport();
	let animationStep: FrameRequestCallback | null = null;

	window.requestAnimationFrame = (callback) => {
		animationStep = callback;
		return 1;
	};

	renderSpinnerFidget();

	const spinner = screen.getByRole("button", {
		name: "Flick the spinner",
	}) as PointerCaptureElement;
	const rotor = spinner.querySelector(".spinner-rotor") as HTMLElement;

	mockSpinnerBounds(spinner);

	const initialTransform = rotor.style.transform;

	dispatchPointerEvent(spinner, "pointerdown", 150, 0, 10);
	dispatchPointerEvent(spinner, "pointermove", 300, 150, 30);

	expect(animationStep).not.toBeNull();
	expect(() => animationStep?.(36)).not.toThrow();
	animationStep = null;

	expect(rotor.style.transform).not.toBe(initialTransform);
	expect(mockCanvasContextMethods.fill).toHaveBeenCalled();
	expect(mockCanvasContextMethods.stroke).toHaveBeenCalled();
	expect(screen.getAllByText("560")).toHaveLength(2);
	expect(
		Number(window.localStorage.getItem("nudge.spinner.bestSpeed.spinner-1")),
	).toBeCloseTo(3360.72);
	expect(
		Number(rotor.style.getPropertyValue("--spinner-lobe-clarity")),
	).toBeLessThan(1);

	dispatchPointerEvent(spinner, "pointerup", 300, 150, 40);

	expect(animationStep).not.toBeNull();
	expect(() => animationStep?.(56)).not.toThrow();
	expect(mockSpinnerAudio.start).toHaveBeenCalled();
	expect(mockSpinnerAudio.update).toHaveBeenCalled();

	restoreBrowserMocks();
});

test("reports active coast frames to the parent", () => {
	const restoreBrowserMocks = mockBrowserPointerSupport();
	const onFrameChange = jest.fn();
	const animationSteps: FrameRequestCallback[] = [];

	window.requestAnimationFrame = (callback) => {
		animationSteps.push(callback);
		return animationSteps.length;
	};

	renderSpinnerFidget({ onFrameChange });

	const spinner = screen.getByRole("button", {
		name: "Flick the spinner",
	}) as PointerCaptureElement;

	mockSpinnerBounds(spinner);

	dispatchPointerEvent(spinner, "pointerdown", 150, 0, 10);
	dispatchPointerEvent(spinner, "pointermove", 300, 150, 30);

	const dragStep = animationSteps.shift();

	dragStep?.(36);
	dispatchPointerEvent(spinner, "pointerup", 300, 150, 40);

	const coastStep = animationSteps.shift();

	coastStep?.(140);

	const reportedFrames = onFrameChange.mock.calls.map(
		([frame]) => frame as { angle: number; angularVelocity: number },
	);

	expect(
		reportedFrames.some((frame) => Math.abs(frame.angularVelocity) > 0),
	).toBe(true);
	expect(reportedFrames[reportedFrames.length - 1].angle).toBeCloseTo(
		getRotorAngle(spinner.querySelector(".spinner-rotor") as HTMLElement),
		3,
	);

	restoreBrowserMocks();
});

test("syncs hero-owned frame updates without drawing motion blur", () => {
	const restoreBrowserMocks = mockBrowserPointerSupport();
	const initialFrame = { angle: 24, angularVelocity: 1500 };
	const liveFrame = { angle: 92, angularVelocity: 1320 };
	const view = renderSpinnerFidget({
		heroHidden: true,
		initialFrame,
	});
	const spinner = screen.getByRole("button", {
		name: "Flick the spinner",
	});
	const rotor = spinner.querySelector(".spinner-rotor") as HTMLElement;

	mockSpinnerBounds(spinner as PointerCaptureElement);
	clearCanvasMocks();
	view.rerender(
		<SpinnerFidget
			heroHidden
			initialFrame={liveFrame}
			onBack={() => undefined}
			variantId={SpinnerVariantId.Spinner1}
		/>,
	);

	expect(rotor.style.transform).toBe("translateZ(0) rotate(92deg)");
	expect(mockCanvasContextMethods.clearRect).toHaveBeenCalled();
	expect(mockCanvasContextMethods.fill).not.toHaveBeenCalled();
	expect(mockCanvasContextMethods.stroke).not.toHaveBeenCalled();
	expect(rotor.style.getPropertyValue("--spinner-lobe-clarity")).toBe("1");

	restoreBrowserMocks();
});

test("resumes coast after the hero releases the spinner page", () => {
	const restoreBrowserMocks = mockBrowserPointerSupport();
	const animationSteps: FrameRequestCallback[] = [];
	const liveFrame = { angle: 38, angularVelocity: 1800 };

	window.requestAnimationFrame = (callback) => {
		animationSteps.push(callback);
		return animationSteps.length;
	};

	const view = renderSpinnerFidget({
		heroHidden: true,
		initialFrame: liveFrame,
	});
	const spinner = screen.getByRole("button", {
		name: "Flick the spinner",
	});
	const rotor = spinner.querySelector(".spinner-rotor") as HTMLElement;

	view.rerender(
		<SpinnerFidget
			initialFrame={liveFrame}
			onBack={() => undefined}
			variantId={SpinnerVariantId.Spinner1}
		/>,
	);

	expect(mockSpinnerAudio.start).toHaveBeenCalledWith(
		liveFrame.angularVelocity,
	);

	const firstCoastStep = animationSteps.shift();
	firstCoastStep?.(100);
	const secondCoastStep = animationSteps.shift();
	secondCoastStep?.(132);

	expect(getRotorAngle(rotor)).not.toBeCloseTo(liveFrame.angle, 3);
	expect(mockSpinnerAudio.update).toHaveBeenCalled();

	restoreBrowserMocks();
});

test("pulses and vibrates when a new best speed is reached", () => {
	const restoreBrowserMocks = mockBrowserPointerSupport();
	let animationStep: FrameRequestCallback | null = null;

	window.requestAnimationFrame = (callback) => {
		animationStep = callback;
		return 1;
	};

	renderSpinnerFidget();

	const spinner = screen.getByRole("button", {
		name: "Flick the spinner",
	}) as PointerCaptureElement;
	const bestValue = getBestSpeedValue();

	mockSpinnerBounds(spinner);

	dispatchPointerEvent(spinner, "pointerdown", 150, 0, 10);
	dispatchPointerEvent(spinner, "pointermove", 300, 150, 30);

	expect(animationStep).not.toBeNull();
	expect(() => animationStep?.(36)).not.toThrow();

	expect(bestValue.classList.contains("is-best-updated")).toBe(true);
	expect(mockVibrate).toHaveBeenCalledWith([4, 22, 8]);

	restoreBrowserMocks();
});

test("releases a top-left diagonal flick clockwise", () => {
	const restoreBrowserMocks = mockBrowserPointerSupport();

	renderSpinnerFidget();

	const spinner = screen.getByRole("button", {
		name: "Flick the spinner",
	}) as PointerCaptureElement;

	mockSpinnerBounds(spinner);

	dispatchPointerEvent(spinner, "pointerdown", 0, 0, 10);
	dispatchPointerEvent(spinner, "pointermove", 300, 300, 30);
	dispatchPointerEvent(spinner, "pointerup", 300, 300, 40);

	expect(mockSpinnerAudio.start).toHaveBeenCalledWith(expect.any(Number));
	expect(mockSpinnerAudio.start.mock.calls[0][0]).toBeGreaterThan(0);

	restoreBrowserMocks();
});

test("keeps clockwise release velocity after dragging past halfway", () => {
	const restoreBrowserMocks = mockBrowserPointerSupport();

	renderSpinnerFidget();

	const spinner = screen.getByRole("button", {
		name: "Flick the spinner",
	}) as PointerCaptureElement;

	mockSpinnerBounds(spinner);

	dispatchPointerEvent(spinner, "pointerdown", 150, 0, 10);
	dispatchPointerEvent(spinner, "pointermove", 300, 150, 30);
	dispatchPointerEvent(spinner, "pointermove", 150, 300, 50);
	dispatchPointerEvent(spinner, "pointermove", 0, 150, 70);
	dispatchPointerEvent(spinner, "pointerup", 0, 150, 80);

	expect(mockSpinnerAudio.start).toHaveBeenCalledWith(expect.any(Number));
	expect(mockSpinnerAudio.start.mock.calls[0][0]).toBeGreaterThan(0);

	restoreBrowserMocks();
});

test("keeps slow drag and coast frames off the motion canvas", () => {
	const restoreBrowserMocks = mockBrowserPointerSupport();
	const animationSteps: FrameRequestCallback[] = [];

	window.requestAnimationFrame = (callback) => {
		animationSteps.push(callback);
		return animationSteps.length;
	};

	renderSpinnerFidget();

	const spinner = screen.getByRole("button", {
		name: "Flick the spinner",
	}) as PointerCaptureElement;
	const rotor = spinner.querySelector(".spinner-rotor") as HTMLElement;

	mockSpinnerBounds(spinner);

	const initialTransform = rotor.style.transform;

	dispatchPointerEvent(spinner, "pointerdown", 150, 0, 10);
	clearCanvasMocks();
	dispatchPointerEvent(spinner, "pointermove", 156, 0, 110);

	const dragStep = animationSteps.shift();

	expect(dragStep).toBeTruthy();
	dragStep?.(126);

	expect(rotor.style.transform).not.toBe(initialTransform);
	expect(mockCanvasContextMethods.clearRect).not.toHaveBeenCalled();
	expect(mockCanvasContextMethods.fill).not.toHaveBeenCalled();
	expect(mockCanvasContextMethods.stroke).not.toHaveBeenCalled();

	dispatchPointerEvent(spinner, "pointerup", 156, 0, 130);
	clearCanvasMocks();

	const coastStep = animationSteps.shift();

	expect(coastStep).toBeTruthy();
	coastStep?.(146);

	expect(mockCanvasContextMethods.clearRect).not.toHaveBeenCalled();
	expect(mockCanvasContextMethods.fill).not.toHaveBeenCalled();
	expect(mockCanvasContextMethods.stroke).not.toHaveBeenCalled();

	restoreBrowserMocks();
});

test("advances low frame rate coast by real elapsed time", () => {
	const restoreBrowserMocks = mockBrowserPointerSupport();
	const animationSteps: FrameRequestCallback[] = [];

	window.requestAnimationFrame = (callback) => {
		animationSteps.push(callback);
		return animationSteps.length;
	};

	renderSpinnerFidget();

	const spinner = screen.getByRole("button", {
		name: "Flick the spinner",
	}) as PointerCaptureElement;
	const rotor = spinner.querySelector(".spinner-rotor") as HTMLElement;

	mockSpinnerBounds(spinner);

	dispatchPointerEvent(spinner, "pointerdown", 150, 0, 10);
	dispatchPointerEvent(spinner, "pointermove", 300, 150, 30);

	const dragStep = animationSteps.shift();

	dragStep?.(36);
	dispatchPointerEvent(spinner, "pointerup", 300, 150, 40);

	const startSpeed = mockSpinnerAudio.start.mock.calls[0][0] as number;
	const initialFrame = {
		angle: getRotorAngle(rotor),
		angularVelocity: startSpeed,
	};
	const initialCoastStep = animationSteps.shift();

	initialCoastStep?.(40);
	mockSpinnerAudio.update.mockClear();

	const lowFrameRateStep = animationSteps.shift();

	lowFrameRateStep?.(140);

	const expectedFrame = advanceSpinnerFrames(
		initialFrame,
		0.1,
		getSpinnerVariant(SpinnerVariantId.Spinner1).physics,
	).frame;
	const updateCalls = mockSpinnerAudio.update.mock.calls;
	const updatePayload = updateCalls[updateCalls.length - 1][0] as {
		speed: number;
		timestamp: number;
	};

	expect(getRotorAngle(rotor)).toBeCloseTo(expectedFrame.angle, 3);
	expect(updatePayload.speed).toBeCloseTo(expectedFrame.angularVelocity, 3);
	expect(updatePayload.timestamp).toBe(140);

	restoreBrowserMocks();
});

test("keeps current speed visible when grabbing a spinning rotor", () => {
	const restoreBrowserMocks = mockBrowserPointerSupport();
	const coastingSpinner = startCoastingSpinner();
	const speedBeforeGrab = screen.getByTestId(
		"spinner-current-speed",
	).textContent;

	clearCanvasMocks();
	dispatchPointerEvent(coastingSpinner.spinner, "pointerdown", 150, 0, 150);

	expect(screen.getByTestId("spinner-current-speed").textContent).toBe(
		speedBeforeGrab,
	);
	expect(screen.getByTestId("spinner-current-speed").textContent).not.toBe("0");
	expect(mockCanvasContextMethods.clearRect).toHaveBeenCalled();
	expect(mockCanvasContextMethods.fill).not.toHaveBeenCalled();
	expect(mockCanvasContextMethods.stroke).not.toHaveBeenCalled();
	expect(
		coastingSpinner.rotor.style.getPropertyValue("--spinner-lobe-clarity"),
	).toBe("1");

	clearCanvasMocks();
	dispatchPointerEvent(coastingSpinner.spinner, "pointerup", 150, 0, 170);

	expect(screen.getByTestId("spinner-current-speed").textContent).toBe("0");
	expect(mockCanvasContextMethods.clearRect).toHaveBeenCalled();
	expect(mockCanvasContextMethods.fill).not.toHaveBeenCalled();
	expect(mockCanvasContextMethods.stroke).not.toHaveBeenCalled();
	expect(
		coastingSpinner.rotor.style.getPropertyValue("--spinner-lobe-clarity"),
	).toBe("1");

	restoreBrowserMocks();
});

test("adds momentum when dragging with the current spin", () => {
	const restoreBrowserMocks = mockBrowserPointerSupport();
	const coastingSpinner = startCoastingSpinner();

	mockSpinnerAudio.start.mockClear();
	dispatchPointerEvent(coastingSpinner.spinner, "pointerdown", 150, 0, 150);
	dispatchPointerEvent(coastingSpinner.spinner, "pointermove", 300, 150, 170);
	dispatchPointerEvent(coastingSpinner.spinner, "pointerup", 300, 150, 180);

	const boostedSpeed = mockSpinnerAudio.start.mock.calls[0][0] as number;

	expect(boostedSpeed).toBeGreaterThan(coastingSpinner.startSpeed);

	restoreBrowserMocks();
});

test("counters momentum when dragging against the current spin", () => {
	const restoreBrowserMocks = mockBrowserPointerSupport();
	const coastingSpinner = startCoastingSpinner();

	mockSpinnerAudio.start.mockClear();
	dispatchPointerEvent(coastingSpinner.spinner, "pointerdown", 300, 150, 150);
	dispatchPointerEvent(coastingSpinner.spinner, "pointermove", 150, 0, 170);
	dispatchPointerEvent(coastingSpinner.spinner, "pointerup", 150, 0, 180);

	const counteredSpeed = mockSpinnerAudio.start.mock.calls[0][0] as number;

	expect(counteredSpeed).toBeLessThan(coastingSpinner.startSpeed);
	expect(counteredSpeed).toBeLessThan(0);

	restoreBrowserMocks();
});

test("loads saved best speed quietly on mount", async () => {
	mockStore.get.mockResolvedValue(1800);

	renderSpinnerFidget();

	expect(screen.getByTestId("spinner-current-speed").textContent).toBe("0");
	await waitFor(() =>
		expect(screen.getByTestId("spinner-best-speed").textContent).toBe("300"),
	);
	expect(getBestSpeedValue().classList.contains("is-best-updated")).toBe(false);
	expect(mockVibrate).not.toHaveBeenCalledWith([4, 22, 8]);
});

test("resets motion when inertial animation stops", () => {
	const restoreBrowserMocks = mockBrowserPointerSupport();
	const animationSteps: FrameRequestCallback[] = [];

	window.requestAnimationFrame = (callback) => {
		animationSteps.push(callback);
		return animationSteps.length;
	};

	renderSpinnerFidget();

	const spinner = screen.getByRole("button", {
		name: "Flick the spinner",
	}) as PointerCaptureElement;
	const rotor = spinner.querySelector(".spinner-rotor") as HTMLElement;

	mockSpinnerBounds(spinner);

	dispatchPointerEvent(spinner, "pointerdown", 150, 0, 10);
	dispatchPointerEvent(spinner, "pointermove", 300, 150, 30);
	dispatchPointerEvent(spinner, "pointerup", 300, 150, 40);

	expect(mockCanvasContextMethods.fill).toHaveBeenCalled();

	let timestamp = 1200;

	for (let stepIndex = 0; stepIndex < 1000; stepIndex += 1) {
		const step = animationSteps.shift();

		if (!step) {
			break;
		}

		step(timestamp);
		timestamp += 100;

		if (screen.getByTestId("spinner-current-speed").textContent === "0") {
			break;
		}
	}

	expect(mockCanvasContextMethods.clearRect).toHaveBeenCalled();
	expect(rotor.style.getPropertyValue("--spinner-lobe-clarity")).toBe("1");
	expect(screen.getByTestId("spinner-current-speed").textContent).toBe("0");
	expect(screen.getByTestId("spinner-best-speed").textContent).toBe("560");
	expect(
		Number(window.localStorage.getItem("nudge.spinner.bestSpeed.spinner-1")),
	).toBeCloseTo(3360.72);

	restoreBrowserMocks();
});

test("disposes spinner audio on unmount", () => {
	const { unmount } = renderSpinnerFidget();

	unmount();

	expect(mockSpinnerAudio.dispose).toHaveBeenCalledTimes(1);
});

function mockBrowserPointerSupport() {
	const originalRequestAnimationFrame = window.requestAnimationFrame;
	const originalCancelAnimationFrame = window.cancelAnimationFrame;
	const originalSetPointerCapture = HTMLElement.prototype.setPointerCapture;
	const originalReleasePointerCapture =
		HTMLElement.prototype.releasePointerCapture;
	const originalHasPointerCapture = HTMLElement.prototype.hasPointerCapture;
	const originalGetContext = HTMLCanvasElement.prototype.getContext;
	window.cancelAnimationFrame = () => undefined;
	HTMLElement.prototype.setPointerCapture = () => undefined;
	HTMLElement.prototype.releasePointerCapture = () => undefined;
	HTMLElement.prototype.hasPointerCapture = () => true;
	HTMLCanvasElement.prototype.getContext = jest.fn(
		() => mockCanvasContext,
	) as unknown as typeof HTMLCanvasElement.prototype.getContext;

	return () => {
		window.requestAnimationFrame = originalRequestAnimationFrame;
		window.cancelAnimationFrame = originalCancelAnimationFrame;
		HTMLElement.prototype.setPointerCapture = originalSetPointerCapture;
		HTMLElement.prototype.releasePointerCapture = originalReleasePointerCapture;
		HTMLElement.prototype.hasPointerCapture = originalHasPointerCapture;
		HTMLCanvasElement.prototype.getContext = originalGetContext;
	};
}

function clearCanvasMocks() {
	mockCanvasContextMethods.arc.mockClear();
	mockCanvasContextMethods.beginPath.mockClear();
	mockCanvasContextMethods.clearRect.mockClear();
	mockCanvasContextMethods.fill.mockClear();
	mockCanvasContextMethods.lineTo.mockClear();
	mockCanvasContextMethods.moveTo.mockClear();
	mockCanvasContextMethods.restore.mockClear();
	mockCanvasContextMethods.save.mockClear();
	mockCanvasContextMethods.setTransform.mockClear();
	mockCanvasContextMethods.stroke.mockClear();
}

function renderSpinnerFidget(
	props: Partial<ComponentProps<typeof SpinnerFidget>> = {},
) {
	return render(
		<SpinnerFidget
			onBack={() => undefined}
			variantId={SpinnerVariantId.Spinner1}
			{...props}
		/>,
	);
}

function mockSpinnerBounds(spinner: PointerCaptureElement) {
	spinner.getBoundingClientRect = () =>
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

function startCoastingSpinner() {
	const animationSteps: FrameRequestCallback[] = [];

	window.requestAnimationFrame = (callback) => {
		animationSteps.push(callback);
		return animationSteps.length;
	};

	renderSpinnerFidget();

	const spinner = screen.getByRole("button", {
		name: "Flick the spinner",
	}) as PointerCaptureElement;
	const rotor = spinner.querySelector(".spinner-rotor") as HTMLElement;

	mockSpinnerBounds(spinner);
	dispatchPointerEvent(spinner, "pointerdown", 150, 0, 10);
	dispatchPointerEvent(spinner, "pointermove", 300, 150, 30);

	const dragStep = animationSteps.shift();

	dragStep?.(36);
	dispatchPointerEvent(spinner, "pointerup", 300, 150, 40);

	const startSpeed = mockSpinnerAudio.start.mock.calls[0][0] as number;
	const coastStep = animationSteps.shift();

	coastStep?.(140);

	return {
		animationSteps,
		rotor,
		spinner,
		startSpeed,
	};
}

function dispatchPointerEvent(
	element: HTMLElement,
	type: string,
	clientX: number,
	clientY: number,
	timestamp: number,
) {
	const event = new Event(type, { bubbles: true, cancelable: true });

	Object.defineProperties(event, {
		clientX: { value: clientX },
		clientY: { value: clientY },
		pointerId: { value: 1 },
		timeStamp: { value: timestamp },
	});

	fireEvent(element, event);
}

function getRotorAngle(rotor: HTMLElement) {
	const match = rotor.style.transform.match(/rotate\(([-\d.]+)deg\)/);

	return match ? Number(match[1]) : 0;
}

function getBestSpeedValue() {
	return screen
		.getByTestId("spinner-best-speed")
		.querySelector(".spinner-fidget-stat-value") as HTMLElement;
}

function getShellTitleText() {
	return document.querySelector(".fidget-shell-title")?.textContent;
}
