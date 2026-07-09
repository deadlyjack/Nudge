import store from "lib/store";

import { KnobVariantId } from "./knobTypes";

const KNOB_SELECTED_VARIANT_KEY = "nudge.knob.selectedVariant";
const KNOB_ANGLE_KEY = "nudge.knob.angle";

export function readInitialKnobVariantId(
	fallbackVariantId = KnobVariantId.BrushedAluminum,
): KnobVariantId {
	return (
		parseStoredKnobVariantId(readLocalSelectedKnobVariantId()) ??
		fallbackVariantId
	);
}

export async function readSelectedKnobVariantId(
	fallbackVariantId = KnobVariantId.BrushedAluminum,
): Promise<KnobVariantId> {
	const storedVariantId = parseStoredKnobVariantId(
		await store.get<string>(KNOB_SELECTED_VARIANT_KEY),
	);

	if (storedVariantId) {
		writeLocalSelectedKnobVariantId(storedVariantId);
		return storedVariantId;
	}

	return readInitialKnobVariantId(fallbackVariantId);
}

export async function writeSelectedKnobVariantId(variantId: KnobVariantId) {
	writeLocalSelectedKnobVariantId(variantId);
	await store.set(KNOB_SELECTED_VARIANT_KEY, variantId);
}

export function readInitialKnobAngle(
	variantId = KnobVariantId.BrushedAluminum,
	fallbackAngle = 0,
) {
	return (
		parseStoredAngle(readLocalKnobAngle(getKnobAngleKey(variantId))) ??
		fallbackAngle
	);
}

export async function readKnobAngle(
	variantId = KnobVariantId.BrushedAluminum,
	fallbackAngle = 0,
) {
	const storageKey = getKnobAngleKey(variantId);
	const storedAngle = parseStoredAngle(await store.get<number>(storageKey));

	if (storedAngle !== null) {
		writeLocalKnobAngle(storageKey, storedAngle);
		return storedAngle;
	}

	return readInitialKnobAngle(variantId, fallbackAngle);
}

export async function writeKnobAngle(
	angle: number,
	variantId = KnobVariantId.BrushedAluminum,
) {
	const storageKey = getKnobAngleKey(variantId);
	const normalizedAngle = normalizeStoredAngle(angle);

	writeLocalKnobAngle(storageKey, normalizedAngle);
	await store.set(storageKey, normalizedAngle);
}

function getKnobAngleKey(variantId: KnobVariantId) {
	return `${KNOB_ANGLE_KEY}.${variantId}`;
}

function readLocalSelectedKnobVariantId() {
	if (!canUseLocalStorage()) {
		return null;
	}

	try {
		return window.localStorage.getItem(KNOB_SELECTED_VARIANT_KEY);
	} catch (error) {
		console.error(error);
		return null;
	}
}

function readLocalKnobAngle(storageKey: string) {
	if (!canUseLocalStorage()) {
		return null;
	}

	try {
		return window.localStorage.getItem(storageKey);
	} catch (error) {
		console.error(error);
		return null;
	}
}

function writeLocalKnobAngle(storageKey: string, angle: number) {
	if (!canUseLocalStorage()) {
		return;
	}

	try {
		window.localStorage.setItem(storageKey, `${angle}`);
	} catch (error) {
		console.error(error);
	}
}

function writeLocalSelectedKnobVariantId(variantId: KnobVariantId) {
	if (!canUseLocalStorage()) {
		return;
	}

	try {
		window.localStorage.setItem(KNOB_SELECTED_VARIANT_KEY, variantId);
	} catch (error) {
		console.error(error);
	}
}

function parseStoredKnobVariantId(value: unknown): KnobVariantId | null {
	if (typeof value === "string" && isKnobVariantId(value)) {
		return value;
	}

	return null;
}

function parseStoredAngle(value: unknown) {
	if (value === null || value === undefined || value === "") {
		return null;
	}

	const parsedAngle = Number(value);

	return Number.isFinite(parsedAngle)
		? normalizeStoredAngle(parsedAngle)
		: null;
}

function normalizeStoredAngle(angle: number) {
	return ((angle % 360) + 360) % 360;
}

function isKnobVariantId(value: string): value is KnobVariantId {
	return Object.values(KnobVariantId).includes(value as KnobVariantId);
}

function canUseLocalStorage() {
	return typeof window !== "undefined" && Boolean(window.localStorage);
}
