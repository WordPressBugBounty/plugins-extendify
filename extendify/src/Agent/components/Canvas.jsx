import { usePortal } from '@agent/hooks/usePortal';
import { useWhenFinishedToolProps } from '@agent/hooks/useWhenFinishedToolProps';
import {
	CANVAS_CONFETTI,
	confettiIn,
	dropConfetti,
	FALLING,
} from '@agent/lib/confetti';
import { useGlobalStore } from '@agent/state/global';
import { useWorkflowStore } from '@agent/state/workflows';
import {
	createElement,
	createPortal,
	useEffect,
	useRef,
} from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { close, Icon } from '@wordpress/icons';
import { AnimatePresence, motion, useIsPresent } from 'framer-motion';

export const CANVAS_PANE_WIDTH = 384;
const CANVAS_SIZE = {
	width: 768,
	height: 600,
	maxWidth: '100%',
	maxHeight: '100%',
};
const SLIDE_TIME = 300;
const CANVAS_CLASS = 'extendify-agent-canvas-open';
const BLUR_CLASS = 'extendify-agent-canvas-blurred';
export const DOT_GRID = {
	backgroundImage:
		'radial-gradient(circle, rgb(0 0 0 / 0.12) 1px, transparent 1px)',
	backgroundSize: '12px 12px',
};

const CloseCanvas = ({ onClick }) => (
	<button
		type="button"
		className="absolute end-2 top-2 z-20 flex h-6 w-6 items-center justify-center rounded-sm border-0 bg-transparent text-gray-900 outline-hidden ring-design-main hover:opacity-80 focus:shadow-none focus:outline-hidden focus:ring-2 focus-visible:outline-design-main"
		onClick={onClick}
	>
		<Icon
			className="pointer-events-none fill-current leading-none"
			icon={close}
			size={18}
		/>
		<span className="sr-only">{__('Close', 'extendify-local')}</span>
	</button>
);

const Celebration = () => {
	const canvas = useRef(null);

	useEffect(() => {
		const shoot = confettiIn(canvas.current);
		let stop = () => {};
		const burst = ({ detail }) => {
			stop();
			stop = dropConfetti(shoot, detail ?? FALLING);
		};
		window.addEventListener(CANVAS_CONFETTI, burst);
		return () => {
			window.removeEventListener(CANVAS_CONFETTI, burst);
			stop();
		};
	}, []);

	return (
		<canvas
			ref={canvas}
			className="pointer-events-none absolute inset-0 z-0 h-full w-full"
		/>
	);
};

// The mobile pill is a body sibling, so inerting every child kills it.
const PAGE = '#wpwrap, .wp-site-blocks, #wpadminbar, #extendify-toolbar';

// A trap scoped to the surface would lock the user out of the chat.
const inertPage = () => {
	const page = [...document.querySelectorAll(PAGE)].filter(
		(el) => !el.hasAttribute('inert'),
	);
	for (const el of page) el.setAttribute('inert', '');

	return () => {
		for (const el of page) el.removeAttribute('inert');
	};
};

const useCanvasTool = () => {
	const { getWorkflow } = useWorkflowStore();
	const props = useWhenFinishedToolProps();
	const { component, canvas } = getWorkflow()?.whenFinished ?? {};
	if (!canvas || !component || !props?.id) return null;
	return { component, props };
};

export const useCanvasWorkflow = () =>
	Boolean(useWorkflowStore().getWorkflow()?.whenFinished?.canvas);

export const useCanvasOpen = () => Boolean(useCanvasTool());

export const CanvasPane = () => {
	const canvas = useCanvasTool();

	return (
		<AnimatePresence>
			{canvas ? (
				<motion.div
					role="dialog"
					aria-label={__('Agent canvas', 'extendify-local')}
					className="relative z-0 min-h-0 shrink-0"
					style={{ width: CANVAS_PANE_WIDTH }}
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
					transition={{ duration: SLIDE_TIME / 1000, ease: 'easeInOut' }}
				>
					<CloseCanvas onClick={canvas.props.onCancel} />
					<Celebration />
					<div className="relative z-10 h-full overflow-auto px-4 py-12">
						{/* The dotted background must not slide in with the component. */}
						<motion.div
							className="h-full"
							initial={{ x: -CANVAS_PANE_WIDTH }}
							animate={{ x: 0 }}
							exit={{ x: -CANVAS_PANE_WIDTH }}
							transition={{ duration: SLIDE_TIME / 1000, ease: 'easeInOut' }}
						>
							{createElement(canvas.component, canvas.props)}
						</motion.div>
					</div>
				</motion.div>
			) : null}
		</AnimatePresence>
	);
};

// Calling usePortal here would leave a mount node behind with no canvas open.
export const Canvas = () => {
	const canvas = useCanvasTool();

	return (
		<AnimatePresence>
			{canvas ? <CanvasOverlay canvas={canvas} /> : null}
		</AnimatePresence>
	);
};

const CanvasOverlay = ({ canvas }) => {
	const { isMobile, mode } = useGlobalStore();
	const mountNode = usePortal('extendify-agent-canvas-mount');
	const isPresent = useIsPresent();

	useEffect(inertPage, []);

	useEffect(() => {
		document.body.classList.add(CANVAS_CLASS);
		// The page has to paint unblurred once, or there is nothing to ease from.
		const frame = requestAnimationFrame(() =>
			document.body.classList.add(BLUR_CLASS),
		);
		return () => {
			cancelAnimationFrame(frame);
			document.body.classList.remove(CANVAS_CLASS, BLUR_CLASS);
		};
	}, []);

	// Cleanup runs after the exit, too late for the blur to ease out with it.
	useEffect(() => {
		if (!isPresent) document.body.classList.remove(BLUR_CLASS);
	}, [isPresent]);

	if (!mountNode) return null;

	const fade = {
		initial: { opacity: 0 },
		animate: { opacity: 1 },
		exit: { opacity: 0 },
		transition: { duration: SLIDE_TIME / 1000, ease: 'easeInOut' },
	};
	// Scrim and surface both clear the admin bar (99999) and stay under the panel (999999).
	const scrim = (
		<motion.div
			{...fade}
			data-extendify-agent-scrim
			className="fixed inset-0 z-[100000] bg-black/60"
		/>
	);
	const embedded = mode === 'docked-left' && !isMobile;

	return createPortal(
		<>
			{scrim}
			{embedded ? null : (
				<motion.div
					{...fade}
					className="pointer-events-none fixed inset-0 z-[100001] overflow-auto"
				>
					<div className="pointer-events-auto flex min-h-full items-center justify-center px-4 py-8">
						<div
							role="dialog"
							aria-label={__('Agent canvas', 'extendify-local')}
							className="relative overflow-hidden rounded-2xl bg-gray-50 pt-12 shadow-lg"
							style={{ ...DOT_GRID, ...CANVAS_SIZE }}
						>
							<CloseCanvas onClick={canvas.props.onCancel} />
							<Celebration />
							<div className="relative z-10 h-full overflow-auto px-4 pb-8">
								{createElement(canvas.component, canvas.props)}
							</div>
						</div>
					</div>
				</motion.div>
			)}
		</>,
		mountNode,
	);
};
