import {
	BLOCK,
	BLOCK_TYPE,
	blockAt,
	coverHovered,
	openAround,
	screenBoxOf,
	siteFrame,
	unhover,
	useSiteDocument,
} from '@agentx/lib/block-box';
import { contactAt, contactLabel, linkContact } from '@agentx/lib/contact';
import { coverLabel, coverMedia } from '@agentx/lib/cover';
import { pageUrl } from '@agentx/lib/follow-site';
import { flightTo, flightToSent } from '@agentx/lib/pick-flight';
import { withoutKeys } from '@agentx/quick-edit/part-keys';
import { useDraftStore } from '@agentx/state/draft';
import { useNudgeStore } from '@agentx/state/nudges';
import { useSelectionStore } from '@agentx/state/selection';
import { useShellStore } from '@agentx/state/shell';
import {
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
} from '@wordpress/element';

// The names the backend reads a picked block's markup by.
const RENAMES = [
	[BLOCK, 'data-block'],
	[BLOCK_TYPE, 'data-type'],
];

// What the browser shows for each setting a fast edit can change, inherited and theme styles included.
const COMPUTED = [
	'color',
	'background-color',
	'font-size',
	'font-family',
	'font-weight',
	'font-style',
	'line-height',
	'letter-spacing',
	'text-transform',
	'text-decoration-line',
	'text-align',
	'padding-top',
	'padding-right',
	'padding-bottom',
	'padding-left',
	'margin-top',
	'margin-right',
	'margin-bottom',
	'margin-left',
	'border-top-left-radius',
	'box-shadow',
	'width',
];

const CLEAR = /^(transparent|rgba\([^)]*,\s*0\))$/;

// A paragraph's own background is clear, so its words sit on whatever is behind it.
const backdropOf = (element) => {
	const view = element.ownerDocument?.defaultView;
	for (let node = element; node?.nodeType === 1; node = node.parentElement) {
		const color = view?.getComputedStyle?.(node).backgroundColor;
		if (color && !CLEAR.test(color)) return color;
	}
	return 'rgb(255, 255, 255)';
};

const SIDE_ALIGNED = ['alignleft', 'alignright', 'alignfull'];

// A constrained layout centers what's in it with !important side margins, so a block's own do nothing.
const pinnedOf = (element) =>
	element.parentElement?.classList.contains('is-layout-constrained') &&
	!SIDE_ALIGNED.some((name) => element.classList.contains(name))
		? 'sides'
		: '';

// A section that sets only its content width draws a wide block no wider than that.
const wideOf = (element) => {
	const parent = element.parentElement;
	if (
		element.getAttribute(BLOCK_TYPE) !== 'core/image' ||
		!parent?.classList.contains('is-layout-constrained')
	) {
		return '';
	}
	const probe = element.ownerDocument.createElement('div');
	probe.className = 'alignwide';
	probe.style.setProperty('visibility', 'hidden');
	probe.style.setProperty('height', '0');
	parent.append(probe);
	const { width } = probe.getBoundingClientRect();
	probe.remove();
	return width ? `${Math.round(width)}px` : '';
};

// How many items each row of a grid or columns shows, which no class on it says.
const rowsOf = (element) => {
	if (
		!element.classList.contains('is-layout-grid') &&
		element.getAttribute(BLOCK_TYPE) !== 'core/columns'
	) {
		return '';
	}
	const rows = [];
	for (const child of element.children) {
		if (!child.hasAttribute(BLOCK)) continue;
		const top = Math.round(child.getBoundingClientRect().top);
		if (rows.length && Math.abs(rows.at(-1).top - top) < 2) rows.at(-1).n += 1;
		else rows.push({ top, n: 1 });
	}
	return rows.map(({ n }) => n).join('+');
};

// A style can draw shapes past a section's top and bottom, like waves, which no block holds.
export const edgesOf = (element) => {
	// Only a section's style draws them, and reading a pseudo-element's style isn't free.
	if (!element.matches?.('.ext-section, [class*="--section"]')) return '';
	const view = element.ownerDocument?.defaultView;
	const height = element.getBoundingClientRect?.().height ?? 0;
	const sides = ['::before', '::after'].flatMap((pseudo) => {
		const style = view?.getComputedStyle?.(element, pseudo);
		if (!style || ['none', 'normal', ''].includes(style.content)) return [];
		const mask =
			style.getPropertyValue?.('mask-image') ||
			style.getPropertyValue?.('-webkit-mask-image');
		if (!mask || mask === 'none') return [];
		const top = Number.parseFloat(style.top);
		// A shape laid over the section, like a texture, starts inside it.
		if (top < 0) return ['above'];
		return top > 0 && top >= height - 2 ? ['below'] : [];
	});
	return [...new Set(sides)].sort().join(' and ');
};

