import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import App from "../App";

jest.mock("lib/store", () => ({
	__esModule: true,
	default: {
		get: jest.fn().mockResolvedValue(null),
		remove: jest.fn().mockResolvedValue(undefined),
		set: jest.fn().mockResolvedValue(undefined),
	},
}));

const fidgetNames = [
	"Toggle Switch",
	"Spinner",
	"Knob / Dial",
	"Bubble Pop",
	"Pattern Tap",
	"Counter",
];
const fidgetHints = [
	"Tap. Click. Let it settle.",
	"Drag and flick the edge.",
	"Drag around the circle.",
	"Pop a few. Watch them return.",
	"Make a pattern. Let it fade.",
	"Tap out a steady count.",
];
const directNonVariantFidgetNames = fidgetNames.filter(
	(name) => name !== "Spinner" && name !== "Knob / Dial",
);
const HERO_TEST_DURATION_MS = 260;

beforeEach(() => {
	window.localStorage.clear();
});

test("renders the Nudge home screen", () => {
	render(<App />);

	expect(screen.queryByRole("heading", { name: "Nudge" })).toBeNull();

	for (const name of fidgetNames) {
		expect(screen.getByRole("button", { name: `Open ${name}` })).toBeTruthy();
		expect(screen.queryByText(name)).toBeNull();
	}
});

test("restores spinner and knob positions in the home previews", () => {
	window.localStorage.setItem("nudge.spinner.angle.spinner-12", "135");
	window.localStorage.setItem("nudge.knob.angle.knob-brushed-aluminum", "72");

	render(<App />);

	const spinnerCard = screen.getByRole("button", { name: "Open Spinner" });
	const spinnerRotor = spinnerCard.querySelector(
		".spinner-rotor",
	) as HTMLElement;
	const knobCard = screen.getByRole("button", { name: "Open Knob / Dial" });
	const knobMarkerRotor = knobCard.querySelector(
		".knob-fidget-marker-rotor",
	) as HTMLElement;

	expect(spinnerRotor.style.transform).toBe("translateZ(0) rotate(135deg)");
	expect(knobMarkerRotor.style.transform).toBe("translateZ(0) rotate(72deg)");
});

test("restores the last opened fidget after app restart", () => {
	window.localStorage.setItem("nudge.app.activeFidget", "spinner");

	render(<App />);

	expectShellTitleToBeAccessibleOnly("Classic Tri");
	expect(screen.getByRole("button", { name: "Choose spinner" })).toBeTruthy();
	expect(screen.queryByRole("button", { name: "Open Spinner" })).toBeNull();
});

test("animates the spinner visual from home to the fidget", async () => {
	const animationFrames = mockAnimationFrames();
	const restoreHeroBounds = mockHeroBounds();

	window.localStorage.setItem("nudge.spinner.angle.spinner-12", "135");

	render(<App />);

	await userEvent.click(screen.getByRole("button", { name: "Open Spinner" }));

	const overlay = screen.getByTestId("hero-transition-spinner");
	const overlayRotor = overlay.querySelector(".spinner-rotor") as HTMLElement;

	expect(overlay.dataset.heroState).toBe("measuring");
	expect(getPageStack().className).toContain("is-hero-owned");
	expect(getPageStack().dataset.heroPhase).toBe("measuring");

	expect(overlay.style.transform).toBe("translate3d(20px, 30px, 0)");
	expect(overlay.style.width).toBe("80px");
	expect(overlayRotor.style.transform).toBe("translateZ(0) rotate(135deg)");
	expect(
		screen
			.getByRole("button", { name: "Flick the spinner" })
			.querySelector(".spinner-rotor")
			?.getAttribute("data-fidget-hero-hidden"),
	).toBe("true");

	act(() => animationFrames.flushNext());

	expect(overlay.dataset.heroState).toBe("animating");
	expect(overlay.style.transform).toBe("translate3d(48px, 64px, 0)");
	expect(overlay.style.width).toBe("300px");
	expect(getPageStack().className).toContain("is-hero-owned");
	expect(getPageStack().dataset.heroPhase).toBe("animating");
	expect(
		document.querySelector(".nudge-page-transition.is-exiting"),
	).toBeNull();

	await act(async () => {
		await wait(HERO_TEST_DURATION_MS + 20);
	});
	act(() => animationFrames.flushNext());

	expect(screen.queryByTestId("hero-transition-spinner")).toBeNull();
	expect(getPageStack().className).not.toContain("is-hero-owned");
	expect(getPageStack().dataset.heroPhase).toBeUndefined();

	animationFrames.restore();
	restoreHeroBounds();
});

