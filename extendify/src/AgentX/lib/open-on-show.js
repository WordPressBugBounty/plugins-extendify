const open = () => {
	const url = new URL(window.location.href);
	url.searchParams.set('extendify-agent', 'open');
	fetch(url, { redirect: 'manual' });
};

// A prerender may never be shown, so it can't set the open cookie itself.
export const openOnShow = () => {
	if (document.prerendering) {
		document.addEventListener('prerenderingchange', open, { once: true });
		return;
	}
	const [navigation] = performance.getEntriesByType('navigation');
	if (navigation?.activationStart > 0) open();
};
