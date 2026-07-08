import "./HomeScreen.scss";

import BubbleFidgetSurface from "components/BubbleFidgetSurface";
import CounterFidgetSurface from "components/CounterFidgetSurface";
import FidgetCard from "components/FidgetCard";
import KnobFidgetSurface from "components/KnobFidgetSurface";
import PatternFidgetSurface from "components/PatternFidgetSurface";
import ToggleFidgetSurface from "components/ToggleFidgetSurface";
import type { KnobVariantId } from "fidgets/knob/knobTypes";
import { getKnobVariant } from "fidgets/knob/knobVariants";
import SpinnerSurface from "fidgets/spinner/SpinnerSurface";
import type { SpinnerVariantId } from "fidgets/spinner/spinnerTypes";
import { getSpinnerVariant } from "fidgets/spinner/spinnerVariants";
import { Volume2, VolumeX } from "lucide-react";
import { type FidgetDefinition, FidgetId } from "types/fidgets";

interface HomeScreenProps {
	fidgets: FidgetDefinition[];
	isSoundOn: boolean;
	knobVariantId: KnobVariantId;
	onSelect: (id: FidgetId) => void;
	onToggleSound: () => void;
	spinnerVariantId: SpinnerVariantId;
}

export default function HomeScreen({
	fidgets,
	isSoundOn,
	knobVariantId,
	onSelect,
	onToggleSound,
	spinnerVariantId,
}: HomeScreenProps) {
	return (
		<section className="home-screen">
			<header className="home-screen-header">
				<SoundToggle isSoundOn={isSoundOn} onToggle={onToggleSound} />
			</header>
			<div className="home-screen-body">
				<div className="home-screen-grid">
					{fidgets.map((fidget) => (
						<FidgetCard key={fidget.id} fidget={fidget} onSelect={onSelect}>
							{renderFidgetIcon(fidget.id, spinnerVariantId, knobVariantId)}
						</FidgetCard>
					))}
				</div>
			</div>
		</section>
	);
}

function SoundToggle({
	isSoundOn,
	onToggle,
}: {
	isSoundOn: boolean;
	onToggle: () => void;
}) {
	const Icon = isSoundOn ? Volume2 : VolumeX;

	return (
		<button
			type="button"
			className="home-screen-sound-toggle"
			onClick={onToggle}
			aria-label={isSoundOn ? "Turn sound off" : "Turn sound on"}
			aria-pressed={!isSoundOn}
		>
			<Icon size={22} strokeWidth={2.35} aria-hidden="true" />
		</button>
	);
}

function renderFidgetIcon(
	fidgetId: FidgetId,
	spinnerVariantId: SpinnerVariantId,
	knobVariantId: KnobVariantId,
) {
	switch (fidgetId) {
		case FidgetId.ToggleSwitch:
			return <ToggleFidgetSurface enabled={false} mode="icon" disabled />;
		case FidgetId.Spinner:
			return <SpinnerIcon spinnerVariantId={spinnerVariantId} />;
		case FidgetId.Knob:
			return <KnobIcon knobVariantId={knobVariantId} />;
		case FidgetId.BubblePop:
			return <BubbleFidgetSurface mode="icon" disabled />;
		case FidgetId.PatternTap:
			return <PatternFidgetSurface mode="icon" disabled />;
		case FidgetId.Counter:
			return <CounterFidgetSurface mode="icon" disabled />;
		default:
			return null;
	}
}

function KnobIcon({ knobVariantId }: { knobVariantId: KnobVariantId }) {
	const variant = getKnobVariant(knobVariantId);

	return (
		<KnobFidgetSurface
			angle={variant.detentInterval * 2}
			disabled
			mode="icon"
			variant={variant}
		/>
	);
}

function SpinnerIcon({
	spinnerVariantId,
}: {
	spinnerVariantId: SpinnerVariantId;
}) {
	const variant = getSpinnerVariant(spinnerVariantId);

	return (
		<SpinnerSurface
			color={variant.color}
			disabled
			mode="icon"
			variant={variant}
		/>
	);
}
