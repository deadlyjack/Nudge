import "./KnobSelectorScreen.scss";

import FidgetShell from "components/FidgetShell";
import KnobFidgetSurface from "components/KnobFidgetSurface";

import type { KnobVariant, KnobVariantId } from "./knobTypes";
import { defaultKnobVariant, knobVariants } from "./knobVariants";

interface KnobSelection {
	variantId: KnobVariantId;
}

interface KnobSelectorScreenProps {
	onBack: () => void;
	onSelect: (selection: KnobSelection) => void;
}

export default function KnobSelectorScreen({
	onBack,
	onSelect,
}: KnobSelectorScreenProps) {
	return (
		<FidgetShell
			title="Knob"
			accent={defaultKnobVariant.visual.accent}
			className="fidget-shell-gallery"
			onBack={onBack}
		>
			<div className="knob-selector">
				<div className="knob-selector-grid">
					{knobVariants.map((variant) => (
						<KnobSelectorCard
							key={variant.id}
							onOpen={() =>
								onSelect({
									variantId: variant.id,
								})
							}
							variant={variant}
						/>
					))}
				</div>
			</div>
		</FidgetShell>
	);
}

function KnobSelectorCard({
	onOpen,
	variant,
}: {
	onOpen: () => void;
	variant: KnobVariant;
}) {
	return (
		<article className="knob-selector-card">
			<button
				type="button"
				className="knob-selector-choice"
				onClick={onOpen}
				aria-label={`Open ${variant.label}`}
			>
				<KnobFidgetSurface
					angle={variant.detentInterval * 2}
					disabled
					mode="icon"
					variant={variant}
				/>
			</button>
		</article>
	);
}
