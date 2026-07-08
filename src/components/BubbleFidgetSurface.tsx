import "./BubbleFidgetSurface.scss";

import BubbleGrid from "components/BubbleGrid";

interface BubbleFidgetSurfaceProps {
	disabled?: boolean;
	mode?: "full" | "icon";
	onPop?: (index: number) => void;
	poppedBubbles?: Set<number>;
}

export default function BubbleFidgetSurface({
	disabled,
	mode = "full",
	onPop,
	poppedBubbles,
}: BubbleFidgetSurfaceProps) {
	return (
		<div className={getBubbleSurfaceClassName(mode)}>
			<BubbleGrid
				disabled={disabled}
				onPop={onPop}
				poppedBubbles={poppedBubbles}
			/>
		</div>
	);
}

function getBubbleSurfaceClassName(mode: "full" | "icon") {
	return mode === "icon" ? "bubble-fidget is-icon" : "bubble-fidget";
}