test("animates the spinner visual from fidget back to home", async () => {
	const animationFrames = mockAnimationFrames();
	const restoreHeroBounds = mockHeroBounds();

	window.localStorage.setItem("nudge.app.activeFidget", "spinner");

	render(<App />);

	await userEvent.click(
		screen.getByRole("button", { name: "Back to fidgets" }),
	);

	const overlay = screen.getByTestId("hero-transition-spinner");

	expect(overlay.dataset.heroState).toBe("measuring");
	expect(getPageStack().className).toContain("is-hero-owned");
	expect(getPageStack().dataset.heroPhase).toBe("measuring");
	expect(overlay.style.transform).toBe("translate3d(48px, 64px, 0)");
	expect(overlay.style.width).toBe("300px");

	act(() => animationFrames.flushNext());

	expect(overlay.dataset.heroState).toBe("animating");
	expect(overlay.style.transform).toBe("translate3d(20px, 30px, 0)");
	expect(overlay.style.width).toBe("80px");
	expect(getPageStack().className).toContain("is-hero-owned");
	expect(
		document.querySelector(".nudge-page-transition.is-exiting"),
	).toBeNull();

	animationFrames.restore();
	restoreHeroBounds();
});

test("renders knob hero overlays from the artwork rect", async () => {
	const animationFrames = mockAnimationFrames();
	const restoreHeroBounds = mockHeroBounds();

	render(<App />);

	await userEvent.click(
		screen.getByRole("button", { name: "Open Knob / Dial" }),
	);

	const overlay = screen.getByTestId("hero-transition-knob");

	expect(overlay.style.transform).toBe("translate3d(34px, 44px, 0)");
	expect(overlay.style.width).toBe("90px");
	expect(
		screen
			.getByRole("button", { name: "Turn the fidget dial" })
			.getAttribute("data-fidget-hero-hidden"),
	).toBe("true");

	act(() => animationFrames.flushNext());

	expect(overlay.dataset.heroState).toBe("animating");
	expect(overlay.style.transform).toBe("translate3d(52px, 70px, 0)");
	expect(overlay.style.width).toBe("320px");

	animationFrames.restore();
	restoreHeroBounds();
});

test("keeps a coasting spinner rotating on the home preview", async () => {
	const animationFrames = mockAnimationFrames();
	const restoreHeroBounds = mockHeroBounds();
	const restorePointerSupport = mockPointerSupport();

	render(<App />);

	await userEvent.click(screen.getByRole("button", { name: "Open Spinner" }));

	act(() => animationFrames.flushNext(16));
	act(() => animationFrames.flushNext(32));

	const spinner = screen.getByRole("button", {
		name: "Flick the spinner",
	});

	dispatchPointerEvent(spinner, "pointerdown", 198, 64, 40);
	dispatchPointerEvent(spinner, "pointermove", 348, 214, 60);
	act(() => animationFrames.flushNext(76));
	dispatchPointerEvent(spinner, "pointerup", 348, 214, 80);

	await userEvent.click(
		screen.getByRole("button", { name: "Back to fidgets" }),
	);

	const homeSpinner = screen.getByRole("button", { name: "Open Spinner" });
	const homeRotor = homeSpinner.querySelector(".spinner-rotor") as HTMLElement;
	const angleBeforeHomeCoast = getRotorAngle(homeRotor);

	act(() => animationFrames.flushNext(100));
	act(() => animationFrames.flushNext(116));
	act(() => animationFrames.flushNext(216));
	act(() => animationFrames.flushNext(316));

	expect(getRotorAngle(homeRotor)).not.toBeCloseTo(angleBeforeHomeCoast, 3);

	animationFrames.restore();
	restoreHeroBounds();
	restorePointerSupport();
});

