import { restylePage } from '@agentx/lib/patch-site';
import { usePlanStore } from '@agentx/state/plan';
import { useShellStore } from '@agentx/state/shell';
import { animate } from 'motion';

const ID = 'data-extendify-block';
const TYPE = 'data-extendify-block-type';
// Past these, a switch shows the page as it stands.
const PARSE_MS = 8000;
const SETTLE_MS = 2000;
const LEFT = 'left';
const SLOW_MS = 2000;
// A 204 or a download never loads a page; the show-page tool's cap.
const GIVE_UP_MS = 15000;

// One site frame shows one switch; an older switch must not undo a newer one.
let latest = 0;
// The new page shown over the site frame while it reloads; a newer switch takes it over.
let standIn = null;
// A switch and a slow page can hold the cover at once, and the first done must not lift it.
let switching = false;
let slow = false;
// Changes the user clicked that are still landing on the site.
let clicked = 0;
// Picks restyling the page on screen.
let restyling = 0;
// The switch covers its own loads of the site frame.
let replacing = false;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const parsed = (frame, before, ms = PARSE_MS) =>
	new Promise((resolve) => {
		const until = performance.now() + ms;
		const check = () => {
			const doc = frame.contentDocument;
			if (doc && doc !== before && doc.readyState !== 'loading') {
				return resolve(doc);
			}
			if (!frame.isConnected || performance.now() > until) return resolve(null);
			setTimeout(check, 16);
		};
		check();
	});

// Lining up needs the final layout, and footer stylesheets finish after the parse.
const styled = (doc) =>
	Promise.all(
		[...doc.querySelectorAll('link[rel~="stylesheet"]')]
			.filter(
				(link) =>
					!link.sheet && !link.disabled && !link.relList.contains('alternate'),
			)
			.map(
				(link) =>
					new Promise((resolve) => {
						link.addEventListener('load', resolve, { once: true });
						link.addEventListener('error', resolve, { once: true });
					}),
			),
	);

const inView = (element) => {
	const { top, bottom, left, right } = element.getBoundingClientRect();
	const view = element.ownerDocument.defaultView;
	return (
		bottom > 0 && right > 0 && top < view.innerHeight && left < view.innerWidth
	);
};

// Not the load event, which embeds like maps can hold for seconds.
const painted = (doc) =>
	Promise.all([
		doc.fonts.ready,
		...[...doc.images]
			.filter(inView)
			.map((image) => image.decode().catch(() => {})),
	]);

// Scroll-linked animations, like the theme's glass header, follow the page and never play unseen.
const playsOnTime = (doc) =>
	(doc.getAnimations?.() ?? []).some(
		(animation) => animation.timeline === doc.timeline,
	);

// Fixed and sticky bars stay put while the page scrolls, so they can't place it.
const pinned = (element) => {
	const view = element.ownerDocument.defaultView;
	for (let node = element; node; node = node.parentElement) {
		const { position } = view.getComputedStyle(node);
		if (position === 'fixed' || position === 'sticky') return true;
	}
	return false;
};

// The nearest top edge keeps what's in view in place when the page reflows.
const anchorOf = (doc) => {
	const view = doc?.defaultView;
	if (!view) return { scrollY: 0 };
	const nearest = [...doc.querySelectorAll(`[${ID}]`)]
		.map((element) => ({ element, box: element.getBoundingClientRect() }))
		.filter(
			({ box }) =>
				box.height > 0 && box.bottom > 0 && box.top < view.innerHeight,
		)
		.sort((a, b) => Math.abs(a.box.top) - Math.abs(b.box.top))
		.find(({ element }) => !pinned(element));
	return {
		scrollY: view.scrollY,
		id: nearest?.element.getAttribute(ID),
		type: nearest?.element.getAttribute(TYPE),
		top: nearest?.box.top,
	};
};

const lineUp = (doc, anchor) => {
	const view = doc.defaultView;
	const block = anchor.id && doc.querySelector(`[${ID}="${anchor.id}"]`);
	// Ids follow position, so an inserted block can pass this id to another block.
	const found = block && block.getAttribute(TYPE) === anchor.type;
	const top =
		anchor.scrollY && found
			? view.scrollY + block.getBoundingClientRect().top - anchor.top
			: anchor.scrollY;
	view.scrollTo({ top, behavior: 'instant' });
};

const STILL = 'extendify-agentx-still';

// Scroll classes, like a sticky header's, land after load, and their transitions would play on screen.
const pauseTransitions = (doc) => {
	// Two switches can wait on one page, and a second rule would outlive the first's resume.
	if (doc.getElementById(STILL)) return;
	const style = doc.createElement('style');
	style.id = STILL;
	// Entrance animations wait too, so they play once, when the page shows, not out of sight.
	style.textContent =
		'*, *::before, *::after { transition: none !important; animation-play-state: paused !important; }';
	(doc.head ?? doc.documentElement).append(style);
};

const resumeTransitions = (doc) => doc?.getElementById(STILL)?.remove();

// Scroll observers report a frame after the scroll.
const settle = () =>
	new Promise((resolve) =>
		requestAnimationFrame(() => requestAnimationFrame(resolve)),
	);

