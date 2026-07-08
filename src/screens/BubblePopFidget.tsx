import BubbleFidgetSurface from "components/BubbleFidgetSurface";
import { bubbleGridSize } from "components/BubbleGrid";
import FidgetShell from "components/FidgetShell";
import vibrate from "lib/haptics";
import sounds from "lib/sounds";
import type { Dispatch, SetStateAction } from "react";
import { useEffect, useState } from "react";

interface BubblePopFidgetProps {
	onBack: () => void;
}

export default function BubblePopFidget({ onBack }: BubblePopFidgetProps) {
	const [poppedBubbles, setPoppedBubbles] = useState<Set<number>>(
		() => new Set(),
	);

	useEffect(() => {
		if (poppedBubbles.size !== bubbleGridSize) {
			return;
		}

		const resetTimer = window.setTimeout(() => {
			setPoppedBubbles(new Set());
		}, 540);

		return () => window.clearTimeout(resetTimer);
	}, [poppedBubbles]);

	return (
		<FidgetShell title="Bubble Pop" accent="#ff9fb2" onBack={onBack}>
			<BubbleFidgetSurface
				poppedBubbles={poppedBubbles}
				onPop={(index) => popBubble(index, setPoppedBubbles)}
			/>
		</FidgetShell>
	);
}

function popBubble(
	index: number,
	setPoppedBubbles: Dispatch<SetStateAction<Set<number>>>,
) {
	setPoppedBubbles((poppedBubbles) => {
		const nextPoppedBubbles = new Set(poppedBubbles);
		nextPoppedBubbles.add(index);
		return nextPoppedBubbles;
	});
	vibrate(9);
	sounds.pop();
}