test.each(
	directNonVariantFidgetNames,
)("opens %s and returns home", async (name) => {
	render(<App />);

	await userEvent.click(screen.getByRole("button", { name: `Open ${name}` }));

	expectShellTitleToBeAccessibleOnly(name);

	for (const hint of fidgetHints) {
		expect(screen.queryByText(hint)).toBeNull();
	}

	await userEvent.click(
		screen.getByRole("button", { name: "Back to fidgets" }),
	);

	expect(screen.getByRole("button", { name: `Open ${name}` })).toBeTruthy();
});

test("opens the default knob and selects a premium knob from the titlebar", async () => {
	render(<App />);

	await userEvent.click(
		screen.getByRole("button", { name: "Open Knob / Dial" }),
	);

	expect(window.localStorage.getItem("nudge.app.activeFidget")).toBe("knob");
	expectShellTitleToBeAccessibleOnly("Brushed Aluminum");
	expect(screen.getByRole("button", { name: "Choose knob" })).toBeTruthy();

	await userEvent.click(screen.getByRole("button", { name: "Choose knob" }));

	expectShellTitleToBeAccessibleOnly("Knob");
	expect(
		screen.getByRole("button", { name: "Open Polished Metal" }),
	).toBeTruthy();
	expect(screen.getAllByRole("button", { name: /^Open / })).toHaveLength(12);

	await userEvent.click(
		screen.getByRole("button", { name: "Open Polished Metal" }),
	);

	expectShellTitleToBeAccessibleOnly("Polished Metal");
	expect(window.localStorage.getItem("nudge.knob.selectedVariant")).toBe(
		"knob-polished-metal",
	);

	await userEvent.click(
		screen.getByRole("button", { name: "Back to fidgets" }),
	);

	const knobCard = screen.getByRole("button", { name: "Open Knob / Dial" });
	const knobPreview = knobCard.querySelector(
		".knob-fidget-dial",
	) as HTMLElement;

	expect(knobCard).toBeTruthy();
	expect(knobPreview.dataset.knobVariant).toBe("knob-polished-metal");
});

test("persists Carbon Fiber knob selection to the home preview", async () => {
	render(<App />);

	await userEvent.click(
		screen.getByRole("button", { name: "Open Knob / Dial" }),
	);
	await userEvent.click(screen.getByRole("button", { name: "Choose knob" }));
	await userEvent.click(
		screen.getByRole("button", { name: "Open Carbon Fiber" }),
	);

	expectShellTitleToBeAccessibleOnly("Carbon Fiber");
	expect(window.localStorage.getItem("nudge.knob.selectedVariant")).toBe(
		"knob-carbon-fiber",
	);

	await userEvent.click(
		screen.getByRole("button", { name: "Back to fidgets" }),
	);

	const knobCard = screen.getByRole("button", { name: "Open Knob / Dial" });
	const knobPreview = knobCard.querySelector(
		".knob-fidget-dial",
	) as HTMLElement;

	expect(knobPreview.dataset.knobVariant).toBe("knob-carbon-fiber");
	expect(knobPreview.dataset.knobMaterial).toBe("carbon-composite");
});

test("opens spinner 12 by default and selects another spinner from the titlebar", async () => {
	render(<App />);

	await userEvent.click(screen.getByRole("button", { name: "Open Spinner" }));

	expect(window.localStorage.getItem("nudge.app.activeFidget")).toBe("spinner");
	expectShellTitleToBeAccessibleOnly("Classic Tri");
	expect(screen.getByRole("button", { name: "Choose spinner" })).toBeTruthy();

	await userEvent.click(screen.getByRole("button", { name: "Choose spinner" }));

	expectShellTitleToBeAccessibleOnly("Spinner");
	expect(screen.getByRole("button", { name: "Open Curved Bar" })).toBeTruthy();

	await userEvent.click(screen.getByRole("button", { name: "Open Ring Tri" }));

	expectShellTitleToBeAccessibleOnly("Ring Tri");
	expect(window.localStorage.getItem("nudge.spinner.selectedVariant")).toBe(
		"spinner-15",
	);

	await userEvent.click(
		screen.getByRole("button", { name: "Back to fidgets" }),
	);

	expect(screen.getByRole("button", { name: "Open Spinner" })).toBeTruthy();
});

