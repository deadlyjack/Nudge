import store from "lib/store";
import { FidgetId } from "types/fidgets";

const ACTIVE_FIDGET_KEY = "nudge.app.activeFidget";

export function readInitialActiveFidgetId() {
	return parseStoredFidgetId(readLocalActiveFidgetId());
}

export async function readSelectedActiveFidgetId() {
	const storedFidgetId = parseStoredFidgetId(
		await store.get<string>(ACTIVE_FIDGET_KEY),
	);

	if (storedFidgetId) {
		writeLocalActiveFidgetId(storedFidgetId);
		return storedFidgetId;
	}

	return readInitialActiveFidgetId();
}

export async function writeSelectedActiveFidgetId(fidgetId: FidgetId) {
	writeLocalActiveFidgetId(fidgetId);
	await store.set(ACTIVE_FIDGET_KEY, fidgetId);
}

function readLocalActiveFidgetId() {
	if (!canUseLocalStorage()) {
		return null;
	}

	try {
		return window.localStorage.getItem(ACTIVE_FIDGET_KEY);
	} catch (error) {
		console.error(error);
		return null;
	}
}

function writeLocalActiveFidgetId(fidgetId: FidgetId) {
	if (!canUseLocalStorage()) {
		return;
	}

	try {
		window.localStorage.setItem(ACTIVE_FIDGET_KEY, fidgetId);
	} catch (error) {
		console.error(error);
	}
}

function parseStoredFidgetId(value: unknown): FidgetId | null {
	if (typeof value === "string" && isFidgetId(value)) {
		return value;
	}

	return null;
}

function isFidgetId(value: string): value is FidgetId {
	return Object.values(FidgetId).includes(value as FidgetId);
}

function canUseLocalStorage() {
	return typeof window !== "undefined" && Boolean(window.localStorage);
}
