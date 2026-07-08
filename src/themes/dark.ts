import Theme from "classes/theme";

export default new (class extends Theme {
	constructor() {
		super("Dark", "dark", "#0a0a12", "#e0e0f0", "#12121f", "#a0a0c0");
	}

	get accent() {
		return "#7c8cf8";
	}

	get danger() {
		return "#ff4477";
	}

	get success() {
		return "#44dd88";
	}

	get cardBg() {
		return "rgba(16, 16, 32, 0.9)";
	}

	get cardBorder() {
		return "rgba(124, 140, 248, 0.15)";
	}

	get borderColor() {
		return "rgba(124, 140, 248, 0.12)";
	}

	get shadowColor() {
		return "rgba(0, 0, 0, 0.4)";
	}
})();
