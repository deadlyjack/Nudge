export function normalizeAngle(angle: number) {
	return ((angle % 360) + 360) % 360;
}

export function getShortestAngleDelta(fromAngle: number, toAngle: number) {
	const delta = normalizeAngle(toAngle) - normalizeAngle(fromAngle);

	if (delta > 180) {
		return delta - 360;
	}

	if (delta < -180) {
		return delta + 360;
	}

	return delta;
}
