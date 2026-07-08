import FidgetShell from "components/FidgetShell";
import ToggleFidgetSurface from "components/ToggleFidgetSurface";
import vibrate from "lib/haptics";
import sounds from "lib/sounds";
import type { Dispatch, SetStateAction } from "react";
import { useState } from "react";

interface ToggleSwitchFidgetProps {
	onBack: () => void;
}

export default function ToggleSwitchFidget({
	onBack,
}: ToggleSwitchFidgetProps) {
	const [enabled, setEnabled] = useState(false);

	return (
		<FidgetShell title="Toggle Switch" accent="#8ad8ff" onBack={onBack}>
			<ToggleFidgetSurface
				enabled={enabled}
				onToggle={() => toggleSwitch(setEnabled)}
			/>
		</FidgetShell>
	);
}

function toggleSwitch(setEnabled: Dispatch<SetStateAction<boolean>>) {
	setEnabled((enabled) => !enabled);
	vibrate(12);
	sounds.toggle();
}
