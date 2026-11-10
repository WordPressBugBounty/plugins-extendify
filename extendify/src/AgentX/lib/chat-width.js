const WIDEST_DEFAULT = 480;
// Cards are laid out for the first agent's 384px sidebar, so the chat never goes narrower.
const NARROWEST = 384;
// The chat's side padding, its gap and the shell's right edge.
const AROUND = 68;

// On a smaller window the site keeps half of it, down to the narrowest chat.
export const chatWidthBounds = (windowWidth) => {
	const half = Math.floor(windowWidth / 2 - AROUND);
	const width = Math.max(NARROWEST, Math.min(WIDEST_DEFAULT, half));
	return {
		default: width,
		min: NARROWEST,
		max: Math.max(width, Math.min(width * 1.5, half)),
	};
};

// Kept as a share of the default, so a chosen width still follows the window.
export const chatWidthFor = (scale, windowWidth) => {
	const { default: width, min, max } = chatWidthBounds(windowWidth);
	return Math.min(max, Math.max(min, Math.round(width * (scale ?? 1))));
};

export const chatScaleFor = (width, windowWidth) => {
	const { default: from, min, max } = chatWidthBounds(windowWidth);
	return Math.min(max, Math.max(min, width)) / from;
};
