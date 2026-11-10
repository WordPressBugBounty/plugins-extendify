import { designOptions } from '@agentx/lib/design';
import { keepMade } from '@agentx/lib/made-colors';

const FACES = 'extendify-agentx-made-font-faces';

// The shell lacks fonts the theme doesn't ship, so their faces come with the options.
const addFaces = (options) => {
	let style = document.getElementById(FACES);
	if (!style) {
		style = document.createElement('style');
		style.id = FACES;
		document.head.append(style);
	}
	for (const { faces } of options) {
		if (faces && !style.textContent.includes(faces)) style.textContent += faces;
	}
};

const shows = ({ fonts }, current) =>
	fonts?.heading === current?.fonts?.heading &&
	fonts?.body === current?.fonts?.body;

export const madeFontsOf = (fonts) => async (layer) => {
	const [ours, site] = await Promise.all([
		keepMade(fonts, { layer: 'fonts' }),
		designOptions(layer),
	]);
	addFaces(ours.options);
	const live = ours.options.filter((option) => shows(option, site.current));
	return {
		...site,
		options: [...ours.options, ...site.options],
		live: [...live.map(({ id }) => id), ...site.live],
	};
};
