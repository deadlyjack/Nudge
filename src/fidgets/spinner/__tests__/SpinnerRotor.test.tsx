import { render } from "@testing-library/react";

import SpinnerRotor from "../SpinnerRotor";
import { SpinnerVariantId } from "../spinnerTypes";
import { getSpinnerVariant } from "../spinnerVariants";

test("renders selected purchased spinner asset as a mask", () => {
	const variant = getSpinnerVariant(SpinnerVariantId.Spinner8);
	const { container } = render(
		<SpinnerRotor color={variant.color} variant={variant} />,
	);
	const rotor = container.querySelector(".spinner-rotor") as HTMLElement;
	const art = rotor.querySelector(".spinner-rotor-art") as HTMLElement;

	expect(rotor.dataset.spinnerAsset).toBe(`${variant.visual.assetIndex}`);
	expect(rotor.style.getPropertyValue("--spinner-asset")).toContain(
		variant.visual.assetSrc,
	);
	expect(rotor.style.getPropertyValue("--spinner-origin-x")).toBe(
		`${variant.visual.originOffset.x * 100}%`,
	);
	expect(rotor.style.getPropertyValue("--spinner-origin-y")).toBe(
		`${variant.visual.originOffset.y * 100}%`,
	);
	expect(art).toBeTruthy();
});

test("uses fixed collection color variables without changing selected asset", () => {
	const variant = getSpinnerVariant(SpinnerVariantId.Spinner2);
	const { container, rerender } = render(
		<SpinnerRotor color={variant.color} variant={variant} />,
	);
	const rotor = container.querySelector(".spinner-rotor") as HTMLElement;

	rerender(<SpinnerRotor color={variant.color} variant={variant} />);

	expect(rotor.style.getPropertyValue("--spinner-accent")).toBe(
		variant.color.accent,
	);
	expect(rotor.style.getPropertyValue("--spinner-light")).toBe(
		variant.color.light,
	);
	expect(rotor.style.getPropertyValue("--spinner-deep")).toBe(
		variant.color.deep,
	);
	expect(rotor.dataset.spinnerAsset).toBe(`${variant.visual.assetIndex}`);
	expect(rotor.style.getPropertyValue("--spinner-asset")).toContain(
		variant.visual.assetSrc,
	);
});

test("marks preview rotors for selector animation", () => {
	const variant = getSpinnerVariant(SpinnerVariantId.Spinner1);
	const { container } = render(
		<SpinnerRotor color={variant.color} preview variant={variant} />,
	);
	const rotor = container.querySelector(".spinner-rotor") as HTMLElement;

	expect(rotor.dataset.spinnerPreview).toBe("true");
});
