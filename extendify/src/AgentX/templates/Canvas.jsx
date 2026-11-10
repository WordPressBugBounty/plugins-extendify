import { PHONE_HEIGHT, PHONE_WIDTH } from '@agentx/lib/fit-site';
import { useShellStore } from '@agentx/state/shell';
import { useEffect, useRef, useState } from '@wordpress/element';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';

// Real sizes, not Motion's layout transform, which would stretch the site into the corner's shape.
const FULL = { width: '100%', height: '100%', right: 0, bottom: 0 };
const INSET = 16;
// Ease-in-out, since the site and the chat only move and resize on screen.
export const MOVE = { duration: 0.4, ease: [0.645, 0.045, 0.355, 1] };

// Grows with the canvas, so a wide window doesn't get a tiny corner.
const cornerOf = (canvas) => {
	const width = Math.max(250, Math.round(canvas.width * 0.25));
	const height = Math.min(Math.round(width * 1.2), canvas.height - INSET * 2);
	return {
		width,
		height: Math.max(300, height),
		right: INSET,
		bottom: INSET,
	};
};

const phoneOf = (canvas) => {
	const width = Math.min(PHONE_WIDTH, canvas.width);
	const height = Math.min(PHONE_HEIGHT, canvas.height - INSET * 2);
	return {
		width,
		height,
		right: (canvas.width - width) / 2,
		bottom: (canvas.height - height) / 2,
	};
};

const useSize = (ref) => {
	const [size, setSize] = useState({ width: 0, height: 0 });
	useEffect(() => {
		const observer = new ResizeObserver(([{ contentRect }]) =>
			setSize({ width: contentRect.width, height: contentRect.height }),
		);
		observer.observe(ref.current);
		return () => observer.disconnect();
	}, [ref]);
	return size;
};

export const Canvas = ({ site, tool, toggle, rounded }) => {
	const reduceMotion = useReducedMotion();
	const ref = useRef(null);
	const size = useSize(ref);
	const view = useShellStore((state) => state.siteView);
	const places = { full: FULL, phone: phoneOf(size), corner: cornerOf(size) };
	// Mounting with a tool open skips the move; waiting would hide the tool.
	const [landed, setLanded] = useState(Boolean(tool));

	return (
		<div ref={ref} className="relative min-h-0 flex-1">
			{toggle && !tool && (
				// Its translate makes it a layer of its own, which the site would cover without one.
				<div className="absolute bottom-full left-1/2 z-10 mb-3 flex h-10 -translate-x-1/2 items-center">
					{toggle}
				</div>
			)}
			<AnimatePresence>
				{tool && landed && (
					<motion.div
						key="tool"
						initial={{ opacity: 0 }}
						animate={{ opacity: 1, transition: { delay: 0.1, duration: 0.3 } }}
						exit={{ opacity: 0, transition: { duration: 0.15 } }}
						className="absolute inset-0 flex items-start justify-start"
					>
						{tool}
					</motion.div>
				)}
			</AnimatePresence>
			<motion.div
				id="extendify-agentx-site-box"
				initial={false}
				variants={places}
				animate={tool ? 'corner' : view === 'phone' ? 'phone' : 'full'}
				transition={reduceMotion ? { duration: 0 } : MOVE}
				// A resize also animates the corner, and resetting here would hide the tool.
				onAnimationStart={() => {
					if (!tool) setLanded(false);
				}}
				// An interrupted move still reports complete.
				onAnimationComplete={(target) =>
					setLanded(target === 'corner' && Boolean(tool))
				}
				className={`absolute overflow-hidden bg-agentx-site shadow-(--agentx-site-shadow) transition-[border-radius] duration-400 ${tool || view === 'phone' ? 'rounded-agentx-site' : rounded}`}
			>
				{site}
			</motion.div>
		</div>
	);
};
