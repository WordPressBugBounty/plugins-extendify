import {
	centerBlock,
	markBlock,
	siteFrame,
	unhighlight,
} from '@agentx/lib/block-box';
import { blockById } from '@agentx/lib/pick-block';
import { useEffect } from '@wordpress/element';

const EVERY_MS = 200;

// A block's id is its place, so after a swap it named the other block; its section stays put.
const sectionOf = (doc, part) =>
	blockById(doc, part.split('.')[0]) ?? blockById(doc, part);

// Each edit reloads the page through a new frame, so every frame showing it keeps the section sharp.
// A reload keeps its scroll, which can leave an added block out of view.
export const usePlanFocus = (part, turn) => {
	useEffect(() => {
		if (!part) return;
		const covered = new Map();
		const focus = () => {
			const frames =
				siteFrame()?.parentElement?.querySelectorAll('iframe') ?? [];
			for (const frame of frames) {
				const doc = frame.contentDocument;
				if (!doc?.defaultView || doc.readyState !== 'complete') continue;
				const section = sectionOf(doc, part);
				if (!section || covered.get(doc) === section) continue;
				markBlock(section);
				centerBlock(blockById(doc, part) ?? section);
				covered.set(doc, section);
			}
		};
		focus();
		const timer = setInterval(focus, EVERY_MS);
		return () => {
			clearInterval(timer);
			for (const doc of covered.keys()) unhighlight(doc);
		};
	}, [part, turn]);
};
