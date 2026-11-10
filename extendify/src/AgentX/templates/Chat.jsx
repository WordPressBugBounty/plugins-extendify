import {
	chatScaleFor,
	chatWidthBounds,
	chatWidthFor,
} from '@agentx/lib/chat-width';
import { shellDocument } from '@agentx/lib/shell-document';
import { useShellStore } from '@agentx/state/shell';
import { MOVE } from '@agentx/templates/Canvas';
import { useEffect, useRef, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { motion, useReducedMotion } from 'motion/react';

const STEP = 16;

const shellWindow = () => shellDocument().defaultView ?? window;

const useWindowWidth = () => {
	const [width, setWidth] = useState(() => shellWindow().innerWidth);
	useEffect(() => {
		const view = shellWindow();
		const update = () => setWidth(view.innerWidth);
		update();
		view.addEventListener('resize', update);
		return () => view.removeEventListener('resize', update);
	}, []);
	return width;
};

export const useChatWidth = () => {
	const scale = useShellStore((state) => state.chatScale);
	return chatWidthFor(scale, useWindowWidth());
};

const Grip = ({ width }) => {
	const setChatScale = useShellStore((state) => state.setChatScale);
	const { min, max } = chatWidthBounds(window.innerWidth);
	const resize = (to) => setChatScale(chatScaleFor(to, window.innerWidth));

	const onPointerDown = (event) => {
		if (event.button !== 0) return;
		event.preventDefault();
		const grip = event.currentTarget;
		// Keeps the drag when the pointer crosses the site frame.
		grip.setPointerCapture?.(event.pointerId);
		const from = event.clientX;
		const onMove = (moving) => resize(width + moving.clientX - from);
		const onEnd = () => {
			grip.removeEventListener('pointermove', onMove);
			grip.removeEventListener('pointerup', onEnd);
			grip.removeEventListener('pointercancel', onEnd);
		};
		grip.addEventListener('pointermove', onMove);
		grip.addEventListener('pointerup', onEnd);
		grip.addEventListener('pointercancel', onEnd);
	};

	const onKeyDown = (event) => {
		const by = { ArrowLeft: -STEP, ArrowRight: STEP }[event.key];
		if (!by) return;
		event.preventDefault();
		resize(width + by);
	};

	return (
		// biome-ignore lint/a11y/useSemanticElements: an <hr> can't hold focus or a value, which a draggable separator needs.
		<div
			role="separator"
			tabIndex={0}
			aria-orientation="vertical"
			aria-controls="extendify-agentx-chat"
			aria-valuenow={width}
			aria-valuemin={min}
			aria-valuemax={max}
			aria-label={
				// translators: Screen reader label for the handle on the edge of the AI Agent's chat that drags the chat wider or narrower.
				__('Resize the chat', 'extendify-local')
			}
			onPointerDown={onPointerDown}
			onKeyDown={onKeyDown}
			onDoubleClick={() => setChatScale(null)}
			className="agentx-focus group absolute inset-y-0 right-0 flex w-agentx-gap cursor-col-resize touch-none items-center justify-center rounded-agentx-control"
		>
			<span className="h-10 w-1 rounded-full bg-agentx-grip opacity-0 transition group-hover:opacity-100 group-focus-visible:bg-agentx-grip-active group-focus-visible:opacity-100 group-active:bg-agentx-grip-active group-active:opacity-100" />
		</div>
	);
};

// The gutter on the site's right, so the minimized site sits evenly.
const GUTTER = 16;

// Sized and moved like the chat column, so the top bar's cells line up with the chat and the site.
export const ChatCell = ({ minimized, children }) => {
	const reduceMotion = useReducedMotion();
	const width = useChatWidth();
	return (
		<motion.div
			initial={false}
			animate={{ width: minimized ? GUTTER : 'auto' }}
			transition={reduceMotion ? { duration: 0 } : MOVE}
			aria-hidden={minimized || undefined}
			className="shrink-0 overflow-hidden"
		>
			<motion.div
				initial={false}
				animate={{ opacity: minimized ? 0 : 1 }}
				transition={
					reduceMotion
						? { duration: 0 }
						: { duration: 0.2, delay: minimized ? 0 : 0.25 }
				}
				className="pr-agentx-gap pl-5"
			>
				<div style={{ width }}>{children}</div>
			</motion.div>
		</motion.div>
	);
};

export const Chat = ({ chat, minimized, className = '' }) => {
	const reduceMotion = useReducedMotion();
	const ref = useRef(null);
	const width = useChatWidth();

	useEffect(() => {
		ref.current.inert = minimized;
	}, [minimized]);

	return (
		<motion.div
			initial={false}
			animate={{ width: minimized ? GUTTER : 'auto' }}
			transition={reduceMotion ? { duration: 0 } : MOVE}
			className="shrink-0 overflow-hidden"
		>
			<motion.div
				ref={ref}
				initial={false}
				animate={{ opacity: minimized ? 0 : 1 }}
				transition={
					reduceMotion
						? { duration: 0 }
						: { duration: 0.2, delay: minimized ? 0 : 0.25 }
				}
				className="relative h-full pr-agentx-gap pl-5"
			>
				<div className={`h-full ${className}`} style={{ width }}>
					{chat}
				</div>
				{minimized ? null : <Grip width={width} />}
			</motion.div>
		</motion.div>
	);
};
