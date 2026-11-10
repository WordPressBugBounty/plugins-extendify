import { pageUrl } from '@agentx/lib/follow-site';
import { useEffect, useRef, useState } from '@wordpress/element';

// The page the site frame shows, once it has loaded; null before, or on a page the shell can't read.
export const useSitePage = () => {
	const [page, setPage] = useState(null);
	useEffect(() => {
		const frame = document.getElementById('extendify-agentx-site');
		if (!frame) return;
		const read = () => {
			const site = frame.contentWindow;
			try {
				if (!site.location.protocol.startsWith('http')) return;
			} catch {
				return;
			}
			if (site.document.readyState === 'complete') {
				setPage(pageUrl(site.location.href));
			}
		};
		frame.addEventListener('load', read);
		read();
		return () => frame.removeEventListener('load', read);
	}, []);
	return page;
};

export const useInView = (ref) => {
	const [inView, setInView] = useState(false);
	useEffect(() => {
		if (!ref.current) return;
		const observer = new IntersectionObserver(([entry]) =>
			setInView(entry.isIntersecting),
		);
		observer.observe(ref.current);
		return () => observer.disconnect();
	}, [ref]);
	return inView;
};

// A text field matches :focus-visible even when clicked, so whether a Tab brought focus is tracked here.
export const useTabFocus = () => {
	const [tabbedIn, setTabbedIn] = useState(false);
	const lastWasTab = useRef(false);
	useEffect(() => {
		const onKey = (event) => {
			lastWasTab.current = event.key === 'Tab';
		};
		const onPointer = () => {
			lastWasTab.current = false;
		};
		const listen = (target) => {
			target.addEventListener('keydown', onKey, true);
			target.addEventListener('pointerdown', onPointer, true);
		};
		const unlisten = (target) => {
			target.removeEventListener('keydown', onKey, true);
			target.removeEventListener('pointerdown', onPointer, true);
		};
		// A Tab out of the site starts in the frame's own window.
		const frame = document.getElementById('extendify-agentx-site');
		let site = null;
		const follow = () => {
			if (site) unlisten(site);
			try {
				site = frame.contentWindow;
				listen(site);
			} catch {
				site = null;
			}
		};
		listen(window);
		frame?.addEventListener('load', follow);
		if (frame) follow();
		return () => {
			unlisten(window);
			if (site) unlisten(site);
			frame?.removeEventListener('load', follow);
		};
	}, []);
	return {
		tabbedIn,
		onFocus: () => setTabbedIn(lastWasTab.current),
		onBlur: () => setTabbedIn(false),
	};
};

// A key pressed in the site reaches the frame's own window, which a new page replaces.
export const useKeyAnywhere = (onKey) => {
	const latest = useRef(onKey);
	latest.current = onKey;
	useEffect(() => {
		const handle = (event) => latest.current(event);
		const frame = document.getElementById('extendify-agentx-site');
		let site = null;
		const follow = () => {
			site?.removeEventListener('keydown', handle, true);
			try {
				site = frame.contentWindow;
				site.addEventListener('keydown', handle, true);
			} catch {
				site = null;
			}
		};
		window.addEventListener('keydown', handle, true);
		frame?.addEventListener('load', follow);
		if (frame) follow();
		return () => {
			window.removeEventListener('keydown', handle, true);
			site?.removeEventListener('keydown', handle, true);
			frame?.removeEventListener('load', follow);
		};
	}, []);
};
