import { useLayoutEffect, useRef, useState } from '@wordpress/element';

const VIEWPORT_WIDTH = Math.max(window.innerWidth, 1400);

export const useIframeScale = () => {
	const containerRef = useRef(null);
	const bodyObserverRef = useRef(null);
	const [scale, setScale] = useState(1);
	const [contentHeight, setContentHeight] = useState(null);

	useLayoutEffect(() => {
		const el = containerRef.current;
		if (!el) return;
		const obs = new ResizeObserver(([entry]) => {
			setScale(entry.contentRect.width / VIEWPORT_WIDTH);
		});
		obs.observe(el);
		return () => {
			obs.disconnect();
			bodyObserverRef.current?.disconnect();
		};
	}, []);

	const handleIframeLoad = (e) => {
		const iframeDoc = e.target.contentDocument;
		if (!iframeDoc?.body) return;

		const updateHeight = () => {
			const height = iframeDoc.body.scrollHeight;
			if (height) setContentHeight(height);
		};

		updateHeight();

		bodyObserverRef.current?.disconnect();
		const obs = new ResizeObserver(updateHeight);
		obs.observe(iframeDoc.body);
		bodyObserverRef.current = obs;
	};

	return { containerRef, scale, contentHeight, handleIframeLoad };
};
