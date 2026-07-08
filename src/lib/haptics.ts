export default function vibrate(pattern: VibratePattern = 10) {
	try {
		if (typeof navigator !== "undefined" && navigator.vibrate) {
			const didVibrate = navigator.vibrate(pattern);
			if (didVibrate) {
				return;
			}
		}

		triggerNativeHaptic();
	} catch (error) {
		console.error("Haptic feedback unavailable", error);
	}
}

function triggerNativeHaptic() {
	if (typeof Bridge === "undefined") {
		return;
	}

	Bridge.exec(
		() => undefined,
		() => undefined,
		"Native",
		"haptic",
		[],
	);
}
