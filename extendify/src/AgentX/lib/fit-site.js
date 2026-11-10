export const PHONE_WIDTH = 390;
export const PHONE_HEIGHT = 844;

export const fitSite = ({ width, height }, windowWidth) => {
	const scale = width / windowWidth;
	return { width: windowWidth, height: height / scale, scale };
};

// Thumbnails pass no width and show the site at the window's.
export const scaleSite = (site, viewWidth = () => window.innerWidth) => {
	const box = site.parentElement;
	const observer = new ResizeObserver(([{ contentRect }]) => {
		const { width, height, scale } = fitSite(contentRect, viewWidth());
		// A switch's stand-in frame shows in the same box, at the same size.
		for (const frame of box.getElementsByTagName('iframe')) {
			// Plain inline sizes lose to the bundle's !important size-full.
			frame.style.setProperty('width', `${width}px`, 'important');
			frame.style.setProperty('height', `${height}px`, 'important');
			frame.style.transform = `scale(${scale})`;
		}
	});
	observer.observe(box);
	return () => observer.disconnect();
};
