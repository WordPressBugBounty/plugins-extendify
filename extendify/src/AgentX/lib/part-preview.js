import {
	coverHovered,
	openAround,
	scrollToBlock,
	siteFrame,
	unhover,
} from '@agentx/lib/block-box';
import { blockById } from '@agentx/lib/pick-block';

const MOST_FRAMES = 20;

// A hidden part measures as in view, so the scroll waits for its item to open.
const whenShown = (element, then, frames = MOST_FRAMES) => {
	if (element.checkVisibility?.() !== false || frames <= 0) {
		then();
		return;
	}
	element.ownerDocument.defaultView.requestAnimationFrame(() =>
		whenShown(element, then, frames - 1),
	);
};

// Two parts can say the same words, so a card outlines the one it means on the page.
export const showPart = (block) => {
	const doc = siteFrame()?.contentDocument;
	const element = doc && block ? blockById(doc, block) : null;
	if (!element) return null;
	// An answer inside a closed accordion item would outline nothing.
	openAround(element);
	const box = coverHovered(element);
	whenShown(element, () => scrollToBlock(element));
	return box;
};

const FLASH_MS = 600;
const FADE_MS = 300;

// A tap has no hover to hold the outline, so a click shows it for a moment, then fades it.
export const flashPart = (block) => {
	const box = showPart(block);
	if (!box) return;
	box.style.transition = `opacity ${FADE_MS}ms`;
	setTimeout(() => {
		box.style.opacity = '0';
		// A hover since then drew its own box, which this mustn't take down.
		setTimeout(() => box.isConnected && unhover(box.ownerDocument), FADE_MS);
	}, FLASH_MS);
};

export const hidePart = () => {
	const doc = siteFrame()?.contentDocument;
	if (doc) unhover(doc);
};
