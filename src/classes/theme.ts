import color from "classes/color";
import { isValidColor } from "./color/regex";

export default class Theme {
	static WHITE = "#ffffff";
	static BLACK = "#000000";

	#name: string;
	#type: string;

	#primary = "#213555";
	#primaryText = Theme.WHITE;
	#secondary = "#3E5879";
	#secondaryText = "#F5EFE7";

	constructor(
		name: string,
		type: string,
		primary?: string,
		primaryText?: string,
		secondary?: string,
		secondaryText?: string,
	) {
		this.#name = name;
		this.#type = type;

		if (primary) {
			this.#primary = primary;
		}

		if (primaryText) {
			this.#primaryText = primaryText;
		}

		if (secondary) {
			this.#secondary = secondary;
		}

		if (secondaryText) {
			this.#secondaryText = secondaryText;
		}
	}

	get name() {
		return this.#name;
	}

	get type() {
		return this.#type;
	}

	get primary() {
		return this.#primary;
	}

	get primaryText() {
		return this.#primaryText;
	}

	get secondary() {
		return this.#secondary;
	}

	get secondaryText() {
		return this.#secondaryText;
	}

	get accent() {
		return "#3399ff";
	}

	get danger() {
		return "#ff3325";
	}

	get success() {
		return "#339966";
	}

	get cardBg() {
		return this.#secondary;
	}

	get cardBorder() {
		return "rgba(255, 255, 255, 0.14)";
	}

	get borderColor() {
		return "rgba(255, 255, 255, 0.14)";
	}

	get shadowColor() {
		return "rgba(0, 0, 0, 0.5)";
	}

	get json() {
		const json: Record<string, string> = {};
		const prototype = Object.getPrototypeOf(Object.getPrototypeOf(this));
		const props = Object.entries(Object.getOwnPropertyDescriptors(prototype));
		const getters = props.filter(([, { get }]) => typeof get === "function");

		for (const [key] of getters) {
			if (["css", "json"].includes(key)) {
				continue;
			}

			const value = Reflect.get(this, key);

			if (key === "name" || key === "type") {
				json[key] = String(value);
				continue;
			}

			if (isValidColor(String(value))) {
				json[key] = color(String(value)).hex.toString();
			} else {
				json[key] = String(value);
			}
		}

		return json;
	}

	get css() {
		let css = "";
		const { json } = this;
		for (const [key, value] of Object.entries(json)) {
			const cssVar = key.replace(/[A-Z]/g, ($) => `-${$.toLowerCase()}`);
			css += `--${cssVar}: ${value};\n`;
		}
		return `:root {\n${css}}\n`;
	}
}
