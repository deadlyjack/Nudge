import store from "lib/store";

import { SpinnerVariantId } from "./spinnerTypes";

const SPINNER_BEST_SPEED_KEY = "nudge.spinner.bestSpeed";
const SPINNER_SELECTED_VARIANT_KEY = "nudge.spinner.selectedVariant";
const SPINNER_ANGLE_KEY = "nudge.spinner.angle";

export function getSpinnerSpeedScore(speed: number) {
	return Math.round(Math.abs(speed) / 6);
}

export function formatSpinnerSpeed(speed: number) {
	return `${getSpinnerSpeedScore(speed)}`;
}

export async function readBestSpinnerSpeed(
	variantId = SpinnerVariantId.Spinner1,
) {
	const variantStorageKey = getSpinnerBestSpeedKey(variantId);
	const storedSpeed = parseStoredSpeed(
		await store.get<number>(variantStorageKey),
	);

	if (storedSpeed > 0) {
		return storedSpeed;
	}

	const migratedSpeed = readLocalBestSpinnerSpeed(variantStorageKey);

	if (migratedSpeed > 0) {
		await writeBestSpinnerSpeed(migratedSpeed, variantId);
		return migratedSpeed;
	}

	if (variantId !== SpinnerVariantId.Spinner1) {
		return 0;
	}

	const legacySpeed = parseStoredSpeed(
		await store.get<number>(SPINNER_BEST_SPEED_KEY),
	);

	if (legacySpeed > 0) {
		await writeBestSpinnerSpeed(legacySpeed, variantId);
		return legacySpeed;
	}

	const legacyLocalSpeed = readLocalBestSpinnerSpeed(SPINNER_BEST_SPEED_KEY);

	if (legacyLocalSpeed > 0) {
		await writeBestSpinnerSpeed(legacyLocalSpeed, variantId);
		return legacyLocalSpeed;
	}

	return 0;
}

export async function writeBestSpinnerSpeed(
	speed: number,
	variantId = SpinnerVariantId.Spinner1,
) {
	const absoluteSpeed = Math.abs(speed);
	const storageKey = getSpinnerBestSpeedKey(variantId);

	writeLocalBestSpinnerSpeed(storageKey, absoluteSpeed);
	await store.set(storageKey, absoluteSpeed);
}

export function readInitialSpinnerVariantId(
	fallbackVariantId = SpinnerVariantId.Spinner12,
): SpinnerVariantId {
	return (
		parseStoredSpinnerVariantId(readLocalSelectedSpinnerVariantId()) ??
		fallbackVariantId
	);
}

export async function readSelectedSpinnerVariantId(
	fallbackVariantId = SpinnerVariantId.Spinner12,
): Promise<SpinnerVariantId> {
	const storedVariantId = parseStoredSpinnerVariantId(
		await store.get<string>(SPINNER_SELECTED_VARIANT_KEY),
	);

	if (storedVariantId) {
		writeLocalSelectedSpinnerVariantId(storedVariantId);
		return storedVariantId;
	}

	return readInitialSpinnerVariantId(fallbackVariantId);
}

export async function writeSelectedSpinnerVariantId(
	variantId: SpinnerVariantId,
) {
	writeLocalSelectedSpinnerVariantId(variantId);
	await store.set(SPINNER_SELECTED_VARIANT_KEY, variantId);
}

export function readInitialSpinnerAngle(
	variantId = SpinnerVariantId.Spinner1,
	fallbackAngle = 0,
) {
	return (
		parseStoredAngle(readLocalSpinnerAngle(getSpinnerAngleKey(variantId))) ??
		fallbackAngle
	);
}

export async function readSpinnerAngle(
	variantId = SpinnerVariantId.Spinner1,
	fallbackAngle = 0,
) {
	const storageKey = getSpinnerAngleKey(variantId);
	const storedAngle = parseStoredAngle(await store.get<number>(storageKey));

	if (storedAngle !== null) {
		writeLocalSpinnerAngle(storageKey, storedAngle);
		return storedAngle;
	}

	return readInitialSpinnerAngle(variantId, fallbackAngle);
}

export async function writeSpinnerAngle(
	angle: number,
	variantId = SpinnerVariantId.Spinner1,
) {
	const storageKey = getSpinnerAngleKey(variantId);
	const normalizedAngle = normalizeStoredAngle(angle);

	writeLocalSpinnerAngle(storageKey, normalizedAngle);
	await store.set(storageKey, normalizedAngle);
}

function getSpinnerBestSpeedKey(variantId: SpinnerVariantId) {
	return `${SPINNER_BEST_SPEED_KEY}.${variantId}`;
}

function getSpinnerAngleKey(variantId: SpinnerVariantId) {
	return `${SPINNER_ANGLE_KEY}.${variantId}`;
}

function readLocalBestSpinnerSpeed(storageKey: string) {
	if (!canUseLocalStorage()) {
		return 0;
	}

	try {
		return parseStoredSpeed(window.localStorage.getItem(storageKey));
	} catch (error) {
		console.error(error);
		return 0;
	}
}

function writeLocalBestSpinnerSpeed(storageKey: string, speed: number) {
	if (!canUseLocalStorage()) {
		return;
	}

	try {
		window.localStorage.setItem(storageKey, `${Math.abs(speed)}`);
	} catch (error) {
		console.error(error);
	}
}

function readLocalSelectedSpinnerVariantId() {
	if (!canUseLocalStorage()) {
		return null;
	}

	try {
		return window.localStorage.getItem(SPINNER_SELECTED_VARIANT_KEY);
	} catch (error) {
		console.error(error);
		return null;
	}
}

function writeLocalSelectedSpinnerVariantId(variantId: SpinnerVariantId) {
	if (!canUseLocalStorage()) {
		return;
	}

	try {
		window.localStorage.setItem(SPINNER_SELECTED_VARIANT_KEY, variantId);
	} catch (error) {
		console.error(error);
	}
}

function readLocalSpinnerAngle(storageKey: string) {
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

function writeLocalSpinnerAngle(storageKey: string, angle: number) {
	if (!canUseLocalStorage()) {
		return;
	}

	try {
		window.localStorage.setItem(storageKey, `${angle}`);
	} catch (error) {
		console.error(error);
	}
}

function parseStoredSpeed(value: unknown) {
	const parsedSpeed = Number(value);

	return Number.isFinite(parsedSpeed) && parsedSpeed > 0 ? parsedSpeed : 0;
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

function parseStoredSpinnerVariantId(value: unknown): SpinnerVariantId | null {
	if (typeof value === "string" && isSpinnerVariantId(value)) {
		return value;
	}

	return null;
}

function isSpinnerVariantId(value: string): value is SpinnerVariantId {
	return Object.values(SpinnerVariantId).includes(value as SpinnerVariantId);
}

function canUseLocalStorage() {
	return typeof window !== "undefined" && Boolean(window.localStorage);
}
