import { BLOCK } from '@agentx/lib/block-box';
import { blocksById } from '@agentx/lib/pick-block';

// A fetch gets the frame's own render of an address only with this param.
export const renderUrl = (href) => {
	const url = new URL(href, document.baseURI);
	url.searchParams.set('extendify-frame-fetch', '1');
	return url.href;
};

// The live page holds what the theme's scripts changed, so a diff compares two fresh renders.
const renderAt = (render, version) => {
	const url = new URL(renderUrl(render));
	url.searchParams.set('extendify-draft-at', version);
	return url.href;
};

const fetchPage = async (url) => {
	const response = await fetch(url, { credentials: 'same-origin' });
	if (!response.ok) throw new Error(`The page answered ${response.status}.`);
	return response.text();
};

// Kept so a patch fetches only the new version's render.
let kept = null;

const keptOr = (live, url) =>
	kept?.doc === live && kept.url === url ? kept.html : fetchPage(url);

// Fetched while the change runs, so it's ready when the change answers.
export const renderAhead = (frame, render, version) => {
	const live = frame?.contentDocument;
	const url = renderAt(render, version);
	if (!live || (kept?.doc === live && kept.url === url)) return;
	const html = fetchPage(url);
	// Kept, a failed render would fail every patch until the page loads again.
	html.catch(() => {
		if (kept?.html === html) kept = null;
	});
	kept = { doc: live, url, html };
};

const parse = (html) => new DOMParser().parseFromString(html, 'text/html');

const blocksIn = (doc) =>
	new Map(
		[...doc.querySelectorAll(`[${BLOCK}]`)].map((node) => [
			node.getAttribute(BLOCK),
			node,
		]),
	);

// Swapped-in markup runs no scripts, so a block a script draws needs the page loaded again.
// One inside a region counts too: the Interactivity API binds a region once, on load.
const SCRIPTED = 'script, [data-wp-interactive]';

// Inner blocks become their ids, so a change inside one doesn't count against its parent.
const ownOf = (node) => {
	const copy = node.cloneNode(true);
	for (const inner of copy.querySelectorAll(`[${BLOCK}]`)) {
		inner.replaceWith(inner.getAttribute(BLOCK));
	}
	return copy.outerHTML;
};

const scripted = (node) =>
	node.closest(SCRIPTED) || node.querySelector(SCRIPTED);

// Same tags and words in the same places, so only attributes differ.
const sameShape = (was, now) =>
	was.nodeName === now.nodeName &&
	was.childNodes.length === now.childNodes.length &&
	(was.nodeType === Node.ELEMENT_NODE
		? [...was.childNodes].every((child, at) =>
				sameShape(child, now.childNodes[at]),
			)
		: was.nodeValue === now.nodeValue);

// The outermost changed blocks, or null when only a full load can line the page up.
// inScripts lets a block a script draws change its attributes alone.
export const changedBlocks = (before, after, { inScripts = false } = {}) => {
	const was = blocksIn(before);
	const now = blocksIn(after);
	// A page with no block marks wasn't rendered for the frame, so there's nothing to match.
	if (!now.size) return null;
	if ([...was.keys()].join(' ') !== [...now.keys()].join(' ')) return null;
	const changed = [...now]
		.filter(([id, node]) => ownOf(node) !== ownOf(was.get(id)))
		.map(([id, node]) => ({ id, node }));
	const outermost = changed.filter(
		({ node }) =>
			!changed.some(
				(other) => other.node !== node && other.node.contains(node),
			),
	);
	if (
		outermost.some(
			({ id, node }) =>
				scripted(node) && !(inScripts && sameShape(was.get(id), node)),
		)
	) {
		return null;
	}
	return outermost.map(({ id, node }) => ({ id, node, was: was.get(id) }));
};

// The frame announces its title only as it loads, so a rename needs the load.
const announced = (doc) => [
	doc.title,
	[...doc.scripts].find((script) => script.text.includes('extAgentXPage'))
		?.text,
];
const announcedAs = (doc, name) => {
	const [, text = ''] = announced(doc);
	return text.match(new RegExp(`window\\.${name} = (.*?);window\\.`, 's'))?.[1];
};

// A block's color and spacing rules live in style tags in the head, not in its markup.
const syncStyles = (live, after) => {
	for (const node of after.querySelectorAll(
		'style[id], link[rel="stylesheet"][id]',
	)) {
		const now = live.getElementById(node.id);
		if (now?.outerHTML === node.outerHTML) continue;
		const fresh = live.importNode(node, true);
		if (now) now.replaceWith(fresh);
		else live.head.append(fresh);
	}
};

// WordPress prints a two-color filter at the page's foot, outside every block, and only where a block uses it.
const syncFilters = (live, after) => {
	for (const filter of after.querySelectorAll('filter[id^="wp-duotone-"]')) {
		const svg = filter.closest('svg');
		const now = live.getElementById(filter.id)?.closest('svg');
		if (!svg || now?.outerHTML === svg.outerHTML) continue;
		const fresh = live.importNode(svg, true);
		if (now) now.replaceWith(fresh);
		else live.body.append(fresh);
	}
};

// WordPress prints every font's rules in one style tag that has a class but no id.
const syncFonts = (live, after) => {
	const fresh = after.querySelector('style.wp-fonts-local');
	const now = live.querySelector('style.wp-fonts-local');
	if (!fresh || now?.outerHTML === fresh.outerHTML) return;
	const node = live.importNode(fresh, true);
	if (now) now.replaceWith(node);
	else live.head.append(node);
};