test("returns from the spinner selector to the active spinner", async () => {
	render(<App />);

	await userEvent.click(screen.getByRole("button", { name: "Open Spinner" }));
	await userEvent.click(screen.getByRole("button", { name: "Choose spinner" }));

	await userEvent.click(
		screen.getByRole("button", { name: "Back to fidgets" }),
	);

	expectShellTitleToBeAccessibleOnly("Classic Tri");
});

test("restores the selected spinner after app restart", async () => {
	window.localStorage.setItem("nudge.spinner.selectedVariant", "spinner-15");

	render(<App />);

	await userEvent.click(screen.getByRole("button", { name: "Open Spinner" }));

	expectShellTitleToBeAccessibleOnly("Ring Tri");
});

test("counts taps and resets the counter", async () => {
	render(<App />);

	await userEvent.click(screen.getByRole("button", { name: "Open Counter" }));

	const counterButton = screen.getByRole("button", {
		name: "Tap counter",
	});

	await userEvent.click(counterButton);
	await userEvent.click(counterButton);

	expect(
		screen.getByRole("button", { name: "Count 2. Tap to add one" }),
	).toBeTruthy();

	await userEvent.click(
		screen.getByRole("button", { name: "Decrease counter" }),
	);

	expect(
		screen.getByRole("button", { name: "Count 1. Tap to add one" }),
	).toBeTruthy();

	await userEvent.click(screen.getByRole("button", { name: "Reset counter" }));

	expect(
		screen.getByRole("button", { name: "Count 0. Tap to add one" }),
	).toBeTruthy();
});

function expectShellTitleToBeAccessibleOnly(name: string) {
	const heading = screen.getByRole("heading", { name });

	expect(heading.textContent).toBe("");
}

function getPageStack() {
	return document.querySelector(".nudge-page-stack") as HTMLElement;
}

function mockAnimationFrames() {
	const originalRequestAnimationFrame = window.requestAnimationFrame;
	const originalCancelAnimationFrame = window.cancelAnimationFrame;
	const callbacks = new Map<number, FrameRequestCallback>();
	let nextFrameId = 1;

	window.requestAnimationFrame = (callback) => {
		const frameId = nextFrameId;

		nextFrameId += 1;
		callbacks.set(frameId, callback);

		return frameId;
	};
	window.cancelAnimationFrame = (frameId) => {
		callbacks.delete(frameId);
	};

	return {
		flushNext(timestamp = 16) {
			const entry = callbacks.entries().next().value as
				| [number, FrameRequestCallback]
				| undefined;

			if (!entry) {
				return;
			}

			const [frameId, callback] = entry;

			callbacks.delete(frameId);
			callback(timestamp);
		},
		restore() {
			window.requestAnimationFrame = originalRequestAnimationFrame;
			window.cancelAnimationFrame = originalCancelAnimationFrame;
		},
	};
}

function mockHeroBounds() {
	const originalGetBoundingClientRect =
		HTMLElement.prototype.getBoundingClientRect;

	HTMLElement.prototype.getBoundingClientRect =
		function getBoundingClientRect() {
			if (this.getAttribute("data-fidget-hero") === "spinner") {
				return this.getAttribute("data-spinner-preview") === "true"
					? createRect(20, 30, 80, 80)
					: createRect(48, 64, 300, 300);
			}

			if (this.getAttribute("data-fidget-hero") === "knob") {
				return this.closest(".knob-fidget.is-icon")
					? createRect(34, 44, 90, 90)
					: createRect(52, 70, 320, 320);
			}

			return originalGetBoundingClientRect.call(this);
		};

	return () => {
		HTMLElement.prototype.getBoundingClientRect = originalGetBoundingClientRect;
	};
}

function mockPointerSupport() {
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

function createRect(left: number, top: number, width: number, height: number) {
	return {
		bottom: top + height,
		height,
		left,
		right: left + width,
		toJSON: () => ({}),
		top,
		width,
		x: left,
		y: top,
	} as DOMRect;
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

	element.dispatchEvent(event);
}

function getRotorAngle(rotor: HTMLElement) {
	const match = rotor.style.transform.match(/rotate\(([-\d.]+)deg\)/);

	return match ? Number(match[1]) : 0;
}

function wait(duration: number) {
	return new Promise((resolve) => window.setTimeout(resolve, duration));
}
