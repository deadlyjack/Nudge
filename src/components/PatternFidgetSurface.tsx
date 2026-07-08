import "./PatternFidgetSurface.scss";

import PatternGrid from "components/PatternGrid";

interface PatternFidgetSurfaceProps {
	disabled?: boolean;
	litCells?: Record<number, number>;
	mode?: "full" | "icon";
	onTap?: (index: number) => void;
}

export default function PatternFidgetSurface({
	disabled,
	litCells,
	mode = "full",
	onTap,
}: PatternFidgetSurfaceProps) {
	return (
		<div className={getPatternSurfaceClassName(mode)}>
			<PatternGrid
				disabled={disabled}
				litCells={getPatternLitCells(mode, litCells)}
				onTap={onTap}
			/>
		</div>
	);
}

const iconPatternLitCells: Record<number, number> = {
	2: 1,
	6: 1,
	12: 1,
	18: 1,
	22: 1,
};

function getPatternSurfaceClassName(mode: "full" | "icon") {
	return mode === "icon" ? "pattern-fidget is-icon" : "pattern-fidget";
}

function getPatternLitCells(
	mode: "full" | "icon",
	litCells: Record<number, number> | undefined,
) {
	return litCells ?? (mode === "icon" ? iconPatternLitCells : undefined);
}
