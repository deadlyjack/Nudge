import store from "lib/store";
import {
	formatSpinnerSpeed,
	getSpinnerSpeedScore,
	readBestSpinnerSpeed,
	readInitialSpinnerVariantId,
	readSelectedSpinnerVariantId,
	writeBestSpinnerSpeed,
	writeSelectedSpinnerVariantId,
} from "../spinnerStats";
import { SpinnerVariantId } from "../spinnerTypes";

jest.mock("lib/store", () => ({
	__esModule: true,
	default: {
		get: jest.fn(),
		remove: jest.fn(),
		set: jest.fn(),
	},
}));

const mockStore = store as jest.Mocked<typeof store>;

beforeEach(() => {
	jest.clearAllMocks();
	mockStore.get.mockResolvedValue(null);
	mockStore.set.mockResolvedValue(undefined);
	window.localStorage.clear();
});

test("formats angular velocity as rpm", () => {
	expect(getSpinnerSpeedScore(4200)).toBe(700);
	expect(getSpinnerSpeedScore(-1800)).toBe(300);
	expect(formatSpinnerSpeed(1200)).toBe("200");
});

test("stores and reads the best spinner speed persistently", async () => {
	await writeBestSpinnerSpeed(1800);

	expect(mockStore.set).toHaveBeenCalledWith(
		"nudge.spinner.bestSpeed.spinner-1",
		1800,
	);
	expect(window.localStorage.getItem("nudge.spinner.bestSpeed.spinner-1")).toBe(
		"1800",
	);

	mockStore.get.mockResolvedValue(1800);

	await expect(readBestSpinnerSpeed()).resolves.toBe(1800);
});

test("stores best speed separately by spinner type", async () => {
	await writeBestSpinnerSpeed(2400, SpinnerVariantId.Spinner15);

	expect(mockStore.set).toHaveBeenCalledWith(
		"nudge.spinner.bestSpeed.spinner-15",
		2400,
	);
	expect(
		window.localStorage.getItem("nudge.spinner.bestSpeed.spinner-15"),
	).toBe("2400");
});

test("migrates existing local best speed into persistent store", async () => {
	window.localStorage.setItem("nudge.spinner.bestSpeed", "2400");

	await expect(readBestSpinnerSpeed()).resolves.toBe(2400);
	expect(mockStore.set).toHaveBeenCalledWith(
		"nudge.spinner.bestSpeed.spinner-1",
		2400,
	);
});

test("ignores missing or invalid best speed values", async () => {
	window.localStorage.setItem("nudge.spinner.bestSpeed", "not-fast");

	await expect(readBestSpinnerSpeed()).resolves.toBe(0);
});

test("stores and reads the selected spinner variant persistently", async () => {
	await writeSelectedSpinnerVariantId(SpinnerVariantId.Spinner15);

	expect(mockStore.set).toHaveBeenCalledWith(
		"nudge.spinner.selectedVariant",
		SpinnerVariantId.Spinner15,
	);
	expect(window.localStorage.getItem("nudge.spinner.selectedVariant")).toBe(
		SpinnerVariantId.Spinner15,
	);

	mockStore.get.mockResolvedValue(SpinnerVariantId.Spinner15);

	await expect(readSelectedSpinnerVariantId()).resolves.toBe(
		SpinnerVariantId.Spinner15,
	);
});

test("reads the initial spinner variant from local storage", () => {
	window.localStorage.setItem(
		"nudge.spinner.selectedVariant",
		SpinnerVariantId.Spinner9,
	);

	expect(readInitialSpinnerVariantId()).toBe(SpinnerVariantId.Spinner9);
});

test("ignores invalid selected spinner variants", async () => {
	window.localStorage.setItem("nudge.spinner.selectedVariant", "spinner-99");
	mockStore.get.mockResolvedValue("spinner-99");

	expect(readInitialSpinnerVariantId(SpinnerVariantId.Spinner12)).toBe(
		SpinnerVariantId.Spinner12,
	);
	await expect(
		readSelectedSpinnerVariantId(SpinnerVariantId.Spinner12),
	).resolves.toBe(SpinnerVariantId.Spinner12);
});
