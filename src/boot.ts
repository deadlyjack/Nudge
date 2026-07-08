//# allFunctionsCalledOnLoad

import "./tailwind.css";
import "./res/favicon-32.png";
import "./res/favicon-64.png";
import "./res/splash.svg";
import "./res/manifest.json";
import "./res/logo-192.png";
import "./res/logo-512.png";

(async () => {
	delete (window as unknown as { SharedWorker?: unknown }).SharedWorker;

	console.info(`App Version: ${process.env.VERSION}`);
	if (
		process.env.DEV_MODE &&
		process.env.ORIGIN &&
		process.env.ORIGIN !== location.origin &&
		!process.env.IS_BROWSER
	) {
		try {
			await fetch(process.env.ORIGIN, {
				method: "HEAD",
				mode: "no-cors",
				signal: AbortSignal.timeout(3000),
				headers: {
					"Content-Type": "text/html",
				},
			});
			window.location.replace(process.env.ORIGIN);
			return;
		} catch (error) {
			console.error("Error setting dev mode", error);
		}
	}

	let setup: { default: () => Promise<void> } | null = null;

	if (process.env.IS_ANDROID) {
		setup = await import("./platforms/android");
	} else if (process.env.IS_IOS) {
		setup = await import("./platforms/ios");
	} else if (process.env.IS_BROWSER) {
		setup = await import("./platforms/browser");
	}

	try {
		if (!setup) {
			throw new Error("No platform setup module matched this environment");
		}
		await setup.default();
	} catch (error) {
		console.error("Error during platform setup:", error);
	}

	import("./main");
})();
