import "./CounterFidget.scss";

import CounterFidgetSurface from "components/CounterFidgetSurface";
import FidgetShell from "components/FidgetShell";
import vibrate from "lib/haptics";
import sounds from "lib/sounds";
import store from "lib/store";
import { Minus, RotateCcw } from "lucide-react";
import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import { useEffect, useRef, useState } from "react";

const COUNTER_COUNT_KEY = "nudge.counter.count";

interface CounterFidgetProps {
	onBack: () => void;
}

export default function CounterFidget({ onBack }: CounterFidgetProps) {
	const hasCountChangedRef = useRef(false);
	const [count, setCount] = useState(0);

	useEffect(() => {
		let isMounted = true;

		readCounterCount()
			.then((storedCount) => {
				if (!isMounted || hasCountChangedRef.current) {
					return;
				}

				setCount(storedCount);
			})
			.catch(console.error);

		return () => {
			isMounted = false;
		};
	}, []);

	return (
		<FidgetShell
			title="Counter"
			accent="#78e4c4"
			onBack={onBack}
			headerEnd={
				<CounterActions
					count={count}
					onDecrease={() => decreaseCounter(setCount, hasCountChangedRef)}
					onReset={() => resetCounter(setCount, hasCountChangedRef)}
				/>
			}
		>
			<div className="counter-fidget-screen">
				<div className="counter-fidget-stage">
					<CounterFidgetSurface
						onCount={() => incrementCounter(setCount, hasCountChangedRef)}
					/>
				</div>
				<button
					type="button"
					className="counter-count-button"
					onClick={() => incrementCounter(setCount, hasCountChangedRef)}
					aria-label={`Count ${count}. Tap to add one`}
				>
					{count}
				</button>
			</div>
		</FidgetShell>
	);
}

function CounterActions({
	count,
	onDecrease,
	onReset,
}: {
	count: number;
	onDecrease: () => void;
	onReset: () => void;
}) {
	return (
		<>
			<button
				type="button"
				className="fidget-shell-action"
				onClick={onDecrease}
				disabled={count === 0}
				aria-label="Decrease counter"
				title="Decrease counter"
			>
				<Minus size={21} strokeWidth={2.5} aria-hidden="true" />
			</button>
			<button
				type="button"
				className="fidget-shell-action"
				onClick={onReset}
				disabled={count === 0}
				aria-label="Reset counter"
				title="Reset counter"
			>
				<RotateCcw size={20} strokeWidth={2.35} aria-hidden="true" />
			</button>
		</>
	);
}

function incrementCounter(
	setCount: Dispatch<SetStateAction<number>>,
	hasCountChangedRef: MutableRefObject<boolean>,
) {
	hasCountChangedRef.current = true;
	setCount((count) => updateCounterCount(count + 1));
	vibrate(5);
	sounds.tap();
}

function decreaseCounter(
	setCount: Dispatch<SetStateAction<number>>,
	hasCountChangedRef: MutableRefObject<boolean>,
) {
	hasCountChangedRef.current = true;
	setCount((count) => updateCounterCount(Math.max(0, count - 1)));
	vibrate(4);
	sounds.tap();
}

function resetCounter(
	setCount: Dispatch<SetStateAction<number>>,
	hasCountChangedRef: MutableRefObject<boolean>,
) {
	hasCountChangedRef.current = true;
	setCount(updateCounterCount(0));
	vibrate([8, 24, 8]);
	sounds.toggle();
}

async function readCounterCount() {
	const storedCount = await store.get<number>(COUNTER_COUNT_KEY);
	return parseCounterCount(storedCount);
}

function updateCounterCount(count: number) {
	const normalizedCount = parseCounterCount(count);
	store.set(COUNTER_COUNT_KEY, normalizedCount).catch(console.error);
	return normalizedCount;
}

function parseCounterCount(value: unknown) {
	const count = Number(value);
	return Number.isInteger(count) && count > 0 ? count : 0;
}
