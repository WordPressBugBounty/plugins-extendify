import { designOptions } from '@agentx/lib/design';
import { useInView } from '@agentx/lib/hooks';
import { useDraftStore } from '@agentx/state/draft';
import { useEffect, useState } from '@wordpress/element';

const FACES = 'extendify-agentx-font-faces';
// The tiles first on screen; past this wait they show anyway, in a fallback font until theirs arrives.
const FIRST = 8;
const WAIT = 1500;
// A font still loading after this long shows a spinner on its tile.
export const SLOW = 1000;

// The shell lacks the site's fonts, so their faces are added once.
export const addFaces = ({ faces }) => {
	if (!faces || document.getElementById(FACES)) return;
	const style = document.createElement('style');
	style.id = FACES;
	// The theme blocks text until its fonts load, which leaves an option blank for seconds.
	style.textContent = faces.replace(
		/font-display:\s*block/g,
		'font-display:swap',
	);
	document.head.append(style);
};

const stacksOf = (fonts) => [fonts?.heading, fonts?.body].filter(Boolean);

// Shared by every tile and tab, so a remounted tile counts from the first request.
const loading = new WeakMap();
const loadOf = (stack) => {
	const loads = loading.get(document.fonts) ?? new Map();
	loading.set(document.fonts, loads);
	if (!loads.has(stack)) {
		loads.set(stack, {
			at: Date.now(),
			done: document.fonts.load(`1em ${stack}`).catch(() => {}),
		});
	}
	return loads.get(stack);
};

// A sample drawn before its font arrives jumps when it swaps in, so the tiles wait for their fonts.
export const loadFonts = (got) => {
	addFaces(got);
	if (!document.fonts?.load) return Promise.resolve();
	const pairs = [got.current, ...got.options].map(({ fonts } = {}) =>
		stacksOf(fonts).map((stack) => loadOf(stack).done),
	);
	return Promise.race([
		Promise.all(pairs.slice(0, FIRST).flat()),
		new Promise((resolve) => setTimeout(resolve, WAIT)),
	]);
};

export const useSlowFont = (fonts) => {
	const key = stacksOf(fonts).join('|');
	const [slow, setSlow] = useState(false);
	useEffect(() => {
		if (!document.fonts?.load || !key) return;
		const loads = key.split('|').map(loadOf);
		const waited = Date.now() - Math.min(...loads.map(({ at }) => at));
		let live = true;
		const timer = setTimeout(
			() => live && setSlow(true),
			Math.max(0, SLOW - waited),
		);
		Promise.all(loads.map(({ done }) => done)).then(() => {
			clearTimeout(timer);
			if (live) setSlow(false);
		});
		return () => {
			live = false;
			clearTimeout(timer);
		};
	}, [key]);
	return slow;
};

// While the design tool is on screen, whichever tab is open, so Fonts opens with its fonts already there.
export const usePreloadFonts = (ref) => {
	const inView = useInView(ref);
	const version = useDraftStore((state) => state.version);
	useEffect(() => {
		if (inView) designOptions('fonts').then(loadFonts, () => {});
	}, [inView, version]);
};
