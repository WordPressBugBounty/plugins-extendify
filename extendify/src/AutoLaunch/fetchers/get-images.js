import { getImagesShape } from '@auto-launch/fetchers/shape';
import {
	failWithFallback,
	fetchWithTimeout,
	reqDataBasics,
	retryTwice,
	setStatus,
} from '@auto-launch/functions/helpers';
import { IMAGES_HOST } from '@constants';
import { __ } from '@wordpress/i18n';

const fallback = { siteImages: [] };
const url = `${IMAGES_HOST}/api/search`;
const method = 'POST';
const headers = { 'Content-Type': 'application/json' };

export const handleSiteImages = async ({ siteProfile }) => {
	// translators: this is for a action log UI. Keep it short
	setStatus(__('Finding the perfect images', 'extendify'));

	const body = JSON.stringify({
		...reqDataBasics,
		siteProfile,
		source: 'auto-launch',
	});

	const response = await retryTwice(() =>
		fetchWithTimeout(url, { method, headers, body }),
	);

	if (!response?.ok) return fallback;

	return failWithFallback(
		async () => getImagesShape.parse(await response.json()),
		fallback,
	);
};
