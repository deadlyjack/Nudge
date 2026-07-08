import "./PatternGrid.scss";

const patternIndexes = [
	0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21,
	22, 23, 24,
];

interface PatternGridProps {
	disabled?: boolean;
	litCells?: Record<number, number>;
	onTap?: (index: number) => void;
}

export default function PatternGrid({
	disabled,
	litCells,
	onTap,
}: PatternGridProps) {
	const activeLitCells = litCells ?? {};

	return (
		<div
			className="pattern-fidget-grid"
			aria-hidden={disabled ? "true" : undefined}
		>
			{patternIndexes.map((index) => (
				<button
					key={index}
					type="button"
					className={getPatternCellClassName(index, activeLitCells)}
					disabled={disabled}
					onClick={disabled ? undefined : () => onTap?.(index)}
					aria-label={`Tap pattern cell ${index + 1}`}
				>
					{activeLitCells[index] ? (
						<span
							key={activeLitCells[index]}
							className="pattern-fidget-pulse"
						/>
					) : null}
				</button>
			))}
		</div>
	);
}

function getPatternCellClassName(
	index: number,
	litCells: Record<number, number>,
) {
	return litCells[index] ? "pattern-fidget-cell is-lit" : "pattern-fidget-cell";
}
