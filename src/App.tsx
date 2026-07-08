import "./App.scss";

import KnobSelectorScreen from "fidgets/knob/KnobSelectorScreen";
import {
	readInitialKnobVariantId,
	readSelectedKnobVariantId,
	writeSelectedKnobVariantId,
} from "fidgets/knob/knobStats";
import type { KnobVariantId } from "fidgets/knob/knobTypes";
import { defaultKnobVariant } from "fidgets/knob/knobVariants";
import SpinnerFidget from "fidgets/spinner/SpinnerFidget";
import SpinnerSelectorScreen from "fidgets/spinner/SpinnerSelectorScreen";
import {
	readInitialSpinnerVariantId,
	readSelectedSpinnerVariantId,
	writeSelectedSpinnerVariantId,
} from "fidgets/spinner/spinnerStats";
import type { SpinnerVariantId } from "fidgets/spinner/spinnerTypes";
import { defaultSpinnerVariant } from "fidgets/spinner/spinnerVariants";
import {
	isSoundEnabled,
	setSoundEnabled,
	subscribeToSoundPreference,
} from "lib/sounds";
import { type ReactNode, useEffect, useState } from "react";
import BubblePopFidget from "screens/BubblePopFidget";
import CounterFidget from "screens/CounterFidget";
import HomeScreen from "screens/HomeScreen";
import KnobFidget from "screens/KnobFidget";
import PatternFidget from "screens/PatternFidget";
import ToggleSwitchFidget from "screens/ToggleSwitchFidget";
import { type FidgetDefinition, FidgetId } from "types/fidgets";

const fidgets: FidgetDefinition[] = [
	{
		id: FidgetId.ToggleSwitch,
		title: "Toggle Switch",
		subtitle: "A soft click for restless thumbs.",
		accent: "#8ad8ff",
	},
	{
		id: FidgetId.Spinner,
		title: "Spinner",
		subtitle: "Flick it, watch it settle.",
		accent: "#ffd166",
	},
	{
		id: FidgetId.Knob,
		title: "Knob / Dial",
		subtitle: "Turn slowly until your hands relax.",
		accent: "#b8f2c8",
	},
	{
		id: FidgetId.BubblePop,
		title: "Bubble Pop",
		subtitle: "Gentle bubbles with tiny pops.",
		accent: "#ff9fb2",
	},
	{
		id: FidgetId.PatternTap,
		title: "Pattern Tap",
		subtitle: "Tap a quiet pattern and let it fade.",
		accent: "#c8b6ff",
	},
	{
		id: FidgetId.Counter,
		title: "Counter",
		subtitle: "Tap out a steady count.",
		accent: "#78e4c4",
	},
];

interface ActiveSpinnerSelection {
	variantId: SpinnerVariantId;
}

interface ActiveKnobSelection {
	variantId: KnobVariantId;
}

interface PageTransitionProps {
	children: ReactNode;
	pageKey: string;
}

interface TransitionPage {
	content: ReactNode;
	key: string;
	status: TransitionPageStatus;
}

type TransitionPageStatus = "active" | "exiting";

const PAGE_TRANSITION_DURATION_MS = 260;

export default function App() {
	const [activeFidget, setActiveFidget] = useState<FidgetId | null>(null);
	const [activeSpinner, setActiveSpinner] = useState<ActiveSpinnerSelection>({
		variantId: readInitialSpinnerVariantId(defaultSpinnerVariant.id),
	});
	const [activeKnob, setActiveKnob] = useState<ActiveKnobSelection>({
		variantId: readInitialKnobVariantId(defaultKnobVariant.id),
	});
	const [openSelectorFidget, setOpenSelectorFidget] = useState<FidgetId | null>(
		null,
	);
	const [isSoundOn, setIsSoundOn] = useState(isSoundEnabled);
	const pageKey = getActivePageKey(activeFidget, openSelectorFidget);

	useEffect(() => {
		return subscribeToSoundPreference(() => setIsSoundOn(isSoundEnabled()));
	}, []);

	useEffect(() => {
		let isMounted = true;

		Promise.all([
			readSelectedSpinnerVariantId(defaultSpinnerVariant.id),
			readSelectedKnobVariantId(defaultKnobVariant.id),
		])
			.then(([spinnerVariantId, knobVariantId]) => {
				if (!isMounted) {
					return;
				}

				setActiveSpinner({ variantId: spinnerVariantId });
				setActiveKnob({ variantId: knobVariantId });
			})
			.catch(console.error);

		return () => {
			isMounted = false;
		};
	}, []);

	return (
		<main className="nudge-app">
			<PageTransition pageKey={pageKey}>
				{activeFidget ? (
					renderFidget(
						activeFidget,
						setActiveFidget,
						activeSpinner,
						setActiveSpinner,
						activeKnob,
						setActiveKnob,
						openSelectorFidget,
						setOpenSelectorFidget,
					)
				) : (
					<HomeScreen
						fidgets={fidgets}
						onSelect={(fidgetId) => {
							setActiveFidget(fidgetId);
							setOpenSelectorFidget(null);
						}}
						isSoundOn={isSoundOn}
						onToggleSound={() => setSoundEnabled(!isSoundOn)}
						knobVariantId={activeKnob.variantId}
						spinnerVariantId={activeSpinner.variantId}
					/>
				)}
			</PageTransition>
		</main>
	);
}