// A picture's own box and file size; the block it sits in is as wide as the page.
const pictureOf = (element) => {
	if (element.getAttribute(BLOCK_TYPE) !== 'core/image') return '';
	const img = element.querySelector('img');
	if (!img) return '';
	const { width, height } = img.getBoundingClientRect();
	const drawn = `${Math.round(width)}x${Math.round(height)}`;
	return img.naturalWidth
		? `${drawn} of ${img.naturalWidth}x${img.naturalHeight}`
		: drawn;
};

// A button's look is its link's, not its wrapper's.
const computedOf = (element) => {
	const target =
		element.getAttribute(BLOCK_TYPE) === 'core/button'
			? (element.querySelector('a, button') ?? element)
			: element;
	const style = element.ownerDocument?.defaultView?.getComputedStyle?.(target);
	if (!style) return null;
	const seen = Object.fromEntries(
		[
			...COMPUTED.map((property) => [
				property,
				style.getPropertyValue(property),
			]),
			['backdrop', backdropOf(target)],
			['pinned', pinnedOf(element)],
			['x', `${Math.round(element.getBoundingClientRect().left)}px`],
			['page', `${element.ownerDocument.documentElement.clientWidth}px`],
			['wide', wideOf(element)],
			['rows', rowsOf(element)],
			['edges', edgesOf(element)],
			['picture', pictureOf(element)],
		].filter(([, value]) => value),
	);
	return Object.keys(seen).length ? JSON.stringify(seen) : null;
};

// How a block looks now; width is left out, since it follows the page.
export const looksOf = (doc, id) => {
	const element = doc ? blockById(doc, id) : null;
	const seen = element && computedOf(element);
	if (!seen) return null;
	const {
		backdrop: _,
		pinned: __,
		x: ___,
		width: ____,
		wide: _____,
		...looks
	} = JSON.parse(seen);
	return looks;
};

export const blockMarkup = (element, { computed = false } = {}) => {
	// Quick Edit's tab stops would read to the agent as the page's own markup.
	const copy = withoutKeys(element.cloneNode(true));
	if (computed) {
		// Read from the live blocks: a copy has no styles applied.
		const live = new Map(
			[element, ...element.querySelectorAll(`[${BLOCK}]`)].map((node) => [
				node.getAttribute(BLOCK),
				node,
			]),
		);
		for (const node of [copy, ...copy.querySelectorAll(`[${BLOCK}]`)]) {
			const original = live.get(node.getAttribute(BLOCK));
			const seen = original && computedOf(original);
			if (seen) node.setAttribute('data-computed', seen);
		}
	}
	const stamped = copy.querySelectorAll(`[${BLOCK}], [${BLOCK_TYPE}]`);
	for (const node of [copy, ...stamped]) {
		for (const [from, to] of RENAMES) {
			if (!node.hasAttribute(from)) continue;
			node.setAttribute(to, node.getAttribute(from));
			node.removeAttribute(from);
		}
	}
	return copy.outerHTML;
};

const pickedOf = (element) => {
	const label = coverLabel(coverMedia(element));
	return {
		id: element.getAttribute(BLOCK),
		type: element.getAttribute(BLOCK_TYPE),
		html: blockMarkup(element, { computed: true }),
		...(label && { label }),
	};
};

// Escape cancels.
export const pickBlock = (doc, { onPick, onCancel }) => {
	const listening = new AbortController();
	const options = { capture: true, signal: listening.signal };
	const cursor = doc.createElement('style');
	// Links and buttons set their own cursor, which would hide that a click picks.
	cursor.textContent = '* { cursor: crosshair !important; }';
	(doc.head ?? doc.documentElement).append(cursor);

	let hovered = null;
	const hover = (element) => {
		if (element === hovered) return;
		hovered = element;
		if (element) {
			coverHovered(element);
			return;
		}
		unhover(doc);
	};
	const stop = () => {
		listening.abort();
		cursor.remove();
		unhover(doc);
	};

	doc.addEventListener(
		'mouseover',
		({ target }) => hover(blockAt(target)),
		options,
	);
	doc.addEventListener(
		'mouseout',
		({ relatedTarget }) => {
			// Null once the pointer leaves the page.
			if (!relatedTarget) hover(null);
		},
		options,
	);
	// Menus and sliders act on press, and a middle click opens a link in a new tab.
	for (const type of ['pointerdown', 'mousedown', 'auxclick']) {
		doc.addEventListener(
			type,
			(event) => {
				event.preventDefault();
				event.stopPropagation();
			},
			options,
		);
	}
	doc.addEventListener(
		'click',
		(event) => {
			// A picked link would navigate, and the site's own click handlers would run.
			event.preventDefault();
			event.stopPropagation();
			const element = blockAt(event.target);
			if (!element) return;
			stop();
			const contact =
				linkContact(event.target.closest?.('a[href]')) ??
				contactAt(doc, event.clientX, event.clientY);
			onPick(
				{
					...pickedOf(element),
					...(contact && { label: contactLabel(contact) }),
				},
				element,
			);
		},
		options,
	);
	const cancelOnEscape = (target, capture) =>
		target.addEventListener(
			'keydown',
			(event) => {
				if (event.key !== 'Escape' || event.isComposing) return;
				if (!capture && event.defaultPrevented) return;
				// The chat's own Escape skips a prevented one, so focus stays put.
				event.preventDefault();
				stop();
				onCancel();
			},
			{ capture, signal: listening.signal },
		);
	// Focus can be in the chat or in the site.
	cancelOnEscape(doc, true);
	if (doc !== document) cancelOnEscape(document, true);
	return stop;
};