// Quick Edit's look preview matches any section color, so after an Undo it kept the new waves.
const dropLookPreviews = (live, swapped) => {
	for (const sheet of live.querySelectorAll('style[data-agentx-look]')) {
		const sections = blocksById(live, sheet.dataset.agentxLook);
		const replaced = sections.some((section) =>
			swapped.some((block) => block.contains(section)),
		);
		if (replaced) sheet.remove();
	}
};

// Nodes stay where they line up, so outlines and the theme's listeners stay attached.
const morph = (old, fresh) => {
	if (old.nodeName !== fresh.nodeName) {
		old.replaceWith(fresh);
		return;
	}
	if (old.nodeType !== Node.ELEMENT_NODE) {
		if (old.nodeValue !== fresh.nodeValue) old.nodeValue = fresh.nodeValue;
		return;
	}
	for (const { name } of [...old.attributes]) {
		if (!fresh.hasAttribute(name)) old.removeAttribute(name);
	}
	for (const { name, value } of [...fresh.attributes]) {
		if (old.getAttribute(name) !== value) old.setAttribute(name, value);
	}
	const was = [...old.childNodes];
	const now = [...fresh.childNodes];
	now.forEach((child, at) => {
		if (was[at]) morph(was[at], child);
		else old.append(child);
	});
	for (const extra of was.slice(now.length)) extra.remove();
};

// Already on screen, so it skips the entrance animation that would hide it first.
const asShown = (fresh, old) => {
	const all = (node) => [node, ...node.querySelectorAll('*')];
	for (const node of all(fresh)) node.classList.add('ext-animate--off');
	const open = all(old)
		.filter((node) => node.tagName === 'DETAILS')
		.map((node) => node.open);
	all(fresh)
		.filter((node) => node.tagName === 'DETAILS')
		.forEach((node, at) => {
			if (open[at]) node.open = true;
		});
};

// Only what the two renders differ in, so what a script set on the page, like an open item, stays.
const attributeChanges = (live, was, now, found = []) => {
	if (
		!live ||
		live.nodeName !== now.nodeName ||
		live.children.length !== now.children.length
	) {
		return null;
	}
	const names = new Set([
		...was.getAttributeNames(),
		...now.getAttributeNames(),
	]);
	for (const name of names) {
		const value = now.getAttribute(name);
		if (was.getAttribute(name) !== value) found.push({ live, name, value });
	}
	for (const [at, child] of [...now.children].entries()) {
		if (!attributeChanges(live.children[at], was.children[at], child, found)) {
			return null;
		}
	}
	return found;
};

// False when a changed block isn't on the page to swap.
const swapIn = (live, after, changed) => {
	// A theme can copy a block, like the header phone into its mobile menu, so every copy changes.
	const swaps = changed.map(({ id, node, was }) => ({
		node,
		was,
		targets: blocksById(live, id),
	}));
	if (swaps.some(({ targets }) => !targets.length)) return false;
	// A block a script draws keeps its nodes, or its bindings stop answering.
	const shifts = swaps
		.filter(({ node }) => scripted(node))
		.flatMap(({ node, was, targets }) =>
			targets.map((target) => attributeChanges(target, was, node)),
		);
	if (shifts.some((found) => !found)) return false;
	syncStyles(live, after);
	syncFonts(live, after);
	syncFilters(live, after);
	for (const { live: element, name, value } of shifts.flat()) {
		if (value === null) element.removeAttribute(name);
		else element.setAttribute(name, value);
	}
	for (const { node, targets } of swaps.filter(({ node }) => !scripted(node))) {
		for (const target of targets) {
			const fresh = live.importNode(node, true);
			asShown(fresh, target);
			morph(target, fresh);
		}
	}
	return true;
};

const showAt = (frame, href, url, html) => {
	frame.contentWindow.history.replaceState(
		frame.contentWindow.history.state,
		'',
		href,
	);
	kept = { doc: frame.contentDocument, url, html: Promise.resolve(html) };
};

// False means only a full load shows the change.
export const patchSite = async (frame, { render, from, to, href }) => {
	const live = frame?.contentDocument;
	if (!live) return false;
	const [was, now] = [renderAt(render, from), renderAt(render, to)];
	const [old, html] = await Promise.all([keptOr(live, was), fetchPage(now)]);
	const before = parse(old);
	const after = parse(html);
	if (announced(before).join() !== announced(after).join()) return false;
	const changed = changedBlocks(before, after);
	// An empty diff may mean the old version is gone, so both rendered the new one.
	if (!changed?.length) return false;
	if (!swapIn(live, after, changed)) return false;
	dropLookPreviews(
		live,
		changed.flatMap(({ id }) => blocksById(live, id)),
	);
	showAt(frame, href, now, html);
	return true;
};

// A style's page widths change the font sizes printed in blocks, not only the style tags.
export const restylePage = async (
	frame,
	{ from, href, current = () => true },
) => {
	const live = frame?.contentDocument;
	if (!live) return false;
	const [was, now] = [renderUrl(from), renderUrl(href)];
	const [old, html] = await Promise.all([keptOr(live, was), fetchPage(now)]);
	// The frame moved to another page while the renders loaded, or a newer pick owns it.
	if (frame.contentDocument !== live || !current()) return false;
	const before = parse(old);
	const after = parse(html);
	const page = (doc) => [doc.title, announcedAs(doc, 'extAgentXPage')].join();
	if (page(before) !== page(after)) return false;
	const changed = changedBlocks(before, after, { inScripts: true });
	if (!changed || !swapIn(live, after, changed)) return false;
	// A color scheme can bring its own duotones, which Quick Edit offers from this list.
	const duotones = announcedAs(after, 'extAgentXDuotones');
	if (duotones) frame.contentWindow.extAgentXDuotones = JSON.parse(duotones);
	showAt(frame, href, now, html);
	return true;
};
