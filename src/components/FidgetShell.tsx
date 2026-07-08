import "./FidgetShell.scss";

import { ChevronLeft } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";

interface FidgetShellProps {
	title: string;
	accent: string;
	children: ReactNode;
	className?: string;
	headerEnd?: ReactNode;
	headerStart?: ReactNode;
	onBack: () => void;
}

interface FidgetShellStyle extends CSSProperties {
	"--fidget-accent": string;
}

export default function FidgetShell({
	title,
	accent,
	children,
	className,
	headerEnd,
	headerStart,
	onBack,
}: FidgetShellProps) {
	return (
		<section
			className={getShellClassName(className)}
			style={getShellStyle(accent)}
		>
			<header className="fidget-shell-header">
				<div className="fidget-shell-header-start">
					<button
						type="button"
						className="fidget-shell-back"
						onClick={onBack}
						aria-label="Back to fidgets"
					>
						<ChevronLeft size={28} strokeWidth={2.4} aria-hidden="true" />
					</button>
					{headerStart}
				</div>
				<h1 className="fidget-shell-title">{title}</h1>
				<div className="fidget-shell-header-end">{headerEnd}</div>
			</header>
			<div className="fidget-shell-body">{children}</div>
		</section>
	);
}

function getShellStyle(accent: string): FidgetShellStyle {
	return { "--fidget-accent": accent };
}

function getShellClassName(className?: string) {
	return className ? `fidget-shell ${className}` : "fidget-shell";
}
