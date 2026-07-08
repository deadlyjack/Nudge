import "./index.html";
import "./main.scss";

import "polyfill";

import file from "bridge/file";
import native from "bridge/native";
import store from "lib/store";
import { createElement } from "react";
import { createRoot } from "react-dom/client";
import themes from "themes";
import App from "./App";

if (document.readyState === "complete") {
	load().catch(console.error);
} else {
	window.addEventListener("load", load);
}

async function load() {
	if (process.env.PLATFORM === "ios") {
		native.haptic();
	}
	native.hideSplashScreen();

	const appInfo = await native.getAppInfo();
	const bootMessage = `App Version: ${appInfo.versionName} (${appInfo.versionCode})`;

	if (!(await file.exists("/files"))) {
		await file.createDirectory("/files");
	}

	if (!(await file.exists("/cache"))) {
		await file.createDirectory("/cache");
	}

	const theme = await store.get<string>("theme");
	await themes.applyTheme(theme ?? "dark");

	if (process.env.PLATFORM === "android") {
		const navMode = await native.getNavigationMode();
		const root = document.documentElement.style;
		root.setProperty("--sat", `${navMode.statusBarHeight}px`);
		if (navMode.hasButtons) {
			root.setProperty("--sab", `${navMode.navigationBarHeight}px`);
		}
	}

	document.body.dataset.message = bootMessage;
	document.body.setAttribute("platform", process.env.PLATFORM);

	document.body.classList.remove("loading");
	document.body.classList.add("done");

	createRoot(document.body).render(createElement(App));
}
