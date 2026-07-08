import Theme from "classes/theme";

export default new (class extends Theme {
	constructor() {
		super("Light", "light", "#f0f0f7", "#12121f", "#ffffff", "#3c3c50");
	}

	get accent() {
		return "#5856d6";
	}

	get danger() {
		return "#ff3b30";
	}

	get success() {
		return "#34c759";
	}

	get cardBg() {
		return "rgba(255, 255, 255, 0.92)";
	}

	get cardBorder() {
		return "rgba(60, 60, 80, 0.14)";
	}

	get borderColor() {
		return "rgba(60, 60, 80, 0.12)";
	}

	get shadowColor() {
		return "rgba(0, 0, 0, 0.08)";
	}
})();
