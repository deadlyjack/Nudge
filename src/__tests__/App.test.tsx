import { render, screen } from "@testing-library/react";
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

test.each(
	directNonVariantFidgetNames,
)("opens %s and returns home", async (name) => {
	render(<App />);

	await userEvent.click(screen.getByRole("button", { name: `Open ${name}` }));

	expect(screen.getByRole("heading", { name })).toBeTruthy();

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

	expect(
		screen.getByRole("heading", { name: "Brushed Aluminum" }),
	).toBeTruthy();
	expect(screen.getByRole("button", { name: "Choose knob" })).toBeTruthy();

	await userEvent.click(screen.getByRole("button", { name: "Choose knob" }));

	expect(screen.getByRole("heading", { name: "Knob" })).toBeTruthy();
	expect(
		screen.getByRole("button", { name: "Open Polished Metal" }),
	).toBeTruthy();
	expect(screen.getAllByRole("button", { name: /^Open / })).toHaveLength(12);

	await userEvent.click(
		screen.getByRole("button", { name: "Open Polished Metal" }),
	);

	expect(screen.getByRole("heading", { name: "Polished Metal" })).toBeTruthy();
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

	expect(screen.getByRole("heading", { name: "Carbon Fiber" })).toBeTruthy();
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

	expect(screen.getByRole("heading", { name: "Classic Tri" })).toBeTruthy();
	expect(screen.getByRole("button", { name: "Choose spinner" })).toBeTruthy();

	await userEvent.click(screen.getByRole("button", { name: "Choose spinner" }));

	expect(screen.getByRole("heading", { name: "Spinner" })).toBeTruthy();
	expect(screen.getByRole("button", { name: "Open Curved Bar" })).toBeTruthy();

	await userEvent.click(screen.getByRole("button", { name: "Open Ring Tri" }));

	expect(screen.getByRole("heading", { name: "Ring Tri" })).toBeTruthy();
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

	expect(screen.getByRole("heading", { name: "Classic Tri" })).toBeTruthy();
});

test("restores the selected spinner after app restart", async () => {
	window.localStorage.setItem("nudge.spinner.selectedVariant", "spinner-15");

	render(<App />);

	await userEvent.click(screen.getByRole("button", { name: "Open Spinner" }));

	expect(screen.getByRole("heading", { name: "Ring Tri" })).toBeTruthy();
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
