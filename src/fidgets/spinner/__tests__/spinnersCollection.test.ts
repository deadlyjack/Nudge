import { spinnersCollection } from "../spinnersCollection";
import { SpinnerVariantId } from "../spinnerTypes";

const allowedTypes = new Set(["basic", "metal", "premium"]);

test("defines one collection item for every purchased spinner", () => {
	const ids = spinnersCollection.map((spinner) => spinner.id);
	const uniqueIds = new Set(ids);

	expect(spinnersCollection).toHaveLength(15);
	expect(uniqueIds.size).toBe(15);
	expect(ids).toEqual([
		SpinnerVariantId.Spinner1,
		SpinnerVariantId.Spinner2,
		SpinnerVariantId.Spinner3,
		SpinnerVariantId.Spinner4,
		SpinnerVariantId.Spinner5,
		SpinnerVariantId.Spinner6,
		SpinnerVariantId.Spinner7,
		SpinnerVariantId.Spinner8,
		SpinnerVariantId.Spinner9,
		SpinnerVariantId.Spinner10,
		SpinnerVariantId.Spinner11,
		SpinnerVariantId.Spinner12,
		SpinnerVariantId.Spinner13,
		SpinnerVariantId.Spinner14,
		SpinnerVariantId.Spinner15,
	]);
});

test("includes spinner identity, physics, type, and fixed gradient color", () => {
	for (const spinner of spinnersCollection) {
		expect(spinner.name).not.toMatch(/^Spinner \d+$/);
		expect(spinner.name.length).toBeGreaterThan(0);
		expect(allowedTypes.has(spinner.type)).toBe(true);
		expect(spinner.weight).toBeGreaterThan(0);
		expect(spinner.friction).toBeGreaterThan(0);
		expect(Number.isFinite(spinner.originOffset.x)).toBe(true);
		expect(Number.isFinite(spinner.originOffset.y)).toBe(true);
		expect(spinner.color).toContain("linear-gradient");
		expect(spinner.color).toContain(spinner.colorProfile.accent);
		expect(spinner.colorProfile.trailRgb).toMatch(/^\d+, \d+, \d+$/);
	}
});

test("uses shape-based names for purchased spinner assets", () => {
	expect(
		spinnersCollection.map((spinner) => [spinner.id, spinner.name]),
	).toEqual([
		[SpinnerVariantId.Spinner1, "Curved Bar"],
		[SpinnerVariantId.Spinner2, "Triple Bar"],
		[SpinnerVariantId.Spinner3, "Dollar Spinner"],
		[SpinnerVariantId.Spinner4, "Shuriken Star"],
		[SpinnerVariantId.Spinner5, "Star Tri"],
		[SpinnerVariantId.Spinner6, "Oval Bar"],
		[SpinnerVariantId.Spinner7, "Claw Tri"],
		[SpinnerVariantId.Spinner8, "Slim Bar"],
		[SpinnerVariantId.Spinner9, "Bat Wing"],
		[SpinnerVariantId.Spinner10, "Blade Tri"],
		[SpinnerVariantId.Spinner11, "Rocket Tri"],
		[SpinnerVariantId.Spinner12, "Classic Tri"],
		[SpinnerVariantId.Spinner13, "Outline Tri"],
		[SpinnerVariantId.Spinner14, "Solid Tri"],
		[SpinnerVariantId.Spinner15, "Ring Tri"],
	]);
});

test("keeps computed visual origin offsets for asymmetric assets", () => {
	const spinner9 = spinnersCollection.find(
		(spinner) => spinner.id === SpinnerVariantId.Spinner9,
	);

	expect(spinner9?.originOffset.x).toBeCloseTo(-0.0979);
	expect(spinner9?.originOffset.y).toBeCloseTo(0.0304);
});

test("uses the visual type grouping chosen for the purchased silhouettes", () => {
	expect(getIdsByType("basic")).toEqual([
		SpinnerVariantId.Spinner3,
		SpinnerVariantId.Spinner5,
		SpinnerVariantId.Spinner7,
		SpinnerVariantId.Spinner9,
		SpinnerVariantId.Spinner11,
		SpinnerVariantId.Spinner12,
	]);
	expect(getIdsByType("metal")).toEqual([
		SpinnerVariantId.Spinner1,
		SpinnerVariantId.Spinner2,
		SpinnerVariantId.Spinner4,
		SpinnerVariantId.Spinner6,
		SpinnerVariantId.Spinner8,
		SpinnerVariantId.Spinner10,
	]);
	expect(getIdsByType("premium")).toEqual([
		SpinnerVariantId.Spinner13,
		SpinnerVariantId.Spinner14,
		SpinnerVariantId.Spinner15,
	]);
});

function getIdsByType(type: "basic" | "metal" | "premium") {
	return spinnersCollection
		.filter((spinner) => spinner.type === type)
		.map((spinner) => spinner.id);
}
