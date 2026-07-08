import "./SpinnerSelectorScreen.scss";

import FidgetShell from "components/FidgetShell";

import SpinnerRotor from "./SpinnerRotor";
import type { SpinnerVariant, SpinnerVariantId } from "./spinnerTypes";
import { defaultSpinnerVariant, spinnerVariants } from "./spinnerVariants";

interface SpinnerSelection {
	variantId: SpinnerVariantId;
}

interface SpinnerSelectorScreenProps {
	onBack: () => void;
	onSelect: (selection: SpinnerSelection) => void;
}

export default function SpinnerSelectorScreen({
	onBack,
	onSelect,
}: SpinnerSelectorScreenProps) {
	return (
		<FidgetShell
			title="Spinner"
			accent={defaultSpinnerVariant.color.accent}
			className="fidget-shell-gallery"
			onBack={onBack}
		>
			<div className="spinner-selector">
				<div className="spinner-selector-grid">
					{spinnerVariants.map((variant) => (
						<SpinnerSelectorCard
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

function SpinnerSelectorCard({
	onOpen,
	variant,
}: {
	onOpen: () => void;
	variant: SpinnerVariant;
}) {
	return (
		<article className="spinner-selector-card">
			<button
				type="button"
				className="spinner-selector-choice"
				onClick={onOpen}
				aria-label={`Open ${variant.label}`}
			>
				<span className="spinner-selector-preview-stage">
					<SpinnerRotor color={variant.color} preview variant={variant} />
				</span>
			</button>
		</article>
	);
}
