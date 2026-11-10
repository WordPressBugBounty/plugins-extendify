import { useRunStore } from '@agentx/state/run';
import { useEffect, useState } from '@wordpress/element';

export const BLOCK = 'data-extendify-block';
export const BLOCK_TYPE = 'data-extendify-block-type';

// A spacer is only empty room, so picks take the block it sits in.
export const blockAt = (target) => {
	let block = target?.closest?.(`[${BLOCK}]`) ?? null;
	while (block?.getAttribute(BLOCK_TYPE) === 'core/spacer') {
		block = block.parentElement?.closest(`[${BLOCK}]`) ?? null;
	}
	return block;
};
const HIGHLIGHT = 'extendify-agentx-highlight';
const HOVER = 'extendify-agentx-hover';
const LAYER = 'extendify-agentx-boxes';
const DROPDOWN = '.wp-block-navigation__submenu-container';
// Core's open dropdown; closed, a link inside it has no box to cover.
const OPEN = {
	visibility: 'visible',
	opacity: '1',
	width: 'auto',
	height: 'auto',
	minWidth: '200px',
	overflow: 'visible',
};
// Screen pixels: the site frame shows the page scaled down, which would thin the lines.
const LINE = 3;
const GAP = 7.5;
const GRAIN = 0.14;
// One box of each kind per site page; the next one or an unmount takes it down.
const takeDown = new WeakMap();
// Both boxes can hold one dropdown open, and it closes only once neither does.
const holding = new WeakMap();

export const siteFrame = () => document.getElementById('extendify-agentx-site');

export const useSiteDocument = () => {
	const [doc, setDoc] = useState(null);
	useEffect(() => {
		const frame = siteFrame();
		// wp-admin's chat has no site frame.
		if (!frame) return;
		const listening = new AbortController();
		const { signal } = listening;
		// Not at load, which waits on every picture: until then Select and Quick Edit miss the page shown.
		const read = () => {
			const shown = frame.contentDocument;
			if (shown?.readyState !== 'loading') {
				if (shown) setDoc(shown);
				return;
			}
			shown.addEventListener('DOMContentLoaded', read, { once: true, signal });
		};
		frame.addEventListener('extendify-agentx-page', read, { signal });
		frame.addEventListener('load', read, { signal });
		read();
		return () => listening.abort();
	}, []);
	return doc;
};

const takeDownBox = (doc, id) => {
	const boxes = takeDown.get(doc);
	boxes?.get(id)?.();
	boxes?.delete(id);
};

export const unhighlight = (doc) => takeDownBox(doc, HIGHLIGHT);

export const unhover = (doc) => takeDownBox(doc, HOVER);

const openDropdowns = (element) => {
	const opened = [];
	let list = element.parentElement?.closest(DROPDOWN);
	while (list) {
		const held = holding.get(list) ?? { boxes: 0, css: list.style.cssText };
		if (!held.boxes) Object.assign(list.style, OPEN);
		holding.set(list, { ...held, boxes: held.boxes + 1 });
		opened.push(list);
		list = list.parentElement.closest(DROPDOWN);
	}
	return () => {
		for (const list of opened) {
			const { boxes, css } = holding.get(list);
			if (boxes > 1) {
				holding.set(list, { boxes: boxes - 1, css });
				continue;
			}
			holding.delete(list);
			list.style.cssText = css;
		}
	};
};

export const openSubmenu = (item) => {
	const first = item.querySelector(`${DROPDOWN} > *`);
	return first ? openDropdowns(first) : () => {};
};

// Read per box: the site frame lacks the shell's variables, and the dev tool changes them live.
const shellValue = (name) =>
	getComputedStyle(
		document.getElementById('extendify-agentx-shell') ?? document.body,
	)
		.getPropertyValue(name)
		.trim();

const shellNumber = (name, fallback) => {
	const value = Number.parseFloat(shellValue(name));
	return Number.isNaN(value) ? fallback : value;
};

export const selectionColor = () => shellValue('--color-agentx-selection');