// Lined up once styled, so the fonts and images awaited are the ones in view.
const ready = async (frame, before, anchor, parseMs = PARSE_MS) => {
	const doc = await parsed(frame, before, parseMs);
	if (!doc) return null;
	pauseTransitions(doc);
	await Promise.race([styled(doc), wait(SETTLE_MS)]);
	lineUp(doc, anchor());
	await Promise.race([painted(doc), wait(SETTLE_MS)]);
	return doc;
};

// A link or Back in the old page starts a page the swap would cover up.
const leaves = (frame, signal) =>
	new Promise((resolve) =>
		frame.contentWindow.navigation?.addEventListener(
			'navigate',
			({ destination, downloadRequest }) => {
				if (!destination.sameDocument && downloadRequest === null) {
					resolve(LEFT);
				}
			},
			{ signal },
		),
	);

const createStandIn = (frame, href) => {
	const next = document.createElement('iframe');
	for (const name of ['class', 'sandbox', 'allow']) {
		next.setAttribute(name, frame.getAttribute(name));
	}
	next.id = 'extendify-agentx-site-stand-in';
	next.style.cssText = frame.style.cssText;
	next.style.opacity = '0';
	next.inert = true;
	next.setAttribute('aria-hidden', 'true');
	// Set before it's added, so the load replaces its blank page instead of adding to history.
	next.src = href;
	(standIn ?? frame).after(next);
	return next;
};

const cover = () => document.getElementById('extendify-agentx-site-cover');
const spinner = () => document.getElementById('extendify-agentx-site-spinner');

const duration = (name) => {
	const value = getComputedStyle(document.body).getPropertyValue(name).trim();
	return parseFloat(value) * (value.endsWith('ms') ? 1 : 1000);
};

const fade = (elements, opacity) =>
	animate(elements, { opacity }, { duration: opacity ? 0.2 : 0.15 });

const showCover = ({ quiet = false } = {}) => {
	useShellStore.setState({ siteLoading: true });
	if (quiet) return;
	// A running plan blurs all but its step's block instead.
	if (usePlanStore.getState().plan) return;
	// The floating chat in wp-admin has no site to cover.
	if (!cover()) return;
	cover().style.pointerEvents = 'auto';
	fade([cover(), spinner()], 1);
};

const hideCover = () => {
	if (switching || slow || clicked || restyling) return;
	useShellStore.setState({ siteLoading: false });
	if (!cover()) return;
	cover().style.pointerEvents = 'none';
	fade([cover(), spinner()], 0);
};

// A clicked change can take seconds to render, so the site shows it's loading.
export const coverWhile = async (call) => {
	clicked++;
	showCover();
	try {
		return await call();
	} finally {
		clicked--;
		hideCover();
	}
};

// The browser fires the frame's navigate event inside this call.
const replaceSite = (frame, href) => {
	replacing = true;
	frame.contentWindow.location.replace(href);
	replacing = false;
};

const reload = async (frame, href, anchor) => {
	const before = frame.contentDocument;
	replaceSite(frame, href);
	resumeTransitions(await ready(frame, before, () => anchor, GIVE_UP_MS));
};

// A switch replaces the frame, so a patch made meanwhile would be lost.
export const patchable = () => !switching && !standIn;

// A replace keeps Back from stepping through previews.
export const switchSite = async (
	frame,
	href,
	{ top = false, quiet = false } = {},
) => {
	const turn = ++latest;
	const current = () => turn === latest;
	const shown = () =>
		top ? { scrollY: 0 } : anchorOf((standIn ?? frame).contentDocument);
	const end = () => {
		standIn?.remove();
		standIn = null;
		switching = false;
		hideCover();
	};

	const coveredAt = performance.now();
	switching = true;
	showCover({ quiet });
	const next = createStandIn(frame, href);
	const watching = new AbortController();
	const doc = await Promise.race([
		ready(next, next.contentDocument, shown),
		leaves(frame, watching.signal),
	]);
	watching.abort();
	if (!current()) {
		next.remove();
		return;
	}
	if (doc === LEFT || !doc) {
		next.remove();
		// A page slower than the stand-in's wait keeps the cover, or the old page would read as the change.
		if (!doc) await reload(frame, href, shown());
		if (current()) end();
		return;
	}

	lineUp(doc, shown());
	await settle();
	if (!current()) {
		next.remove();
		return;
	}
	next.style.opacity = '';
	standIn?.remove();
	standIn = next;
	// Lifted sooner, the blur reads as a flicker.
	const held = wait(
		duration('--agentx-switch-hold') - (performance.now() - coveredAt),
	).then(() => {
		// A page with animations stays covered until the frame itself shows it, so they play once, in view.
		if (current() && !playsOnTime(doc)) {
			fade([cover(), spinner()], 0);
		}
	});

	// Keeping the stand-in instead would drop the site frame's history, and Back with it.
	const before = frame.contentDocument;
	replaceSite(frame, href);
	const back = await ready(frame, before, () => anchorOf(doc));
	if (!current()) return;
	if (back) {
		lineUp(back, anchorOf(doc));
		await settle();
	}
	await held;
	if (!current()) return;
	end();
	resumeTransitions(back);
};

