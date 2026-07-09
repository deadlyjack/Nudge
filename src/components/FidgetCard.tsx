import "./FidgetCard.scss";

import type { CSSProperties, KeyboardEvent, ReactNode } from "react";

import type { FidgetDefinition, FidgetId } from "types/fidgets";

interface FidgetCardProps {
	children: ReactNode;
	fidget: FidgetDefinition;
	onSelect: (id: FidgetId, sourceRect: DOMRect | null) => void;
}

interface FidgetCardStyle extends CSSProperties {
	"--fidget-accent": string;
}

export default function FidgetCard({
	children,
	fidget,
	onSelect,
}: FidgetCardProps) {
	return (
		// biome-ignore lint/a11y/useSemanticElements: Fidget cards contain disabled fidget buttons, so a native button would create invalid nested buttons.
		<div
			role="button"
			tabIndex={0}
			className="fidget-card"
			style={getCardStyle(fidget.accent)}
			onClick={(event) =>
				selectFidget(event.currentTarget, fidget.id, onSelect)
			}
			onKeyDown={(event) => selectWithKeyboard(event, fidget.id, onSelect)}
			aria-label={`Open ${fidget.title}`}
		>
			{children}
		</div>
	);
}

function getCardStyle(accent: string): FidgetCardStyle {
	return { "--fidget-accent": accent };
}

function selectWithKeyboard(
	event: KeyboardEvent<HTMLDivElement>,
	fidgetId: FidgetId,
	onSelect: (id: FidgetId, sourceRect: DOMRect | null) => void,
) {
	if (event.key !== "Enter" && event.key !== " ") {
		return;
	}

	event.preventDefault();
	selectFidget(event.currentTarget, fidgetId, onSelect);
}

function selectFidget(
	card: HTMLElement,
	fidgetId: FidgetId,
	onSelect: (id: FidgetId, sourceRect: DOMRect | null) => void,
) {
	const heroElement = card.querySelector<HTMLElement>("[data-fidget-hero]");

	onSelect(fidgetId, heroElement?.getBoundingClientRect() ?? null);
}
