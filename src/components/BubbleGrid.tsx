import "./BubbleGrid.scss";

const bubbleIndexes = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];

interface BubbleGridProps {
	disabled?: boolean;
	onPop?: (index: number) => void;
	poppedBubbles?: Set<number>;
}

export const bubbleGridSize = bubbleIndexes.length;

export default function BubbleGrid({
	disabled,
	onPop,
	poppedBubbles,
}: BubbleGridProps) {
	return (
		<div
			className="bubble-fidget-grid"
			aria-hidden={disabled ? "true" : undefined}
		>
			{bubbleIndexes.map((index) => (
				<button
					key={index}
					type="button"
					className={getBubbleClassName(index, poppedBubbles)}
					onClick={disabled ? undefined : () => onPop?.(index)}
					aria-label={`Pop bubble ${index + 1}`}
					disabled={disabled || poppedBubbles?.has(index)}
				/>
			))}
		</div>
	);
}

function getBubbleClassName(index: number, poppedBubbles?: Set<number>) {
	return poppedBubbles?.has(index)
		? "bubble-fidget-bubble is-popped"
		: "bubble-fidget-bubble";
}