// A color pick's own colors, shown until the page's styles for it arrive.
const guessed = new Set();
const guess = (doc, colors = {}, paint = {}) => {
	const set = (name, value) => {
		doc.documentElement.style.setProperty(name, value);
		guessed.add(name);
	};
	for (const [slug, color] of Object.entries(colors)) {
		set(`--wp--preset--color--${slug}`, color);
	}
	for (const [name, value] of Object.entries(paint)) set(name, value);
	// The window's own background repaints only when its rule changes, not a variable it reads.
	if (colors.background) set('background-color', colors.background);
};
const unguess = (doc) => {
	for (const name of guessed) doc.documentElement.style.removeProperty(name);
	guessed.clear();
};

// A design pick restyles the open page; a full load cost every pick several page renders.
// A duotone is a filter in the page's markup, so its colors change in place.
const channelsOf = (hex = '') => {
	const digits = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex)?.[1];
	if (!digits) return null;
	const full =
		digits.length === 3
			? [...digits].map((digit) => digit + digit).join('')
			: digits;
	return [0, 2, 4].map(
		(at) => Number.parseInt(full.slice(at, at + 2), 16) / 255,
	);
};
const tint = (doc, duotone = {}) => {
	for (const [slug, pair] of Object.entries(duotone)) {
		const filter = doc.getElementById(`wp-duotone-${slug}`);
		const channels = (pair ?? []).map(channelsOf);
		if (!filter || channels.length !== 2 || !channels.every(Boolean)) continue;
		['R', 'G', 'B'].forEach((name, at) => {
			filter
				.querySelector(`feFunc${name}`)
				?.setAttribute(
					'tableValues',
					channels.map((each) => each[at]).join(' '),
				);
		});
	}
};

export const restyleSite = async (
	frame,
	href,
	{ colors, paint, duotone } = {},
) => {
	const live = frame.contentDocument;
	if (!live || !patchable()) return switchSite(frame, href);
	const turn = ++latest;
	guess(live, colors, paint);
	tint(live, duotone);
	restyling++;
	showCover({ quiet: true });
	try {
		const done = await restylePage(frame, {
			from: frame.contentWindow.location.href,
			href,
			current: () => turn === latest,
		}).catch(() => false);
		// A newer pick or page owns the frame, and the guess with it.
		if (turn !== latest) return;
		unguess(live);
		if (!done) await switchSite(frame, href);
	} finally {
		restyling--;
		hideCover();
	}
};

// Any other page the site frame is slow to show gets the switch's cover until it loads.
export const coverSlowPages = (frame) => {
	const watching = new AbortController();
	const { signal } = watching;
	let timers = [];
	let leaving;
	let from;
	let moves = 0;
	let jumps = 0;
	let pages = 0;
	const stop = () => {
		for (const timer of timers) clearTimeout(timer);
		timers = [];
		leaving = undefined;
		pages++;
		if (!slow) return;
		slow = false;
		hideCover();
	};
	const start = (event) => {
		moves++;
		// The API reports the page on its way as aborted, but the browser keeps loading it.
		if (event.destination.sameDocument) {
			if (leaving) jumps++;
			return;
		}
		stop();
		if (replacing || event.downloadRequest !== null) return;
		leaving = frame.contentDocument;
		from = event.target.currentEntry;
		jumps = 0;
		timers = [
			setTimeout(() => {
				slow = true;
				showCover();
			}, SLOW_MS),
			setTimeout(stop, GIVE_UP_MS),
		];
		shows(leaving);
	};
	// Not the load event, which waits on every image and embed down the page.
	const shows = async (before) => {
		const page = pages;
		const doc = await parsed(frame, before, GIVE_UP_MS);
		if (!doc) return;
		// Its links can be clicked before the load event would watch them.
		watch();
		if (page !== pages) return;
		await Promise.race([styled(doc), wait(SETTLE_MS)]);
		await Promise.race([painted(doc), wait(SETTLE_MS)]);
		if (page === pages) stop();
	};
	const succeeded = () => {
		if (!jumps) return stop();
		jumps--;
	};
	const failed = ({ target }) => {
		// Only a page the site's own script shows has a transition.
		if (target.transition?.from === from) return stop();
		const at = moves;
		// Fired just before the navigate of a navigation that replaces it.
		setTimeout(() => moves === at && stop());
	};
	const watch = () => {
		try {
			const { navigation } = frame.contentWindow;
			navigation?.addEventListener('navigate', start, { signal });
			navigation?.addEventListener('navigatesuccess', succeeded, { signal });
			navigation?.addEventListener('navigateerror', failed, { signal });
		} catch {
			// Another site's page, like a payment gateway's, can't be read.
		}
	};
	const loaded = () => {
		// The old page can finish loading while the new one is on its way.
		if (frame.contentDocument !== leaving) stop();
		watch();
	};
	frame.addEventListener('load', loaded, { signal });
	frame.addEventListener('extendify-agentx-page', watch, { signal });
	watch();
	return () => {
		watching.abort();
		for (const timer of timers) clearTimeout(timer);
		slow = false;
	};
};
