import { designOptions } from '@agentx/lib/design';
import { keepMade } from '@agentx/lib/made-colors';

const SHAPES = ['button', 'card', 'image'];

// An autosave can make a made style the site's own after the card opened.
const shows = (option, current) =>
	SHAPES.every(
		(shape) =>
			JSON.stringify(option[shape]) === JSON.stringify(current?.[shape]),
	);

// The made styles are not finished work, so the picker offers one.
export const madeStylesOf = (styles) => async (layer) => {
	const [ours, site] = await Promise.all([
		keepMade(styles, { layer: 'vibe' }),
		designOptions(layer),
	]);
	const made = ours.options.slice(0, 1);
	const live = made.filter((option) => shows(option, site.current));
	return {
		...site,
		options: [...made, ...site.options],
		live: [...live.map(({ id }) => id), ...site.live],
	};
};