// The backend plans a selection with more blocks than this rather than pick one in it.
const MOST_BLOCKS = 20;

const parentBlock = (element) => blockAt(element.parentElement);
const fits = (element) =>
	element.querySelectorAll(`[${BLOCK}]`).length < MOST_BLOCKS;

// A found block comes with as much around it as fits, so "the text below it" is in the selection too.
export const containerOf = (element) => {
	let widest = element;
	for (let at = parentBlock(element); at && fits(at); at = parentBlock(at)) {
		widest = at;
	}
	return widest;
};

export const blockById = (doc, id) =>
	[...doc.querySelectorAll(`[${BLOCK}]`)].find(
		(element) => element.getAttribute(BLOCK) === id,
	) ?? null;

export const blocksById = (doc, id) =>
	[...doc.querySelectorAll(`[${BLOCK}]`)].filter(
		(element) => element.getAttribute(BLOCK) === id,
	);

const partOf = (id) => {
	const doc = siteFrame()?.contentDocument;
	const element = doc ? blockById(doc, id) : null;
	if (!element) return null;
	return {
		element,
		part: { ...pickedOf(element), page: pageUrl(doc.location.href) },
	};
};

// As the site shows it now, so a plan's step sees what the steps before it did.
export const partNow = (id) => {
	const part = partOf(id)?.part;
	return part ? { id: part.id, html: part.html } : null;
};

// The backend reads a step's section only for block places, words and photos, not looks.
const KEPT = new Set([BLOCK, BLOCK_TYPE]);

export const outlineMarkup = (element) => {
	const copy = element.cloneNode(true);
	for (const node of copy.querySelectorAll(
		'script, style, noscript, template, svg *',
	)) {
		node.remove();
	}
	for (const node of [copy, ...copy.querySelectorAll('*')]) {
		const image = node.tagName === 'IMG';
		for (const { name } of [...node.attributes]) {
			if (KEPT.has(name) || (image && (name === 'src' || name === 'alt'))) {
				continue;
			}
			node.removeAttribute(name);
		}
		for (const [from, to] of RENAMES) {
			if (!node.hasAttribute(from)) continue;
			node.setAttribute(to, node.getAttribute(from));
			node.removeAttribute(from);
		}
	}
	return copy.outerHTML;
};

export const outlineNow = (id) => {
	const element = partOf(id)?.element;
	return element ? { id, html: outlineMarkup(element) } : null;
};

// Picked as if the user clicked it, chip and all.
export const selectBlock = (id) => {
	const found = partOf(id);
	if (!found) return null;
	useSelectionStore.setState({
		picking: false,
		pickAfter: null,
		block: found.part,
	});
	return found.element;
};

const wait = (ms) => new Promise((done) => setTimeout(done, ms));
const nextFrame = () =>
	new Promise((done) => requestAnimationFrame(() => done()));

// A minimized chat takes this long to slide back and fade in, and a box can't land before.
const CHAT_BACK_MS = 450;
const SHOWN_MS = 250;

// label names the part on the chat box's chip in place of its block's name.
export const sendPart = async (element, { label = null } = {}) => {
	const doc = element.ownerDocument;
	const shell = useShellStore.getState();
	if (shell.minimized) {
		shell.setMinimized(false);
		await wait(CHAT_BACK_MS);
	}
	coverHovered(element);
	await wait(SHOWN_MS);
	unhover(doc);
	const from = screenBoxOf(element);
	useSelectionStore.setState({
		picking: false,
		pickAfter: null,
		block: {
			...pickedOf(element),
			page: pageUrl(doc.location.href),
			...(label && { label }),
		},
		landing: true,
	});
	// The chip it lands on renders with the pick.
	await nextFrame();
	const fly = flightTo(from);
	if (!fly) useSelectionStore.setState({ landing: false });
	await fly?.();
	openAround(element);
	document.querySelector('[data-agentx-chat-box]')?.focus();
};

