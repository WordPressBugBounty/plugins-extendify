import { getImagesShape } from '@auto-launch/fetchers/shape';
import { collectBuiltPageImageUrls } from '@auto-launch/functions/get-imported-images';
import {
	failWithFallback,
	fetchWithTimeout,
	retryTwice,
	setStatus,
} from '@auto-launch/functions/helpers';
import { IMAGES_HOST } from '@constants';
import { reqDataBasics } from '@shared/lib/data';
import { __ } from '@wordpress/i18n';

const fallback = { siteImages: [] };
const url = `${IMAGES_HOST}/api/search`;
const method = 'POST';
const headers = { 'Content-Type': 'application/json' };
const MIN_POOL_SIZE = 10;

export const handleSiteImages = async ({ siteProfile, designBuild }) => {
	// translators: this is for a action log UI. Keep it short
	setStatus(__('Finding the perfect images', 'extendify-local'));

	// Reuse the design preview's own images; only search for what is missing.
	const seeded = collectBuiltPageImageUrls(designBuild?.builtPages);
	if (seeded.length >= MIN_POOL_SIZE) return { siteImages: seeded };

	const body = JSON.stringify({
		...reqDataBasics,
		siteProfile,
		source: 'auto-launch',
	});

	const response = await retryTwice(() =>
		fetchWithTimeout(url, { method, headers, body }),
	);

	if (!response?.ok) return { siteImages: seeded };

	const { siteImages: found } = await failWithFallback(
		async () => getImagesShape.parse(await response.json()),
		fallback,
		{ caller: 'handleSiteImages' },
	);

	if (!seeded.length) return { siteImages: found };

	const seededSet = new Set(seeded);
	const topup = found
		.filter((u) => !seededSet.has(u))
		.slice(0, MIN_POOL_SIZE - seeded.length);
	return { siteImages: [...seeded, ...topup] };
};
