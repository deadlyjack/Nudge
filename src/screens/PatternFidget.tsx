import FidgetShell from "components/FidgetShell";
import PatternFidgetSurface from "components/PatternFidgetSurface";
import vibrate from "lib/haptics";
import sounds from "lib/sounds";
import type { Dispatch, SetStateAction } from "react";
import { useState } from "react";

interface PatternFidgetProps {
	onBack: () => void;
}

export default function PatternFidget({ onBack }: PatternFidgetProps) {
	const [litCells, setLitCells] = useState<Record<number, number>>({});

	return (
		<FidgetShell title="Pattern Tap" accent="#c8b6ff" onBack={onBack}>
			<PatternFidgetSurface
				litCells={litCells}
				onTap={(index) => tapPatternCell(index, setLitCells)}
			/>
		</FidgetShell>
	);
}

function tapPatternCell(
	index: number,
	setLitCells: Dispatch<SetStateAction<Record<number, number>>>,
) {
	setLitCells((litCells) => ({
		...litCells,
		[index]: (litCells[index] ?? 0) + 1,
	}));
	window.setTimeout(() => clearPatternCell(index, setLitCells), 520);
	vibrate(6);
	sounds.tap();
}

function clearPatternCell(
	index: number,
	setLitCells: Dispatch<SetStateAction<Record<number, number>>>,
) {
	setLitCells((litCells) => {
		const nextLitCells = { ...litCells };
		delete nextLitCells[index];
		return nextLitCells;
	});
}
