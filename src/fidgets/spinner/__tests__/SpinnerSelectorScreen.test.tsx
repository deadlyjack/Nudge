import { fireEvent, render, screen } from "@testing-library/react";

import SpinnerSelectorScreen from "../SpinnerSelectorScreen";
import { SpinnerVariantId } from "../spinnerTypes";

test("renders fifteen static spinner choices", () => {
	render(
		<SpinnerSelectorScreen
			onBack={() => undefined}
			onSelect={() => undefined}
		/>,
	);

	expect(screen.getByRole("heading", { name: "Spinner" })).toBeTruthy();
	expect(screen.getByRole("button", { name: "Open Curved Bar" })).toBeTruthy();
	expect(screen.getByRole("button", { name: "Open Ring Tri" })).toBeTruthy();
	expect(screen.queryByText("Open")).toBeNull();
	expect(screen.queryByText("Weight")).toBeNull();
	expect(screen.queryByText("Friction")).toBeNull();
	expect(screen.queryByText("Inertia")).toBeNull();
	expect(screen.queryByRole("button", { name: /Preview/ })).toBeNull();
	expect(document.querySelectorAll(".spinner-rotor")).toHaveLength(15);
	expect(screen.queryByRole("button", { name: /color/i })).toBeNull();
});

test("opens the tapped spinner", () => {
	const onSelect = jest.fn();

	render(
		<SpinnerSelectorScreen onBack={() => undefined} onSelect={onSelect} />,
	);

	fireEvent.click(screen.getByRole("button", { name: "Open Triple Bar" }));

	expect(onSelect).toHaveBeenCalledWith({
		variantId: SpinnerVariantId.Spinner2,
	});
});

test("renders only preview buttons inside cards", () => {
	render(
		<SpinnerSelectorScreen
			onBack={() => undefined}
			onSelect={() => undefined}
		/>,
	);

	const choice = screen.getByRole("button", {
		name: "Open Triple Bar",
	});

	expect(choice.querySelector(".spinner-selector-swatch")).toBeNull();
	expect(choice.textContent).toBe("");
});

test("does not drag selector previews", () => {
	render(
		<SpinnerSelectorScreen
			onBack={() => undefined}
			onSelect={() => undefined}
		/>,
	);

	const choice = screen.getByRole("button", {
		name: "Open Slim Bar",
	});
	const rotor = choice.querySelector(".spinner-rotor") as HTMLElement;
	const initialTransform = rotor.style.transform;

	dispatchPointerEvent(choice, "pointerdown", 20, 10, 1);
	dispatchPointerEvent(choice, "pointermove", 90, 10, 2);

	expect(rotor.style.transform).toBe(initialTransform);
});

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