// Any CSS color, read back by the browser as rgb() or rgba().
const channelsOf = (doc, color) => {
	const probe = doc.createElement('span');
	probe.style.color = color;
	probe.style.display = 'none';
	doc.body.append(probe);
	const read = doc.defaultView.getComputedStyle(probe).color;
	probe.remove();
	const [r, g, b, a = 1] = (read.match(/[\d.]+/g) ?? []).map(Number);
	return r === undefined ? null : { r, g, b, a };
};

const luminance = ({ r, g, b }) => {
	const [lr, lg, lb] = [r, g, b].map((value) => {
		const c = value / 255;
		return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
	});
	return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
};

const contrast = (one, two) => {
	const [light, dark] = [luminance(one), luminance(two)].sort((a, b) => b - a);
	return (light + 0.05) / (dark + 0.05);
};

// The first solid background behind the part; a picture or gradient gives none to read.
const groundOf = (element) => {
	const view = element.ownerDocument.defaultView;
	for (let node = element; node?.nodeType === 1; node = node.parentElement) {
		const style = view.getComputedStyle(node);
		if (style.backgroundImage && style.backgroundImage !== 'none') return null;
		const color = channelsOf(element.ownerDocument, style.backgroundColor);
		if (color && color.a > 0.5) return color;
	}
	return channelsOf(element.ownerDocument, 'white');
};

const BLUR = 2;
const VEIL = 'rgb(255 255 255 / 0.06)';

const LIGHT = '#ffffff';
// The least contrast for an outline, as for any part of an interface.
const ENOUGH = 3;

// Our blue disappears on a blue section, so the outline takes white there. Never black: the box
// reads as the agent's, and a near-black one reads as the page's own.
export const outlineOn = (element, color) => {
	const doc = element.ownerDocument;
	const ground = groundOf(element);
	const own = channelsOf(doc, color);
	return !ground || !own || contrast(own, ground) >= ENOUGH ? color : LIGHT;
};

const selectionFill = () =>
	shellValue('--color-agentx-selection-fill') || selectionColor();

// How much smaller the site frame draws the page than its own width.
export const frameScale = (doc) => {
	const frame = siteFrame();
	const width = doc.defaultView?.innerWidth;
	if (frame?.contentDocument !== doc || !width) return 1;
	return frame.getBoundingClientRect().width / width || 1;
};

const rounded = (value) => Math.round(value * 100) / 100;

