import "./App.scss";

import KnobDial from "components/KnobDial";
import KnobSelectorScreen from "fidgets/knob/KnobSelectorScreen";
import {
	readInitialKnobAngle,
	readInitialKnobVariantId,
	readKnobAngle,
	readSelectedKnobVariantId,
	writeSelectedKnobVariantId,
} from "fidgets/knob/knobStats";
import type { KnobVariantId } from "fidgets/knob/knobTypes";
import { defaultKnobVariant, getKnobVariant } from "fidgets/knob/knobVariants";
import SpinnerFidget from "fidgets/spinner/SpinnerFidget";
import SpinnerRotor from "fidgets/spinner/SpinnerRotor";
import SpinnerSelectorScreen from "fidgets/spinner/SpinnerSelectorScreen";
import { advanceSpinnerFrames } from "fidgets/spinner/spinnerPhysics";
import {
	readInitialSpinnerAngle,
	readInitialSpinnerVariantId,
	readSelectedSpinnerVariantId,
	readSpinnerAngle,
	writeSelectedSpinnerVariantId,
	writeSpinnerAngle,
} from "fidgets/spinner/spinnerStats";
import type {
	SpinnerFrame,
	SpinnerVariantId,
} from "fidgets/spinner/spinnerTypes";
import {
	defaultSpinnerVariant,
	getSpinnerVariant,
} from "fidgets/spinner/spinnerVariants";
import {
	readInitialActiveFidgetId,
	readSelectedActiveFidgetId,
	writeSelectedActiveFidgetId,
} from "lib/fidgetSession";
import {
	isSoundEnabled,
	setSoundEnabled,
	subscribeToSoundPreference,
} from "lib/sounds";
import {
	type CSSProperties,
	type MutableRefObject,
	type ReactNode,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";
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

interface HeroRect {
	height: number;
	left: number;
	top: number;
	width: number;
}

interface HeroTransitionState {
	fidgetId: HeroFidgetId;
	fromRect: HeroRect;
	phase: HeroTransitionPhase;
	toRect: HeroRect | null;
}

interface HeroVisualLayerProps {
	activeKnob: ActiveKnobSelection;
	activeSpinner: ActiveSpinnerSelection;
	knobAngle: number;
	spinnerFrame: SpinnerFrame;
	transition: HeroTransitionState | null;
}

interface PageTransitionProps {
	children: ReactNode;
	heroPhase?: HeroTransitionPhase;
	pageKey: string;
}

interface TransitionPage {
	content: ReactNode;
	key: string;
	status: TransitionPageStatus;
}

type TransitionPageStatus = "active" | "exiting";
type HeroFidgetId = FidgetId.Spinner | FidgetId.Knob;
type HeroTransitionPhase = "measuring" | "animating" | "committing";

const PAGE_TRANSITION_DURATION_MS = 260;
const HERO_TRANSITION_DURATION_MS = 260;
const HERO_MEASURE_RETRY_LIMIT = 4;
const SPINNER_HOME_MAX_FRAME_SECONDS = 0.18;

export default function App() {
	const [activeFidget, setActiveFidget] = useState<FidgetId | null>(
		readInitialActiveFidgetId,
	);
	const [activeSpinner, setActiveSpinner] = useState<ActiveSpinnerSelection>({
		variantId: readInitialSpinnerVariantId(defaultSpinnerVariant.id),
	});
	const [spinnerFrame, setSpinnerFrame] = useState<SpinnerFrame>(() =>
		getInitialAppSpinnerFrame(
			readInitialSpinnerVariantId(defaultSpinnerVariant.id),
		),
	);
	const [activeKnob, setActiveKnob] = useState<ActiveKnobSelection>({
		variantId: readInitialKnobVariantId(defaultKnobVariant.id),
	});
	const [knobAngle, setKnobAngle] = useState(() =>
		getInitialAppKnobAngle(readInitialKnobVariantId(defaultKnobVariant.id)),
	);
	const [openSelectorFidget, setOpenSelectorFidget] = useState<FidgetId | null>(
		null,
	);
	const [isSoundOn, setIsSoundOn] = useState(isSoundEnabled);
	const [heroTransition, setHeroTransition] =
		useState<HeroTransitionState | null>(null);
	const activeFidgetRef = useRef(activeFidget);
	const spinnerFrameRef = useRef(spinnerFrame);
	const pageKey = getActivePageKey(activeFidget, openSelectorFidget);
	const hiddenHeroId = heroTransition?.fidgetId ?? null;

	useEffect(() => {
		activeFidgetRef.current = activeFidget;
	}, [activeFidget]);

	useEffect(() => {
		spinnerFrameRef.current = spinnerFrame;
	}, [spinnerFrame]);

	useEffect(() => {
		let isMounted = true;
		const initialFrame = getInitialAppSpinnerFrame(activeSpinner.variantId);

		setSpinnerFrameState(initialFrame, setSpinnerFrame, spinnerFrameRef);
		readSpinnerAngle(activeSpinner.variantId, initialFrame.angle)
			.then((angle) => {
				if (!isMounted || activeFidgetRef.current === FidgetId.Spinner) {
					return;
				}

				setSpinnerFrameState(
					{ angle, angularVelocity: 0 },
					setSpinnerFrame,
					spinnerFrameRef,
				);
			})
			.catch(console.error);

		return () => {
			isMounted = false;
		};
	}, [activeSpinner.variantId]);

	useEffect(() => {
		let isMounted = true;
		const initialAngle = getInitialAppKnobAngle(activeKnob.variantId);

		setKnobAngle(initialAngle);
		readKnobAngle(activeKnob.variantId, initialAngle)
			.then((angle) => {
				if (isMounted) {
					setKnobAngle(angle);
				}
			})
			.catch(console.error);

		return () => {
			isMounted = false;
		};
	}, [activeKnob.variantId]);

	useEffect(() => {
		return subscribeToSoundPreference(() => setIsSoundOn(isSoundEnabled()));
	}, []);

	useEffect(() => {
		let isMounted = true;

		Promise.all([
			readSelectedSpinnerVariantId(defaultSpinnerVariant.id),
			readSelectedKnobVariantId(defaultKnobVariant.id),
			readSelectedActiveFidgetId(),
		])
			.then(([spinnerVariantId, knobVariantId, activeFidgetId]) => {
				if (!isMounted) {
					return;
				}

				setActiveSpinner({ variantId: spinnerVariantId });
				setActiveKnob({ variantId: knobVariantId });
				setKnobAngle(getInitialAppKnobAngle(knobVariantId));
				setSpinnerFrameState(
					getInitialAppSpinnerFrame(spinnerVariantId),
					setSpinnerFrame,
					spinnerFrameRef,
				);

				if (!activeFidgetRef.current && activeFidgetId) {
					setActiveFidget(activeFidgetId);
				}
			})
			.catch(console.error);

		return () => {
			isMounted = false;
		};
	}, []);

	useEffect(() => {
		const isSpinnerHeroTransition =
			heroTransition?.fidgetId === FidgetId.Spinner;

		if ((activeFidget || openSelectorFidget) && !isSpinnerHeroTransition) {
			return;
		}

		const variant = getSpinnerVariant(activeSpinner.variantId);

		if (
			Math.abs(spinnerFrameRef.current.angularVelocity) <=
			variant.physics.stopSpeed
		) {
			return;
		}

		let previousTimestamp: number | null = null;
		let animationFrame = 0;

		const step = (timestamp: number) => {
			const previousFrame = spinnerFrameRef.current;
			const elapsedSeconds = Math.min(
				((previousTimestamp ?? timestamp) === timestamp
					? 0
					: timestamp - (previousTimestamp ?? timestamp)) / 1000,
				SPINNER_HOME_MAX_FRAME_SECONDS,
			);
			const nextFrame = advanceSpinnerFrames(
				previousFrame,
				elapsedSeconds,
				variant.physics,
			).frame;

			previousTimestamp = timestamp;

			if (Math.abs(nextFrame.angularVelocity) <= variant.physics.stopSpeed) {
				const stoppedFrame = { ...nextFrame, angularVelocity: 0 };

				setSpinnerFrameState(stoppedFrame, setSpinnerFrame, spinnerFrameRef);
				writeSpinnerAngle(stoppedFrame.angle, variant.id).catch(console.error);
				return;
			}

			setSpinnerFrameState(nextFrame, setSpinnerFrame, spinnerFrameRef);
			animationFrame = window.requestAnimationFrame(step);
		};

		animationFrame = window.requestAnimationFrame(step);

		return () => window.cancelAnimationFrame(animationFrame);
	}, [
		activeFidget,
		activeSpinner.variantId,
		heroTransition?.fidgetId,
		openSelectorFidget,
	]);

	useEffect(() => {
		if (!heroTransition || heroTransition.phase !== "measuring") {
			return;
		}

		let animationFrame = 0;
		let measureAttempts = 0;

		const measureTarget = () => {
			const targetElement = findHeroElement(heroTransition.fidgetId, "active");

			if (!targetElement && measureAttempts < HERO_MEASURE_RETRY_LIMIT) {
				measureAttempts += 1;
				animationFrame = window.requestAnimationFrame(measureTarget);
				return;
			}

			if (!targetElement) {
				setHeroTransition(null);
				return;
			}

			setHeroTransition((currentTransition) =>
				currentTransition?.phase === "measuring"
					? {
							...currentTransition,
							phase: "animating",
							toRect: getHeroRect(targetElement.getBoundingClientRect()),
						}
					: currentTransition,
			);
		};

		animationFrame = window.requestAnimationFrame(measureTarget);

		return () => window.cancelAnimationFrame(animationFrame);
	}, [heroTransition]);

	useEffect(() => {
		if (heroTransition?.phase !== "animating" || !heroTransition.toRect) {
			return;
		}

		const transitionTimeout = window.setTimeout(
			() =>
				setHeroTransition((currentTransition) =>
					currentTransition?.phase === "animating"
						? {
								...currentTransition,
								phase: "committing",
							}
						: currentTransition,
				),
			HERO_TRANSITION_DURATION_MS,
		);

		return () => window.clearTimeout(transitionTimeout);
	}, [heroTransition]);

	useEffect(() => {
		if (heroTransition?.phase !== "committing") {
			return;
		}

		const animationFrame = window.requestAnimationFrame(() => {
			setHeroTransition((currentTransition) =>
				currentTransition?.phase === "committing" ? null : currentTransition,
			);
		});

		return () => window.cancelAnimationFrame(animationFrame);
	}, [heroTransition]);

	const handleSpinnerFrameChange = useCallback((frame: SpinnerFrame) => {
		spinnerFrameRef.current = frame;

		if (activeFidgetRef.current !== FidgetId.Spinner) {
			setSpinnerFrame(frame);
		}
	}, []);

	const openFidget = useCallback(
		(fidgetId: FidgetId, sourceRect: DOMRect | null) => {
			startHeroTransition(fidgetId, sourceRect, setHeroTransition);
			setActiveFidget(fidgetId);
			setOpenSelectorFidget(null);
			writeSelectedActiveFidgetId(fidgetId).catch(console.error);
		},
		[],
	);

	const closeFidget = useCallback((fidgetId: FidgetId) => {
		const sourceElement = findHeroElement(fidgetId, "active");

		startHeroTransition(
			fidgetId,
			sourceElement?.getBoundingClientRect() ?? null,
			setHeroTransition,
		);

		if (fidgetId === FidgetId.Spinner) {
			setSpinnerFrameState(
				spinnerFrameRef.current,
				setSpinnerFrame,
				spinnerFrameRef,
			);
		}

		setOpenSelectorFidget(null);
		setActiveFidget(null);
	}, []);

	return (
		<main className="nudge-app">
			<PageTransition heroPhase={heroTransition?.phase} pageKey={pageKey}>
				{activeFidget ? (
					renderFidget(
						activeFidget,
						activeSpinner,
						setActiveSpinner,
						activeKnob,
						setActiveKnob,
						openSelectorFidget,
						setOpenSelectorFidget,
						closeFidget,
						hiddenHeroId,
						knobAngle,
						setKnobAngle,
						spinnerFrame,
						handleSpinnerFrameChange,
					)
				) : (
					<HomeScreen
						fidgets={fidgets}
						hiddenHeroId={hiddenHeroId}
						onSelect={openFidget}
						isSoundOn={isSoundOn}
						onToggleSound={() => setSoundEnabled(!isSoundOn)}
						knobVariantId={activeKnob.variantId}
						knobAngle={knobAngle}
						spinnerFrame={spinnerFrame}
						spinnerVariantId={activeSpinner.variantId}
					/>
				)}
			</PageTransition>
			<HeroVisualLayer
				activeKnob={activeKnob}
				activeSpinner={activeSpinner}
				knobAngle={knobAngle}
				spinnerFrame={spinnerFrame}
				transition={heroTransition}
			/>
		</main>
	);
}

function PageTransition({ children, heroPhase, pageKey }: PageTransitionProps) {
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

			if (heroPhase) {
				return [
					{
						content: children,
						key: pageKey,
						status: "active" as const,
					},
				];
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
	}, [children, heroPhase, pageKey]);

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
		<div
			className={getPageStackClassName(heroPhase)}
			data-hero-phase={heroPhase}
		>
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

function getPageStackClassName(heroPhase?: HeroTransitionPhase) {
	return heroPhase ? "nudge-page-stack is-hero-owned" : "nudge-page-stack";
}

function isExitingPage(page: TransitionPage) {
	return page.status === "exiting";
}

function HeroVisualLayer({
	activeKnob,
	activeSpinner,
	knobAngle,
	spinnerFrame,
	transition,
}: HeroVisualLayerProps) {
	if (!transition) {
		return null;
	}

	const currentRect =
		transition.phase !== "measuring" && transition.toRect
			? transition.toRect
			: transition.fromRect;

	return (
		<div
			className="nudge-hero-overlay"
			data-testid={`hero-transition-${transition.fidgetId}`}
			data-hero-state={transition.phase}
			style={getHeroOverlayStyle(currentRect)}
		>
			{renderHeroOverlayContent(
				transition.fidgetId,
				activeSpinner,
				activeKnob,
				knobAngle,
				spinnerFrame,
			)}
		</div>
	);
}

function renderHeroOverlayContent(
	fidgetId: HeroFidgetId,
	activeSpinner: ActiveSpinnerSelection,
	activeKnob: ActiveKnobSelection,
	knobAngle: number,
	spinnerFrame: SpinnerFrame,
) {
	switch (fidgetId) {
		case FidgetId.Spinner: {
			const variant = getSpinnerVariant(activeSpinner.variantId);

			return (
				<SpinnerRotor
					angle={spinnerFrame.angle}
					color={variant.color}
					variant={variant}
				/>
			);
		}
		case FidgetId.Knob: {
			const variant = getKnobVariant(activeKnob.variantId);

			return <KnobDial angle={knobAngle} disabled variant={variant} />;
		}
		default:
			return null;
	}
}

function renderFidget(
	activeFidget: FidgetId,
	activeSpinner: ActiveSpinnerSelection,
	setActiveSpinner: (selection: ActiveSpinnerSelection) => void,
	activeKnob: ActiveKnobSelection,
	setActiveKnob: (selection: ActiveKnobSelection) => void,
	openSelectorFidget: FidgetId | null,
	setOpenSelectorFidget: (fidgetId: FidgetId | null) => void,
	closeFidget: (fidgetId: FidgetId) => void,
	hiddenHeroId: HeroFidgetId | null,
	knobAngle: number,
	onKnobAngleChange: (angle: number) => void,
	spinnerFrame: SpinnerFrame,
	onSpinnerFrameChange: (frame: SpinnerFrame) => void,
) {
	switch (activeFidget) {
		case FidgetId.ToggleSwitch:
			return (
				<ToggleSwitchFidget onBack={() => closeFidget(FidgetId.ToggleSwitch)} />
			);
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
					heroHidden={hiddenHeroId === FidgetId.Spinner}
					initialFrame={spinnerFrame}
					onBack={() => closeFidget(FidgetId.Spinner)}
					onFrameChange={onSpinnerFrameChange}
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
					heroHidden={hiddenHeroId === FidgetId.Knob}
					initialAngle={knobAngle}
					onBack={() => closeFidget(FidgetId.Knob)}
					onAngleChange={onKnobAngleChange}
					onOpenSelector={() => setOpenSelectorFidget(FidgetId.Knob)}
					variantId={activeKnob.variantId}
				/>
			);
		case FidgetId.BubblePop:
			return <BubblePopFidget onBack={() => closeFidget(FidgetId.BubblePop)} />;
		case FidgetId.PatternTap:
			return <PatternFidget onBack={() => closeFidget(FidgetId.PatternTap)} />;
		case FidgetId.Counter:
			return <CounterFidget onBack={() => closeFidget(FidgetId.Counter)} />;
		default:
			return null;
	}
}

