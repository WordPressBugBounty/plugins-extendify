import { PICKS } from '@agentx/lib/draft';
import { useDraftStore } from '@agentx/state/draft';
import { __ } from '@wordpress/i18n';

export const pageUrl = (href) => {
	const url = new URL(href);
	url.searchParams.delete('extendify-frame');
	for (const param of Object.values(PICKS)) url.searchParams.delete(param);
	url.searchParams.delete('extendify-draft');
	url.searchParams.delete('extendify-draft-at');
	url.searchParams.delete('extendify-logo');
	return url.href;
};

const showUrl = (href) => {
	const url = pageUrl(href);
	if (url !== window.location.href) {
		window.history.replaceState(null, '', url);
	}
};

// Set when the user already said to leave, or the shell reloads itself, so the browser doesn't ask again.
let leaving = false;

// Covers the next unload only; a navigation that never happens leaves the guard on.
export const leaveWithoutAsking = () => {
	leaving = true;
	setTimeout(() => {
		leaving = false;
	}, 1000);
};

// A reload or closed tab keeps the changes, but leaves them unsaved where the user can't see them.
const askBeforeUnload = (event) => {
	if (leaving || !useDraftStore.getState().unsaved) return;
	event.preventDefault();
	event.returnValue = '';
};

// Replace, or Back lands on a shell that falls back again.
const showOnItsOwn = () => {
	leaveWithoutAsking();
	const url = new URL(window.location.href);
	url.searchParams.set('extendify-agent', 'bypass');
	window.location.replace(url);
};

// At the start, so a refresh during a slow load lands on the new page.
const followNavigation = (event) => {
	if (event.downloadRequest !== null) return;
	const url = new URL(event.destination.url);
	if (url.origin === window.location.origin) {
		showUrl(url.href);
		return;
	}

	// Another site, like a payment gateway, can't be followed and often refuses frames.
	if (!event.cancelable || event.formData || !url.protocol.startsWith('http')) {
		return;
	}
	event.preventDefault();
	window.location.assign(url);
};

export const leavesShell = (url, leaveUrls) => {
	// The slash matches /wp-admin itself but not a page at /wp-admin-tips/.
	const path = `${url.origin}${url.pathname}/`;
	return leaveUrls.some((leave) => path.startsWith(leave));
};

const linkRule = (leaveUrls) => (event) => {
	const link = event.target.closest?.('a[href]');
	if (!link || event.defaultPrevented || event.button !== 0) return;
	if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
	if (link.hasAttribute('download')) return;
	if (!['', '_self'].includes(link.getAttribute('target') ?? '')) return;

	const url = new URL(link.getAttribute('href'), link.baseURI);
	if (!['http:', 'https:'].includes(url.protocol)) return;

	if (url.origin !== window.location.origin) {
		event.preventDefault();
		window.open(url, '_blank', 'noopener');
		return;
	}

	if (!leavesShell(url, leaveUrls)) return;
	event.preventDefault();
	const stay =
		useDraftStore.getState().unsaved &&
		!window.confirm(
			// translators: Asked before a link takes the user from the AI Agent to a page outside it, like the WordPress dashboard, while the agent holds changes the user has not saved yet.
			__(
				"Your changes aren't saved yet, so they won't show outside the agent. Leave anyway?",
				'extendify-local',
			),
		);
	if (stay) return;
	leaveWithoutAsking();
	window.location.assign(url);
};

export const followSite = (frame, { leaveUrls }) => {
	const onClick = linkRule(leaveUrls);
	const follow = () => {
		const site = frame.contentWindow;
		try {
			if (!site.location.protocol.startsWith('http')) return;
		} catch {
			// X-Frame-Options or frame-ancestors left an error page the shell can't read.
			showOnItsOwn();
			return;
		}

		showUrl(site.location.href);
		document.title = site.document.title || document.title;
		site.addEventListener('click', onClick);
		site.navigation?.addEventListener('navigate', followNavigation);
	};

	window.addEventListener('beforeunload', askBeforeUnload);
	frame.addEventListener('load', follow);
	// The frame view fires this from each page's head, before load.
	frame.addEventListener('extendify-agentx-page', follow);
	// The site can finish loading before this attaches.
	follow();
};
