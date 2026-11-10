import { Caught } from '@agentx/Caught';
import { Chat } from '@agentx/chat/Chat';
import { PRESS } from '@agentx/chat/styles';
import { watchKeyboardMode } from '@agentx/lib/keyboard';
import { BrandBar, PartnerLogo } from '@agentx/PartnerLogo';
import { Tooltip } from '@agentx/Tooltip';
import { useEffect, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { closeSmall, dragHandle, Icon } from '@wordpress/icons';

// Their own keys, so opening it in wp-admin leaves the agent on the site as it was.
const OPEN = 'extendify-agentx-admin-open';
const FRAME = 'extendify-agentx-admin-frame';
const LAUNCHER = '#wp-admin-bar-extendify-agentx > .ab-item';
const PANEL = 'extendify-agentx-admin-panel';
// WordPress's mobile breakpoint, where the agent takes the whole screen.
const PHONE = '(max-width: 782px)';
const GAP = 16;
const MIN_WIDTH = 320;
const MIN_HEIGHT = 400;
const MAX_WIDTH = 640;

const stored = (key) => {
	try {
		return window.localStorage.getItem(key);
	} catch {
		return null;
	}
};

const store = (key, value) => {
	try {
		if (value === null) window.localStorage.removeItem(key);
		else window.localStorage.setItem(key, value);
	} catch {
		// Blocked storage only costs the state across a page load.
	}
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const barHeight = () =>
	document.getElementById('wpadminbar')?.offsetHeight ?? 0;

// The window may have shrunk since it was placed, so it's put back on screen.
const inView = ({ x, y, width, height }) => {
	const top = barHeight();
	const w = clamp(width, MIN_WIDTH, Math.min(MAX_WIDTH, window.innerWidth));
	const h = clamp(height, MIN_HEIGHT, window.innerHeight - top);
	return {
		width: w,
		height: h,
		x: clamp(x, 0, window.innerWidth - w),
		y: clamp(y, top, window.innerHeight - h),
	};
};

// Bottom right, as wide as the agent's column on the site.
const startingFrame = () => {
	const width = 424;
	const height = Math.min(680, window.innerHeight - barHeight() - GAP * 2);
	return {
		width,
		height,
		x: window.innerWidth - width - GAP,
		y: window.innerHeight - height - GAP,
	};
};

const rememberedFrame = () => {
	try {
		return JSON.parse(stored(FRAME)) ?? startingFrame();
	} catch {
		return startingFrame();
	}
};

const moved = (start, dx, dy) => ({
	...start,
	x: start.x + dx,
	y: start.y + dy,
});

// From the top left corner, so the bottom right stays where it was.
const resized = (start, dx, dy) => {
	const width = clamp(start.width - dx, MIN_WIDTH, MAX_WIDTH);
	const height = clamp(start.height - dy, MIN_HEIGHT, window.innerHeight);
	return {
		width,
		height,
		x: start.x + start.width - width,
		y: start.y + start.height - height,
	};
};

const useFrame = () => {
	const [frame, setFrame] = useState(() => inView(rememberedFrame()));

	useEffect(() => {
		const fit = () => setFrame((shown) => inView(shown));
		window.addEventListener('resize', fit);
		return () => window.removeEventListener('resize', fit);
	}, []);

	const follow = (change) => (event) => {
		if (event.button !== 0 || event.target.closest('button')) return;
		event.preventDefault();
		const handle = event.currentTarget;
		handle.setPointerCapture?.(event.pointerId);
		const from = { x: event.clientX, y: event.clientY };
		let last = frame;
		const onMove = (moving) => {
			last = inView(
				change(frame, moving.clientX - from.x, moving.clientY - from.y),
			);
			setFrame(last);
		};
		const onEnd = () => {
			handle.removeEventListener('pointermove', onMove);
			handle.removeEventListener('pointerup', onEnd);
			handle.removeEventListener('pointercancel', onEnd);
			store(FRAME, JSON.stringify(last));
		};
		handle.addEventListener('pointermove', onMove);
		handle.addEventListener('pointerup', onEnd);
		handle.addEventListener('pointercancel', onEnd);
	};

	return { frame, move: follow(moved), resize: follow(resized) };
};

const usePhone = () => {
	const [phone, setPhone] = useState(() => window.matchMedia(PHONE).matches);
	useEffect(() => {
		const query = window.matchMedia(PHONE);
		const update = () => setPhone(query.matches);
		query.addEventListener('change', update);
		return () => query.removeEventListener('change', update);
	}, []);
	return phone;
};

export const AdminAgent = ({ data }) => {
	const [open, setOpen] = useState(() => stored(OPEN) === '1');
	// Kept once opened, so a reply still running survives closing the window.
	const [mounted, setMounted] = useState(open);
	const { frame, move, resize } = useFrame();
	const phone = usePhone();
	useEffect(() => watchKeyboardMode(), []);

	const toggle = (next) => {
		store(OPEN, next ? '1' : null);
		setOpen(next);
		if (next) setMounted(true);
	};

	useEffect(() => {
		const launcher = document.querySelector(LAUNCHER);
		if (!launcher) return;
		launcher.setAttribute('aria-controls', PANEL);
		launcher.setAttribute('aria-expanded', String(open));
		const onClick = (event) => {
			event.preventDefault();
			toggle(!open);
		};
		launcher.addEventListener('click', onClick);
		return () => launcher.removeEventListener('click', onClick);
	}, [open]);

	if (!mounted) return null;

	return (
		<section
			id={PANEL}
			hidden={!open}
			aria-label={
				// translators: Screen reader name for the AI Agent's floating window in the WordPress dashboard.
				__('AI Agent', 'extendify-local')
			}
			style={
				phone
					? undefined
					: {
							left: frame.x,
							top: frame.y,
							width: frame.width,
							height: frame.height,
						}
			}
			className="extendify-agentx-surface fixed z-100000 flex flex-col overflow-hidden rounded-agentx-admin-window border border-solid border-agentx-admin-window-border shadow-(--agentx-admin-window-shadow) max-[782px]:inset-0 max-[782px]:rounded-none"
		>
			<div className="shrink-0 px-5 pt-3 pb-3">
				<BrandBar
					data-agentx-drag
					onPointerDown={phone ? undefined : move}
					className="group cursor-grab touch-none select-none active:cursor-grabbing max-[782px]:cursor-auto"
				>
					<PartnerLogo
						fallback={
							// translators: Heading of the AI Agent's floating window in the WordPress dashboard, when the host has no logo.
							__('AI Agent', 'extendify-local')
						}
					/>
					<span className="ms-auto flex shrink-0 items-center">
						<Icon
							icon={dragHandle}
							size={24}
							className="fill-agentx-admin-window-drag opacity-0 transition-opacity group-hover:opacity-100 max-[782px]:hidden"
						/>
						<Tooltip text={__('Close the agent', 'extendify-local')}>
							<button
								type="button"
								onClick={() => toggle(false)}
								aria-label={
									// translators: Screen reader label for the button that closes the AI Agent's floating window in the WordPress dashboard.
									__('Close the agent', 'extendify-local')
								}
								className={`agentx-focus flex size-8 shrink-0 items-center justify-center rounded-agentx-header-button border-0 bg-transparent p-0 text-agentx-brand-ink ${PRESS} hover:bg-agentx-brand-hover`}
							>
								<Icon icon={closeSmall} size={24} className="fill-current" />
							</button>
						</Tooltip>
					</span>
				</BrandBar>
			</div>
			<div className="min-h-0 flex-1 px-5 pb-3">
				<div id="extendify-agentx-chat" className="h-full">
					<Caught where="admin">
						<Chat
							update={data.updateWordPress}
							pluginUpdate={data.updatePlugin}
							pluginUpdateUrl={data.updatePluginUrl}
							compact
						/>
					</Caught>
				</div>
			</div>
			{!phone && (
				<div
					data-agentx-resize
					onPointerDown={resize}
					className="absolute start-0 top-0 z-10 size-4 cursor-nwse-resize touch-none"
				/>
			)}
		</section>
	);
};