function startHeroTransition(
	fidgetId: FidgetId,
	sourceRect: DOMRect | null,
	setHeroTransition: (transition: HeroTransitionState | null) => void,
) {
	if (!isHeroFidgetId(fidgetId) || !sourceRect || prefersReducedMotion()) {
		setHeroTransition(null);
		return;
	}

	setHeroTransition({
		fidgetId,
		fromRect: getHeroRect(sourceRect),
		phase: "measuring",
		toRect: null,
	});
}

function findHeroElement(
	fidgetId: HeroFidgetId | FidgetId,
	status: TransitionPageStatus,
) {
	const heroElements = Array.from(
		document.querySelectorAll<HTMLElement>(`[data-fidget-hero="${fidgetId}"]`),
	);

	return (
		heroElements.find((heroElement) =>
			heroElement
				.closest(".nudge-page-transition")
				?.classList.contains(`is-${status}`),
		) ?? null
	);
}

function setSpinnerFrameState(
	frame: SpinnerFrame,
	setSpinnerFrame: (frame: SpinnerFrame) => void,
	spinnerFrameRef: MutableRefObject<SpinnerFrame>,
) {
	spinnerFrameRef.current = frame;
	setSpinnerFrame(frame);
}

function getInitialAppSpinnerFrame(variantId: SpinnerVariantId): SpinnerFrame {
	return {
		angle: readInitialSpinnerAngle(variantId),
		angularVelocity: 0,
	};
}

function getInitialAppKnobAngle(variantId: KnobVariantId) {
	const variant = getKnobVariant(variantId);

	return readInitialKnobAngle(variantId, variant.detentInterval * 2);
}

function getHeroOverlayStyle(rect: HeroRect): CSSProperties {
	return {
		height: `${rect.height}px`,
		transform: `translate3d(${rect.left}px, ${rect.top}px, 0)`,
		width: `${rect.width}px`,
	};
}

function getHeroRect(rect: DOMRect): HeroRect {
	return {
		height: rect.height,
		left: rect.left,
		top: rect.top,
		width: rect.width,
	};
}

function isHeroFidgetId(fidgetId: FidgetId): fidgetId is HeroFidgetId {
	return fidgetId === FidgetId.Spinner || fidgetId === FidgetId.Knob;
}

function prefersReducedMotion() {
	return (
		typeof window !== "undefined" &&
		typeof window.matchMedia === "function" &&
		window.matchMedia("(prefers-reduced-motion: reduce)").matches
	);
}
