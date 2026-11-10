import { boxAround, frameScale, siteFrame } from '@agentx/lib/block-box';
import { useLayoutEffect, useRef } from '@wordpress/element';

const GAP = 8;
// Off the pointer, so the bubble doesn't cover what it names.
const OFF_POINTER = 16;

// Within this many pixels of the closest it came, the pointer still counts as heading for the bubble.
const SLACK = 12;

const clamp = (value, low, high) => Math.max(low, Math.min(value, high));

export const turnedAway = (
	box,
	point,
	{ closest = null, elsewhere = false } = {},
) => {
	const distance = Math.hypot(
		Math.max(box.left - point.x, 0, point.x - box.right),
		Math.max(box.top - point.y, 0, point.y - box.bottom),
	);
	const nearest =
		!closest || distance < closest.distance ? { distance, at: point } : closest;
	const drift = Math.hypot(point.x - nearest.at.x, point.y - nearest.at.y);
	return {
		// Sliding past the bubble keeps the same distance, so over another part, drifting off counts too.
		away: distance > nearest.distance + SLACK || (elsewhere && drift > SLACK),
		closest: nearest,
	};
};

export const besidePointer = (point, size, site) => {
	const left = point.x + OFF_POINTER + size.width > site.right - GAP;
	const up = point.y + OFF_POINTER + size.height > site.bottom - GAP;
	const x = left ? point.x - OFF_POINTER - size.width : point.x + OFF_POINTER;
	const y = up ? point.y - OFF_POINTER - size.height : point.y + OFF_POINTER;
	// With no room on either side, it covers the pointer rather than leave the site.
	return {
		x: Math.max(site.left + GAP, Math.min(x, site.right - GAP - size.width)),
		y: Math.max(site.top + GAP, Math.min(y, site.bottom - GAP - size.height)),
	};
};

export const sideOf = ({ textAlign, direction }) => {
	const rtl = direction === 'rtl';
	if (textAlign === 'center') return 'center';
	if (textAlign === 'right') return 'right';
	if (textAlign === 'left') return 'left';
	if (textAlign === 'end') return rtl ? 'left' : 'right';
	return rtl ? 'right' : 'left';
};

export const overPart = ({
	ring,
	gap,
	size,
	page,
	screen,
	side,
	inView = false,
}) => {
	const above = ring.top - gap - size.height;
	const below = above < page.top + GAP;
	const beside = below ? ring.bottom + gap : above;
	// A panel with no room beside a tall part covers it rather than leave the screen.
	const y = inView
		? clamp(beside, page.top + GAP, screen.height - size.height - GAP)
		: beside;
	const want = {
		left: ring.left,
		center: (ring.left + ring.right - size.width) / 2,
		right: ring.right - size.width,
	}[side];
	// The phone preview is narrower than the bar, so it stays on the screen instead.
	const x =
		size.width <= page.right - page.left - 2 * GAP
			? clamp(want, page.left + GAP, page.right - GAP - size.width)
			: clamp(
					(page.left + page.right - size.width) / 2,
					GAP,
					screen.width - GAP - size.width,
				);
	return { x, y, below };
};

export const onScreen = (spot, size, screen) => ({
	x: clamp(spot.x, GAP, screen.width - GAP - size.width),
	y: clamp(spot.y, GAP, screen.height - GAP - size.height),
});

// Each frame, so the ring and the bar stay on their part as the page scrolls or reflows, until the bar is dragged off it.
export const useBesidePart = (
	bar,
	part,
	{ inView = false, offset = 6 } = {},
) => {
	const dropped = useRef(null);

	// A click in the site frame renders late, and the bar would paint at the corner first.
	useLayoutEffect(() => {
		const doc = part.ownerDocument;
		const ring = boxAround(part, { offset });
		const { reach } = ring;
		let side = null;
		let frame = 0;
		dropped.current = null;
		const place = () => {
			frame = requestAnimationFrame(place);
			const site = siteFrame();
			// A save reloads the page, and the part left behind measures as nothing at its top corner.
			if (!bar.current || site?.contentDocument !== doc) return;
			// Read once, so changing the words' alignment doesn't move the bar from under the pointer.
			side ??= sideOf(doc.defaultView.getComputedStyle(part));
			ring.follow();
			const size = {
				width: bar.current.offsetWidth,
				height: bar.current.offsetHeight,
			};
			const screen = { width: window.innerWidth, height: window.innerHeight };
			if (dropped.current) {
				const { x, y } = onScreen(dropped.current, size, screen);
				bar.current.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
				return;
			}
			const box = site.getBoundingClientRect();
			const scale = frameScale(doc);
			const rect = part.getBoundingClientRect();
			const { x, y, below } = overPart({
				ring: {
					left: box.left + (rect.left - reach) * scale,
					top: box.top + (rect.top - reach) * scale,
					right: box.left + (rect.right + reach) * scale,
					bottom: box.top + (rect.bottom + reach) * scale,
				},
				gap: (offset || GAP) * scale,
				size,
				page: {
					left: Math.max(box.left, 0),
					top: Math.max(box.top, 0),
					right: Math.min(box.right, window.innerWidth),
					bottom: Math.min(box.bottom, window.innerHeight),
				},
				screen,
				side,
				inView,
			});
			bar.current.dataset.side = below ? 'below' : 'above';
			bar.current.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
		};
		place();
		return () => {
			cancelAnimationFrame(frame);
			ring.remove();
		};
	}, [bar, part, inView, offset]);

	return (event) => {
		if (event.button !== 0 || !bar.current) return;
		event.preventDefault();
		const handle = event.currentTarget;
		const { left, top } = bar.current.getBoundingClientRect();
		const grab = { x: event.clientX - left, y: event.clientY - top };
		handle.setPointerCapture?.(event.pointerId);
		const move = (moving) => {
			dropped.current = {
				x: moving.clientX - grab.x,
				y: moving.clientY - grab.y,
			};
		};
		const stop = () => {
			handle.removeEventListener('pointermove', move);
			handle.removeEventListener('pointerup', stop);
			handle.removeEventListener('pointercancel', stop);
		};
		handle.addEventListener('pointermove', move);
		handle.addEventListener('pointerup', stop);
		handle.addEventListener('pointercancel', stop);
	};
};
