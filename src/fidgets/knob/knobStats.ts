import store from "lib/store";

import { KnobVariantId } from "./knobTypes";

const KNOB_SELECTED_VARIANT_KEY = "nudge.knob.selectedVariant";

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

function isKnobVariantId(value: string): value is KnobVariantId {
	return Object.values(KnobVariantId).includes(value as KnobVariantId);
}

function canUseLocalStorage() {
	return typeof window !== "undefined" && Boolean(window.localStorage);
}
