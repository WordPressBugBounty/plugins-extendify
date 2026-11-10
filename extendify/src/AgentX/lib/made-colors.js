import { designOptions } from '@agentx/lib/design';
import apiFetch from '@wordpress/api-fetch';

const kept = new WeakMap();

// Kept by the site so a card's previews and picks find them by id; once per card.
export const keepMade = (made, { layer = 'colors' } = {}) => {
	if (!kept.has(made)) {
		const asked = apiFetch({
			path: '/extendify/v1/agentx/design/made',
			method: 'POST',
			data: { made, layer },
		});
		asked.catch(() => kept.delete(made));
		kept.set(made, asked);
	}
	return kept.get(made);
};

// Checked on every load, since an autosave can make a made scheme the site's own after the card opened.
const shows = ({ colors }, current) =>
	Object.entries(current).every(([role, color]) => colors[role] === color);

// New values for one color stand alone, since a whole scheme beside them changes colors not asked about.
export const madeOptionsOf = (made) => async (layer) => {
	const [ours, site] = await Promise.all([
		keepMade(made),
		designOptions(layer),
	]);
	const own = made.only ? { options: [], live: [] } : site;
	const live = ours.options.filter((option) =>
		shows(option, site.current.colors),
	);
	return {
		...site,
		options: [...ours.options, ...own.options],
		live: [...live.map(({ id }) => id), ...own.live],
	};
};
