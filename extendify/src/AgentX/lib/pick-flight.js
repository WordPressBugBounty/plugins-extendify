import { drawBox, roundBox } from '@agentx/lib/block-box';
import { useSelectionStore } from '@agentx/state/selection';
import { animate, arc } from 'motion';

const PATH = arc({ strength: 0.6, peak: 0.5, rotate: 0.2, direction: 'ccw' });
const SECONDS = 0.55;

const still = () =>
	window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

const shown = (rect) =>
	rect.width > 0 && rect.right > 0 && rect.left < window.innerWidth;

const nextFrame = () =>
	new Promise((done) => requestAnimationFrame(() => done()));

const boxAt = (from) => {
	const box = drawBox(document);
	Object.assign(box.style, {
		position: 'fixed',
		zIndex: '2147483647',
		left: `${from.x}px`,
		top: `${from.y}px`,
		width: `${from.width}px`,
		height: `${from.height}px`,
		borderRadius: `${from.radius}px`,
	});
	document.body.append(box);
	return box;
};

// Its corners are drawn, not CSS, so they're redrawn each frame as it changes size.
const keepRound = (box) => {
	let flying = true;
	const round = () => {
		if (!flying) return;
		roundBox(box, Number.parseFloat(box.style.borderRadius) || 0);
		requestAnimationFrame(round);
	};
	round();
	return () => {
		flying = false;
	};
};

const flyTo = (box, from, to, radius) =>
	Promise.all([
		animate(
			box,
			{
				x: to.left - from.x,
				y: to.top - from.y,
				width: to.width,
				height: to.height,
				borderRadius: radius,
			},
			{ duration: SECONDS, ease: [0.65, 0, 0.35, 1], path: PATH },
		),
		animate(box.querySelector('rect'), { opacity: 0.3 }, { duration: SECONDS }),
	]);

// Motion's controls are a thenable with no catch, and a failed fade must still take the box down.
const fadeAt = (box, from, at) =>
	Promise.resolve(
		animate(
			box,
			{
				x: at.left - from.x,
				y: at.top - from.y,
				width: at.width,
				height: at.height,
				opacity: 0,
			},
			{ duration: 0.2 },
		),
	).catch(() => {});

// Null when nothing should fly, so the chip can name the part at once.
export const flightTo = (from) => {
	const chip = document.querySelector('[data-agentx-pill]');
	const to = chip?.getBoundingClientRect();
	if (!to || !shown(to) || !from?.width || still()) return null;
	return async () => {
		const radius =
			Number.parseFloat(getComputedStyle(chip).borderTopLeftRadius) || 0;
		const box = boxAt(from);
		const stop = keepRound(box);
		try {
			await flyTo(box, from, to, radius);
		} finally {
			stop();
			// Under the box, so the chip's switch from Cancel to the part's name never shows.
			useSelectionStore.setState({ landing: false });
			await nextFrame();
			const named =
				document.querySelector('[data-agentx-pill]')?.getBoundingClientRect() ??
				to;
			await fadeAt(box, from, named);
			box.remove();
		}
	};
};

const ICON = '[data-agentx-picked-icon]';
const MOST_FRAMES = 30;

// A part the agent asked for flies straight onto the picked icon of the message that answers it.
export const flightToSent = (from) => {
	if (!from?.width || still()) return null;
	// Counted before the message is sent, so an older message's icon isn't taken for its own.
	const before = document.querySelectorAll(ICON).length;
	return async () => {
		let icon = null;
		for (let frame = 0; frame < MOST_FRAMES && !icon; frame++) {
			await nextFrame();
			const icons = document.querySelectorAll(ICON);
			icon = icons.length > before ? icons[icons.length - 1] : null;
		}
		const to = icon?.getBoundingClientRect();
		if (!to || !shown(to)) return;
		// Hidden until the box lands, so the box becomes the icon.
		icon.style.opacity = '0';
		const box = boxAt(from);
		const stop = keepRound(box);
		try {
			await flyTo(box, from, to, 4);
		} finally {
			stop();
			icon.style.opacity = '';
			await fadeAt(box, from, to);
			box.remove();
		}
	};
};
