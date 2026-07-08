import type Theme from "classes/theme";

type ThemeListener = (theme: Theme) => void;

const listeners = new Set<ThemeListener>();
let currentTheme: Theme | null = null;

function emitTheme(theme: Theme) {
	currentTheme = theme;
	for (const listener of listeners) {
		listener(theme);
	}
}

export default {
	async get(name: string) {
		switch (name.toLowerCase()) {
			case "light": {
				const themeModule = await import("./light");
				return themeModule.default;
			}
			default: {
				const themeModule = await import("./dark");
				return themeModule.default;
			}
		}
	},
	async applyTheme(name: string) {
		const theme = await this.get(name);
		document.documentElement.dataset.themeType = theme.type;

		const themeStyle = document.querySelector("style#theme-data");
		if (themeStyle) {
			themeStyle.textContent = theme.css as string;
		}

		emitTheme(theme);
		try {
			localStorage.setItem("primaryColor", theme.primary);
			localStorage.setItem("primaryTextColor", theme.primaryText);
		} catch {
			// Ignore
		}
	},
	get list(): string[] {
		return ["Dark", "Light"];
	},
	has(name: string): boolean {
		return this.list.map((t) => t.toLowerCase()).includes(name.toLowerCase());
	},
	get current(): Theme | null {
		return currentTheme;
	},
	subscribe(listener: ThemeListener): () => void {
		listeners.add(listener);
		if (currentTheme) {
			listener(currentTheme);
		}
		return () => listeners.delete(listener);
	},
};
