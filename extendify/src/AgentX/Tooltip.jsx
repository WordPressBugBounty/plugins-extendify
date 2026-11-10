import {
	createPortal,
	useEffect,
	useId,
	useLayoutEffect,
	useRef,
	useState,
} from '@wordpress/element';
import { create } from 'zustand';

// One open at a time; once one has shown, the next opens at once, so a toolbar doesn't make you wait twice.
const useTooltips = create(() => ({ open: null, closedAt: 0 }));

// WordPress's own tooltip delay, so ours open like the rest of the admin's.
const DELAY = 700;
const WARM = 2000;
const GAP = 6;

const warm = () => {
	const { open, closedAt } = useTooltips.getState();
	return open !== null || Date.now() - closedAt < WARM;
};

const MAC = /Mac|iPhone|iPad/.test(window.navigator.platform);

export const shortcut = (key, { shift = false } = {}) =>
	MAC
		? `${shift ? '⇧' : ''}⌘${key.toUpperCase()}`
		: `Ctrl+${shift ? 'Shift+' : ''}${key.toUpperCase()}`;

// The button keeps its own aria-label, so screen readers hear the name once.
export const Tooltip = ({ text, keys, className = '', children }) => {
	const id = useId();
	const anchor = useRef(null);
	const tip = useRef(null);
	const timer = useRef(null);
	const [shown, setShown] = useState(null);
	const open = useTooltips((state) => state.open);

	const hide = () => {
		clearTimeout(timer.current);
		if (useTooltips.getState().open === id) {
			useTooltips.setState({ open: null, closedAt: Date.now() });
		}
		setShown(null);
	};

	const show = () => {
		clearTimeout(timer.current);
		const instant = warm();
		timer.current = setTimeout(
			() => {
				const rect = anchor.current?.getBoundingClientRect();
				if (!rect) return;
				useTooltips.setState({ open: id });
				setShown({
					instant,
					rect,
					above:
						rect.bottom + GAP + 32 >
						anchor.current.ownerDocument.defaultView.innerHeight,
				});
			},
			instant ? 0 : DELAY,
		);
	};

	useEffect(() => {
		if (shown && open !== id) setShown(null);
	}, [open]);

	useEffect(() => () => hide(), []);

	useEffect(() => {
		if (!shown) return;
		const onEscape = (event) => event.key === 'Escape' && hide();
		document.addEventListener('keydown', onEscape, true);
		return () => document.removeEventListener('keydown', onEscape, true);
	}, [shown]);

	// Centered on the button, kept inside the window once its width is known.
	useLayoutEffect(() => {
		if (!shown || !tip.current) return;
		const { width } = tip.current.getBoundingClientRect();
		const center = shown.rect.left + shown.rect.width / 2;
		const left = Math.min(
			Math.max(center - width / 2, 8),
			tip.current.ownerDocument.defaultView.innerWidth - width - 8,
		);
		tip.current.style.left = `${left}px`;
	}, [shown]);

	return (
		// biome-ignore lint/a11y/noStaticElementInteractions: it only shows the tooltip; the control inside takes the input.
		<span
			ref={anchor}
			className={`inline-flex ${className}`}
			onPointerEnter={(event) => event.pointerType !== 'touch' && show()}
			onPointerLeave={hide}
			onPointerDown={hide}
			// A key press is a press too, and the button may move, as the chat toggle does.
			onKeyDown={(event) =>
				(event.key === 'Enter' || event.key === ' ') && hide()
			}
			onFocus={(event) => event.target.matches(':focus-visible') && show()}
			onBlur={hide}
		>
			{children}
			{shown &&
				createPortal(
					<span
						ref={tip}
						role="tooltip"
						aria-hidden="true"
						style={{
							top: shown.above ? shown.rect.top - GAP : shown.rect.bottom + GAP,
							left: shown.rect.left,
						}}
						className={`pointer-events-none fixed z-100001 flex items-center gap-1.5 rounded-agentx-tooltip bg-agentx-tooltip px-2 py-1 text-agentx-tooltip-label whitespace-nowrap text-agentx-tooltip-ink shadow-(--agentx-tooltip-shadow) ${shown.above ? '-translate-y-full origin-bottom' : 'origin-top'} ${shown.instant ? '' : 'animate-agentx-tooltip motion-reduce:animate-none'}`}
					>
						{text}
						{keys && (
							<kbd className="font-agentx text-agentx-tooltip-muted">
								{keys}
							</kbd>
						)}
					</span>,
					// wp-admin has no shell, and outside .extendify-agentx none of its styles apply.
					document.getElementById('extendify-agentx-shell') ??
						anchor.current.closest('.extendify-agentx') ??
						document.body,
				)}
		</span>
	);
};