// A part the agent found or the user confirmed: the next message's focus, never a chip.
export const focusBlock = (id) => {
	const found = partOf(id);
	if (!found) return null;
	useSelectionStore.setState({ focus: found.part });
	return found.element;
};

// An id is a position, so on another page or after a change it can name another part.
const recheck = (doc, part) => {
	const element = blockById(doc, part.id);
	if (
		pageUrl(doc.location.href) !== part.page ||
		element?.getAttribute(BLOCK_TYPE) !== part.type
	) {
		return null;
	}
	// A reload can show the part changed, and the backend reads it as shown.
	const html = blockMarkup(element, { computed: true });
	return html === part.html ? part : { ...part, html };
};

// Picking is off while the agent works, and the run an answer starts can end with a wrap-up request.
// The chat picks a reply's nudges only once nothing more will be sent, so picking waits for that.
export const pickAfterRun = () =>
	useSelectionStore.setState({
		pickAfter: Object.keys(useNudgeStore.getState().picks),
		asked: true,
	});

export const useBlockPicker = ({ off, onPicked }) => {
	const doc = useSiteDocument();
	const picking = useSelectionStore((state) => state.picking);
	const pickAfter = useSelectionStore((state) => state.pickAfter);
	const block = useSelectionStore((state) => state.block);
	const focus = useSelectionStore((state) => state.focus);
	const landing = useSelectionStore((state) => state.landing);
	const confirming = useSelectionStore((state) => state.confirming);
	const runEnded = useNudgeStore(
		(state) =>
			Boolean(pickAfter) &&
			Object.keys(state.picks).some((id) => !pickAfter.includes(id)),
	);
	// wp-admin's chat has no site to pick from.
	const [hasSite, setHasSite] = useState(false);
	const picked = useRef(onPicked);
	picked.current = onPicked;
	// A phone's site is a strip above the chat, too small to point at a part.
	const phone = useShellStore((state) => state.phone);
	// Select waits while the agent asks about a part, as it does while the agent works.
	const canPick = Boolean(doc) && !off && !confirming && !phone;
	const selecting = canPick && picking;

	useLayoutEffect(() => setHasSite(Boolean(siteFrame())), []);

	useEffect(() => {
		if (!canPick) useSelectionStore.setState({ picking: false });
	}, [canPick]);

	useEffect(() => {
		if (!runEnded || !canPick) return;
		useSelectionStore.setState({ picking: true, pickAfter: null });
	}, [runEnded, canPick]);

	useEffect(() => {
		if (!selecting) return;
		return pickBlock(doc, {
			onPick: (chosen, element) => {
				const { asked } = useSelectionStore.getState();
				const from = screenBoxOf(element);
				const fly = asked ? flightToSent(from) : flightTo(from);
				useSelectionStore.setState({
					picking: false,
					block: { ...chosen, page: pageUrl(doc.location.href) },
					landing: !asked && Boolean(fly),
				});
				const flown = fly?.() ?? Promise.resolve();
				picked.current?.({ flown });
				openAround(element);
			},
			onCancel: () => useSelectionStore.setState({ picking: false }),
		});
	}, [selecting, doc]);

	useEffect(() => {
		// A page the frame is leaving has no window; the next load runs this again.
		if (!doc?.defaultView) return;
		const next = {};
		for (const [key, part] of Object.entries({ block, focus })) {
			const kept = part && recheck(doc, part);
			if (kept !== part) next[key] = kept;
		}
		if (Object.keys(next).length) useSelectionStore.setState(next);
	}, [doc, block, focus]);

	// A reload closes accordions, and a found item's focus is its column, so the changed blocks open too.
	useEffect(() => {
		if (!doc?.defaultView) return;
		const { versions, current } = useDraftStore.getState();
		const changed = versions.find(({ id }) => id === current)?.changed ?? [];
		const ids = [block?.id, focus?.id, ...changed.map((each) => each.block)];
		for (const id of new Set(ids.filter(Boolean))) {
			const element = blockById(doc, id);
			if (element) openAround(element);
		}
	}, [doc, block?.id, focus?.id]);

	return {
		available: hasSite && !phone,
		canPick,
		picking,
		selecting,
		landing,
		selected: block,
		toggle: () =>
			useSelectionStore.setState((state) => ({
				picking: !state.picking,
				pickAfter: null,
			})),
		clear: () =>
			useSelectionStore.setState({
				picking: false,
				block: null,
				pickAfter: null,
			}),
	};
};
