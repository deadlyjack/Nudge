import vibrate from "lib/haptics";

test("does not throw when vibration is unavailable", () => {
	const originalVibrate = navigator.vibrate;

	Object.defineProperty(navigator, "vibrate", {
		configurable: true,
		value: undefined,
	});

	expect(() => vibrate(10)).not.toThrow();

	Object.defineProperty(navigator, "vibrate", {
		configurable: true,
		value: originalVibrate,
	});
});