// Noise in the selection color, so a box reads as picked over a photo as well as over text.
const grainOf = (color, size, grain) => {
	const k = grain * 14;
	const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><filter id="g"><feTurbulence type="fractalNoise" baseFrequency="${rounded(0.85 / (size / 180))}" numOctaves="2" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 ${k} 0 0 0 ${-k * 0.42}" result="a"/><feFlood flood-color="${color}"/><feComposite in2="a" operator="in"/></filter><rect width="100%" height="100%" filter="url(#g)"/></svg>`;
	const encoded = encodeURIComponent(svg)
		.replace(/\(/g, '%28')
		.replace(/\)/g, '%29');
	return `url("data:image/svg+xml,${encoded}")`;
};

export const drawBox = (
	doc,
	{ scale = 1, color = selectionColor(), fill = selectionFill() } = {},
) => {
	const box = doc.createElement('div');
	box.setAttribute('data-agentx-box', '');
	const line = rounded(shellNumber('--agentx-selection-width', LINE) / scale);
	const grain = shellNumber('--agentx-selection-grain', GRAIN);
	// Sized from the box in CSS, so a shrinking or flying box never outruns its edge.
	box.innerHTML = `<svg aria-hidden="true" style="position: absolute; left: ${line / 2}px; top: ${line / 2}px; width: calc(100% - ${line}px); height: calc(100% - ${line}px); overflow: visible"><rect width="100%" height="100%" fill="none" stroke-linecap="round" /></svg>`;
	box.style.cssText =
		'position: absolute; box-sizing: border-box; margin: 0; pointer-events: none;';
	box.style.backgroundImage = grainOf(fill, rounded(180 / scale), grain);
	box.style.backgroundColor = `color-mix(in srgb, ${fill} ${Math.round(grain * 60)}%, transparent)`;
	const edge = box.querySelector('rect');
	edge.setAttribute('stroke', color);
	edge.setAttribute('stroke-width', line);
	edge.setAttribute(
		'stroke-dasharray',
		`${rounded(line * 4)} ${rounded(line * 2.6)}`,
	);
	return box;
};

export const roundBox = (box, radius) => {
	const edge = box.querySelector('rect');
	const line = Number(edge.getAttribute('stroke-width'));
	edge.setAttribute('rx', Math.max(0, rounded(radius - line / 2)));
};

// A part as wide as the page, like a top-level section, has no room outside it for the box.
// innerWidth also counts a shown scrollbar, so a full-width section would read as narrower.
const fillsWidth = (element) => {
	const { left, right } = element.getBoundingClientRect();
	const page = element.ownerDocument.documentElement.clientWidth;
	return left <= 1 && right >= page - 1;
};

const growOf = (element, scale) =>
	fillsWidth(element) ? -GAP / scale : GAP / scale;

const radiusOf = (element, grow) => {
	const view = element.ownerDocument.defaultView;
	const own = Number.parseFloat(
		view.getComputedStyle(element).borderTopLeftRadius,
	);
	return Math.max(0, (own || 0) + grow);
};

// Found once per page and again on resize: reading every element's style each frame is slow.
const stuck = new WeakMap();
const findStuck = (doc) => {
	const view = doc.defaultView;
	const found = [...doc.body.querySelectorAll('*')].filter((element) => {
		if (element.closest(`#${LAYER}`)) return false;
		const { position } = view.getComputedStyle(element);
		return position === 'fixed' || position === 'sticky';
	});
	stuck.set(doc, found);
	return found;
};

// The lowest edge of a wide bar stuck to the top of the window, like a sticky header.
const headerOf = (doc) => {
	const view = doc.defaultView;
	let lowest = null;
	for (const element of stuck.get(doc) ?? findStuck(doc)) {
		const { top, bottom, width, height } = element.getBoundingClientRect();
		if (height <= 0 || top > 1 || bottom <= 0) continue;
		if (width < view.innerWidth / 2) continue;
		// A closed mini-cart's overlay fills the window unseen, and would cut every box away.
		const { opacity, visibility } = view.getComputedStyle(element);
		if (Number.parseFloat(opacity) === 0 || visibility === 'hidden') continue;
		if (!lowest || bottom > lowest.bottom) lowest = { element, bottom };
	}
	return lowest;
};

const layerOf = (doc) => {
	const found = doc.getElementById(LAYER);
	if (found) return found;
	const layer = doc.createElement('div');
	layer.id = LAYER;
	// Over everything on the page; a stuck header is cut out of each box instead.
	// Clipped at the page's sides: a box past either edge would scroll the site sideways.
	layer.style.cssText =
		'position: absolute; left: 0; top: 0; width: 100%; height: 0; overflow-x: clip; z-index: 2147483647; pointer-events: none;';
	doc.body.append(layer);
	doc.defaultView.addEventListener('resize', () => findStuck(doc));
	return layer;
};

// Page coordinates, so a box scrolls with the page between frames.
const place = (box, element) => {
	const doc = element.ownerDocument;
	const view = doc.defaultView;
	const scale = frameScale(doc);
	const grow = growOf(element, scale);
	const { top, left, width, height } = element.getBoundingClientRect();
	const size = {
		width: width + grow * 2,
		height: height + grow * 2,
		radius: radiusOf(element, grow),
	};
	box.style.left = `${rounded(left + view.scrollX - grow)}px`;
	box.style.top = `${rounded(top + view.scrollY - grow)}px`;
	box.style.width = `${rounded(size.width)}px`;
	box.style.height = `${rounded(size.height)}px`;
	box.style.borderRadius = `${rounded(size.radius)}px`;
	roundBox(box, size.radius);
	slideUnder(box, element, top - grow);
};

// It slides under the header like the page does, unless its part is in the header.
const slideUnder = (box, element, top) => {
	const header = headerOf(element.ownerDocument);
	if (!header || header.element.contains(element)) {
		box.style.removeProperty('clip-path');
		return;
	}
	box.style.setProperty(
		'clip-path',
		`inset(${rounded(header.bottom - top)}px -100vmax -100vmax -100vmax)`,
	);
};

const selectionBlur = () => ({
	px: shellNumber('--agentx-selection-blur', BLUR),
	veil: shellValue('--color-agentx-selection-veil') || VEIL,
});

const blurAround = (doc, scale, { px, veil }) =>
	[0, 1, 2, 3].map(() => {
		const strip = doc.createElement('div');
		strip.setAttribute('data-agentx-blur', '');
		const blur = `blur(${rounded(px / scale)}px)`;
		strip.style.cssText = `position: absolute; pointer-events: none; background: ${veil}; -webkit-backdrop-filter: ${blur}; backdrop-filter: ${blur};`;
		return strip;
	});

// Everything outside the box, the header too, from the box's own edges so its gap stays sharp.
const placeBlur = ([above, below, left, right], box) => {
	const { scrollWidth, scrollHeight } = box.ownerDocument.documentElement;
	const x0 = Number.parseFloat(box.style.left);
	const y0 = Number.parseFloat(box.style.top);
	const x1 = rounded(x0 + Number.parseFloat(box.style.width));
	const y1 = rounded(y0 + Number.parseFloat(box.style.height));
	const set = (strip, x, y, width, height) =>
		Object.assign(strip.style, {
			left: `${x}px`,
			top: `${y}px`,
			width: `${Math.max(0, width)}px`,
			height: `${Math.max(0, height)}px`,
		});
	set(above, 0, 0, scrollWidth, y0);
	set(below, 0, y1, scrollWidth, scrollHeight - y1);
	set(left, 0, y0, x0, y1 - y0);
	set(right, x1, y0, scrollWidth - x1, y1 - y0);
};

/**
 * The same box the agent and Select draw, around a part Quick Edit is on, following it as it moves.
 * The bar places itself from `reach`.
 */
export const boxAround = (element, { offset }) => {
	const doc = element.ownerDocument;
	const scale = frameScale(doc);
	const box = drawBox(doc, {
		scale,
		color: outlineOn(element, selectionColor()),
	});
	layerOf(doc).append(box);
	const line = rounded(shellNumber('--agentx-selection-width', LINE) / scale);
	const grow = offset + line;
	const follow = () => {
		const view = doc.defaultView;
		const { top, left, width, height } = element.getBoundingClientRect();
		box.style.left = `${rounded(left + view.scrollX - grow)}px`;
		box.style.top = `${rounded(top + view.scrollY - grow)}px`;
		box.style.width = `${rounded(width + grow * 2)}px`;
		box.style.height = `${rounded(height + grow * 2)}px`;
		roundBox(box, radiusOf(element, grow));
		box.style.borderRadius = `${rounded(radiusOf(element, grow))}px`;
		slideUnder(box, element, top - grow);
	};
	follow();
	return { reach: grow, follow, remove: () => box.remove() };
};

const show = (element, id, { locks = false, blur = null } = {}) => {
	const doc = element.ownerDocument;
	const view = doc.defaultView;
	takeDownBox(doc, id);
	const close = openDropdowns(element);
	const scale = frameScale(doc);
	const strips = blur ? blurAround(doc, scale, blur) : [];
	// Clicks on the site go nowhere while the agent holds a part, blurred or boxed.
	if (locks || blur) useRunStore.setState({ blurred: true });
	const box = drawBox(doc, {
		scale,
		color: outlineOn(element, selectionColor()),
	});
	layerOf(doc).append(...strips, box);
	let frame = null;
	// Every frame, so lazy images, a sticky header and resizes never leave the box behind.
	const track = () => {
		if (!box.isConnected || !element.isConnected) return;
		place(box, element);
		if (strips.length) placeBlur(strips, box);
		frame = view.requestAnimationFrame?.(track);
	};
	track();
	const boxes = takeDown.get(doc) ?? new Map();
	boxes.set(id, () => {
		if (frame) view.cancelAnimationFrame?.(frame);
		box.remove();
		for (const strip of strips) strip.remove();
		if (locks || blur) useRunStore.setState({ blurred: false });
		close();
	});
	takeDown.set(doc, boxes);
	return box;
};

// The part the agent asks about: its box stays, and the site stays locked, until the user answers.
export const cover = (element) => show(element, HIGHLIGHT, { locks: true });

export const coverHovered = (element) => show(element, HOVER);

// A block the agent is changing: the page around it blurs, with no line drawn on the block.
export const markBlock = (element) => {
	const box = show(element, HIGHLIGHT, { blur: selectionBlur() });
	box.style.visibility = 'hidden';
	return box;
};

// The part's box in the chat's coordinates, cut to what shows of it, for it to fly from.
export const screenBoxOf = (element) => {
	const doc = element.ownerDocument;
	const view = doc.defaultView;
	const frame = siteFrame();
	const outer =
		frame?.contentDocument === doc
			? frame.getBoundingClientRect()
			: { left: 0, top: 0 };
	const scale = frameScale(doc);
	const grow = growOf(element, scale);
	const rect = element.getBoundingClientRect();
	const header = headerOf(doc);
	const floor = header && !header.element.contains(element) ? header.bottom : 0;
	const top = Math.max(rect.top - grow, floor, 0);
	const bottom = Math.min(rect.top + rect.height + grow, view.innerHeight);
	const left = Math.max(rect.left - grow, 0);
	const right = Math.min(rect.left + rect.width + grow, view.innerWidth);
	return {
		x: rounded(outer.left + left * scale),
		y: rounded(outer.top + top * scale),
		width: rounded(Math.max(0, right - left) * scale),
		height: rounded(Math.max(0, bottom - top) * scale),
		radius: rounded(radiusOf(element, grow) * scale),
	};
};

const ITEM = '.wp-block-accordion-item';

const OPEN_TRIES = 10;

// Only the block sets hidden on a closed panel; clicking before that throws inside it.
const started = (item) =>
	Boolean(
		item.querySelector('.wp-block-accordion-panel')?.hasAttribute('hidden'),
	);

// Its own toggle opens it, retried while a reloaded page's script hasn't started.
const openItem = (item, tries = OPEN_TRIES) => {
	const toggle = item.querySelector('.wp-block-accordion-heading__toggle');
	if (toggle?.getAttribute('aria-expanded') !== 'false') return;
	if (started(item)) toggle.click();
	if (tries > 1) setTimeout(() => openItem(item, tries - 1), 300);
};

// A closed accordion hides the part being worked on, so the items holding it open.
export const openAround = (element) => {
	if (!element?.matches) return;
	if (element.matches('.wp-block-accordion')) {
		for (const item of element.querySelectorAll(ITEM)) openItem(item);
	}
	for (let node = element; node?.nodeType === 1; node = node.parentElement) {
		if (node.tagName === 'DETAILS') node.open = true;
		if (node.matches(ITEM)) openItem(node);
	}
};

// Centered, so a sticky header can't hide it.
export const centerBlock = (element) => {
	openAround(element);
	const doc = element.ownerDocument;
	const view = doc.defaultView;
	const still = window.matchMedia?.(
		'(prefers-reduced-motion: reduce)',
	)?.matches;
	const behavior = still ? 'instant' : 'smooth';
	const header = headerOf(doc)?.bottom ?? 0;
	if (header <= 0) {
		element.scrollIntoView({ block: 'center', behavior });
		return;
	}

	// Centring in the whole frame puts the part behind a header stuck over the top of it.
	const { top, height } = element.getBoundingClientRect();
	const room = view.innerHeight - header;
	const to = view.scrollY + top - header - Math.max(0, (room - height) / 2);
	view.scrollTo({ top: Math.max(0, to), behavior });
};

// One already in view stays put.
export const scrollToBlock = (element) => {
	const { top, bottom } = element.getBoundingClientRect();
	if (top >= 0 && bottom <= element.ownerDocument.defaultView.innerHeight) {
		return;
	}
	centerBlock(element);
};
