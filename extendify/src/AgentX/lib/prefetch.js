import { leavesShell } from '@agentx/lib/follow-site';
import { useEffect, useRef } from '@wordpress/element';

const HOVER_MS = 50;
// Matches the frame's private max-age, after which the cached page is stale.
const FRESH_MS = 15000;

// The same links WordPress's own speculative loading leaves alone.
export const eligible = (link, site, leaveUrls) => {
	if (!['', '_self'].includes(link.getAttribute('target') ?? '')) return false;
	if (link.hasAttribute('download') || link.relList.contains('nofollow'))
		return false;
	const url = new URL(link.getAttribute('href'), link.baseURI);
	if (url.origin !== window.location.origin || url.search) return false;
	if (/^\/wp-[^/]*\.php|^\/wp-content\//.test(url.pathname)) return false;
	if (leavesShell(url, leaveUrls)) return false;
	return url.pathname !== site.location.pathname;
};

// A fetch can't send Sec-Fetch-Dest: iframe, so only a frame warms the click's cache entry.
const loadHidden = (href) => {
	const hidden = document.createElement('iframe');
	// Scripts stay off; an opaque origin would cache fonts apart from the site's.
	hidden.setAttribute('sandbox', 'allow-same-origin');
	hidden.setAttribute('aria-hidden', 'true');
	hidden.tabIndex = -1;
	hidden.style.cssText =
		'position:fixed;width:0;height:0;border:0;visibility:hidden';
	hidden.addEventListener('load', () => hidden.remove(), { once: true });
	hidden.src = href;
	document.body.append(hidden);
	return hidden;
};

// Matches a preview's private max-age, after which the cached page is stale.
const PREVIEW_FRESH_MS = 5 * 60 * 1000;
// Mirrors the browser cache, which every warm-up on this page shares.
const warmedAt = new Map();

const loadFramed = (href, signal) => {
	const hidden = loadHidden(href);
	return new Promise((resolve) => {
		const done = ({ type }) => {
			hidden.remove();
			signal.removeEventListener('abort', done);
			resolve(type === 'load');
		};
		hidden.addEventListener('load', done, { once: true });
		signal.addEventListener('abort', done, { once: true });
	});
};

// A restyle fetches the page's render, so only a fetch warms its cache entry.
const loadFetched = async (href, signal) => {
	try {
		const response = await fetch(href, { credentials: 'same-origin', signal });
		await response.text();
		return response.ok;
	} catch {
		return false;
	}
};

// One at a time, so warming doesn't slow the page on screen.
export const warm = async (hrefs, signal, { fetched = false } = {}) => {
	for (const href of hrefs) {
		if (signal.aborted) return;
		if (Date.now() - (warmedAt.get(href) ?? 0) < PREVIEW_FRESH_MS) continue;
		const startedAt = Date.now();
		const loaded = await (fetched ? loadFetched : loadFramed)(href, signal);
		if (loaded) warmedAt.set(href, startedAt);
	}
};

// A pick changes every preview and each warm is a page render, so after the first only hover warms.
export const useWarmOptions = (active, urlsOf, { fetched = false } = {}) => {
	const warmedOnce = useRef(false);
	const hovered = useRef(null);
	const resting = useRef(null);
	useEffect(() => {
		if (!active || warmedOnce.current) return;
		warmedOnce.current = true;
		const controller = new AbortController();
		warm(urlsOf(), controller.signal, { fetched });
		return () => controller.abort();
	}, [active]);
	useEffect(
		() => () => {
			clearTimeout(resting.current);
			hovered.current?.abort();
		},
		[],
	);
	// A pointer passing over options warms none of them; one resting on an option warms it.
	return (url) => {
		clearTimeout(resting.current);
		if (!active || !url) return;
		resting.current = setTimeout(() => {
			hovered.current?.abort();
			hovered.current = new AbortController();
			warm([url], hovered.current.signal, { fetched });
		}, HOVER_MS);
	};
};

export const prefetchOnHover = (frame, { leaveUrls }) => {
	const fetched = new Map();
	let timer = null;
	let hidden = null;

	const load = (href) => {
		if (Date.now() - (fetched.get(href) ?? 0) < FRESH_MS) return;
		fetched.set(href, Date.now());
		hidden?.remove();
		hidden = loadHidden(href);
	};

	const onOver = (event) => {
		const link = event.target.closest?.('a[href]');
		if (!link || link.contains(event.relatedTarget)) return;
		clearTimeout(timer);
		if (!eligible(link, frame.contentWindow, leaveUrls)) return;
		const href = new URL(link.getAttribute('href'), link.baseURI).href.split(
			'#',
		)[0];
		timer = setTimeout(() => load(href), HOVER_MS);
	};
	// A press starts the real navigation, so a late prefetch would only double it.
	const onPress = () => clearTimeout(timer);
	const onOut = (event) => {
		const link = event.target.closest?.('a[href]');
		if (link && !link.contains(event.relatedTarget)) clearTimeout(timer);
	};

	const attach = () => {
		const site = frame.contentWindow;
		try {
			if (!site.location.protocol.startsWith('http')) return;
		} catch {
			return;
		}
		site.document.addEventListener('mouseover', onOver);
		site.document.addEventListener('pointerdown', onPress);
		site.document.addEventListener('mouseout', onOut);
	};

	frame.addEventListener('load', attach);
	frame.addEventListener('extendify-agentx-page', attach);
	attach();
};
