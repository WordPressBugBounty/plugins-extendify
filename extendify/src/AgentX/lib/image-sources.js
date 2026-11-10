import { AI_HOST } from '@constants';
import { useImageGenerationStore } from '@shared/state/generate-images';
import { __ } from '@wordpress/i18n';
import { addQueryArgs } from '@wordpress/url';

const { siteId, partnerId, wpLanguage, wpVersion } = window.extSharedData ?? {};

// Only ids and the language leave the site, never its profile, which can hold contact details.
const site = Object.fromEntries(
	Object.entries({ siteId, partnerId, wpLanguage, wpVersion }).filter(
		([, value]) => value != null,
	),
);

const creditsFrom = (headers) => {
	const read = (name) =>
		headers.get(name) === null ? null : Number(headers.get(name));
	return {
		remaining: read('x-ratelimit-remaining'),
		total: read('x-ratelimit-limit'),
	};
};

const generateFailure = (status) => {
	if (status === 'content_policy_violation')
		// translators: shown when the AI image generator refuses a prompt on safety grounds.
		return __(
			'That request was blocked by our safety system. Try a different description.',
			'extendify-local',
		);
	if (status === 'no_image_returned')
		// translators: shown when the AI image generator returns nothing, cause unknown.
		return __(
			"Couldn't create that image. Try describing it differently.",
			'extendify-local',
		);
	if (status === 'rate-limit-exceeded')
		// translators: Shown in the AI Agent's image sheet when the site has used all of today's image generations.
		return __("You're out of image credits for today.", 'extendify-local');
	return __('Service temporarily unavailable', 'extendify-local');
};

// Each search is asked once per page load, so coming back to a tab doesn't ask again.
const searched = new Map();

export const stockImages = (query) => {
	if (!searched.has(query))
		searched.set(
			query,
			fetch(
				addQueryArgs(`${AI_HOST}/api/draft/image/unsplash`, {
					...site,
					query,
					source: 'user',
				}),
			)
				.then(async (response) => {
					if (!response.ok) throw new Error(`Stock search ${response.status}`);
					const requestId = response.headers.get('x-request-id');
					return (await response.json()).map((photo) => ({
						id: photo.id,
						url: photo.urls.regular,
						thumb: photo.urls.small,
						name: photo.alt_description ?? '',
						width: photo.width,
						height: photo.height,
						requestId,
					}));
				})
				// A failed search is asked again next time.
				.catch((error) => {
					searched.delete(query);
					throw error;
				}),
		);
	return searched.get(query);
};

export const generateImage = async (prompt, signal) => {
	const response = await fetch(`${AI_HOST}/api/draft/image`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		signal,
		body: JSON.stringify({
			...site,
			prompt,
			source: 'agent',
			quality: 'low',
			size: '1024x1024',
			globalState: {
				imageCredits: useImageGenerationStore.getState().imageCredits,
			},
		}),
	});
	const credits = creditsFrom(response.headers);
	// A timeout's error page isn't JSON.
	const body = await response.json().catch(() => null);
	if (!response.ok || !body?.[0]?.url)
		throw { message: generateFailure(body?.status), credits };
	return {
		image: {
			id: response.headers.get('x-request-id'),
			url: body[0].url,
			name: body[0].alt ?? prompt,
			requestId: response.headers.get('x-request-id'),
		},
		credits,
	};
};

// Counts the pick for the image library's reports; a failed ping never stops the save.
export const countPick = ({ source, image }) => {
	if (!image.requestId) return;
	fetch(`${AI_HOST}/api/draft/image/download`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(
			source === 'stock'
				? { id: image.requestId, source: 'unsplash', unsplashId: image.id }
				: { id: image.requestId, source: 'ai-generated', disclose: false },
		),
	}).catch(() => {});
};
