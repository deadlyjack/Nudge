import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import store from "lib/store";
import type { ComponentProps } from "react";
import createSpinnerAudio from "../audio/createSpinnerAudio";
import SpinnerFidget from "../SpinnerFidget";
import { SpinnerVariantId } from "../spinnerTypes";

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

jest.mock("lib/store", () => ({
	__esModule: true,
	default: {
		get: jest.fn(),
		remove: jest.fn(),
		set: jest.fn(),
	},
}));

const mockStore = store as jest.Mocked<typeof store>;

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
	expect(rotor.style.getPropertyValue("--spinner-lobe-clarity")).toBe("1");

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

test("loads saved best speed quietly on mount", async () => {
	mockStore.get.mockResolvedValue(1800);

	renderSpinnerFidget();

	expect(screen.getByTestId("spinner-current-speed").textContent).toBe("0");
	await waitFor(() =>
		expect(screen.getByTestId("spinner-best-speed").textContent).toBe("300"),
	);
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

	for (let stepIndex = 0; stepIndex < 420; stepIndex += 1) {
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
