import { deepMerge } from '@shared/lib/utils';
import {
	preserveVibeSettings,
	preserveVibeStyles,
	vibeGlobalsEntry,
} from '@shared/lib/vibe-globals';
import { getVibes, vibesBySlug } from '@shared/lib/vibes';
import apiFetch from '@wordpress/api-fetch';

const { globalStylesPostID } = window.extSharedData;

// The vibe layer keeps its owned leaves even when the variation declares them.
export default async ({ variation }) => {
	const [current, vibes] = await Promise.all([
		apiFetch({
			path: `/wp/v2/global-styles/${globalStylesPostID}?context=edit`,
		}),
		getCurrentVibes(),
	]);

	const merged = deepMerge(
		{ settings: current.settings, styles: current.styles },
		variation,
	);

	return apiFetch({
		method: 'POST',
		path: `/wp/v2/global-styles/${globalStylesPostID}`,
		data: {
			id: globalStylesPostID,
			settings: preserveVibeSettings({
				mergedSettings: merged.settings,
				currentSettings: current.settings,
				vibes,
			}),
			styles: preserveVibeStyles({
				mergedStyles: merged.styles,
				currentStyles: current.styles,
				vibes,
			}),
		},
	});
};

const getCurrentVibes = async () => {
	try {
		const { data } = await apiFetch({
			path: '/extendify/v1/launch/options?option=extendify_siteStyle',
		});
		const selectedVibe = data?.vibe || 'natural-1';
		const payloads = await getVibes(`agent,${selectedVibe}`);
		// Widening to the served set purges leaves this vibe never declared.
		const entry = vibeGlobalsEntry(vibesBySlug(payloads), selectedVibe);
		return entry ? { [selectedVibe]: entry } : {};
	} catch {
		// No payloads means no ownership map; the merged document ships as-is.
		return {};
	}
};