function PageTransition({ children, pageKey }: PageTransitionProps) {
	const [pages, setPages] = useState<TransitionPage[]>([
		{
			content: children,
			key: pageKey,
			status: "active",
		},
	]);

	useEffect(() => {
		setPages((currentPages) => {
			const activePage = currentPages.find((page) => page.status === "active");

			if (activePage?.key === pageKey) {
				return currentPages.map((page) =>
					page.key === pageKey
						? {
								content: children,
								key: pageKey,
								status: "active",
							}
						: page,
				);
			}

			const exitingPages = activePage
				? [
						{
							...activePage,
							status: "exiting" as const,
						},
					]
				: [];

			return [
				...exitingPages,
				{
					content: children,
					key: pageKey,
					status: "active" as const,
				},
			];
		});
	}, [children, pageKey]);

	useEffect(() => {
		if (!pages.some(isExitingPage)) {
			return;
		}

		const transitionTimeout = window.setTimeout(() => {
			setPages((currentPages) =>
				currentPages.filter((page) => page.status !== "exiting"),
			);
		}, PAGE_TRANSITION_DURATION_MS);

		return () => window.clearTimeout(transitionTimeout);
	}, [pages]);

	return (
		<div className="nudge-page-stack">
			{pages.map((page) => (
				<div
					key={page.key}
					className={getTransitionClassName(page.status)}
					aria-hidden={page.status === "exiting" ? "true" : undefined}
				>
					{page.content}
				</div>
			))}
		</div>
	);
}

function getActivePageKey(
	activeFidget: FidgetId | null,
	openSelectorFidget: FidgetId | null,
) {
	if (!activeFidget) {
		return "home";
	}

	return openSelectorFidget === activeFidget
		? `${activeFidget}-selector`
		: activeFidget;
}

function getTransitionClassName(status: TransitionPageStatus) {
	return `nudge-page-transition is-${status}`;
}

function isExitingPage(page: TransitionPage) {
	return page.status === "exiting";
}

function renderFidget(
	activeFidget: FidgetId,
	setActiveFidget: (id: FidgetId | null) => void,
	activeSpinner: ActiveSpinnerSelection,
	setActiveSpinner: (selection: ActiveSpinnerSelection) => void,
	activeKnob: ActiveKnobSelection,
	setActiveKnob: (selection: ActiveKnobSelection) => void,
	openSelectorFidget: FidgetId | null,
	setOpenSelectorFidget: (fidgetId: FidgetId | null) => void,
) {
	const closeFidget = () => {
		setOpenSelectorFidget(null);
		setActiveFidget(null);
	};

	switch (activeFidget) {
		case FidgetId.ToggleSwitch:
			return <ToggleSwitchFidget onBack={closeFidget} />;
		case FidgetId.Spinner:
			return openSelectorFidget === FidgetId.Spinner ? (
				<SpinnerSelectorScreen
					onBack={() => setOpenSelectorFidget(null)}
					onSelect={(selection) => {
						setActiveSpinner(selection);
						writeSelectedSpinnerVariantId(selection.variantId).catch(
							console.error,
						);
						setOpenSelectorFidget(null);
					}}
				/>
			) : (
				<SpinnerFidget
					onBack={closeFidget}
					onOpenSelector={() => setOpenSelectorFidget(FidgetId.Spinner)}
					variantId={activeSpinner.variantId}
				/>
			);
		case FidgetId.Knob:
			return openSelectorFidget === FidgetId.Knob ? (
				<KnobSelectorScreen
					onBack={() => setOpenSelectorFidget(null)}
					onSelect={(selection) => {
						setActiveKnob(selection);
						writeSelectedKnobVariantId(selection.variantId).catch(
							console.error,
						);
						setOpenSelectorFidget(null);
					}}
				/>
			) : (
				<KnobFidget
					onBack={closeFidget}
					onOpenSelector={() => setOpenSelectorFidget(FidgetId.Knob)}
					variantId={activeKnob.variantId}
				/>
			);
		case FidgetId.BubblePop:
			return <BubblePopFidget onBack={closeFidget} />;
		case FidgetId.PatternTap:
			return <PatternFidget onBack={closeFidget} />;
		case FidgetId.Counter:
			return <CounterFidget onBack={closeFidget} />;
		default:
			return null;
	}
}
