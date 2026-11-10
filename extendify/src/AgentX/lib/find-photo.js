import { IMAGES_HOST } from '@constants';

const MOST_FOUND = 3;

// The library's url is the full original, often 6000 pixels tall.
const sized = (url) =>
	`${url.split('?')[0]}?w=1080&q=80&fm=jpg&crop=entropy&cs=tinysrgb`;

// A search that won't answer finds nothing, so the caller goes on without a photo.
export const foundPhotos = async (words, source) => {
	const search = new URLSearchParams({
		aiDescription: words,
		aiKeywords: words,
		source,
	});
	const response = await fetch(`${IMAGES_HOST}/api/search?${search}`).catch(
		() => null,
	);
	if (!response?.ok) return [];
	const { siteImages = [] } = await response.json().catch(() => ({}));
	return siteImages
		.filter((url) => typeof url === 'string' && url)
		.slice(0, MOST_FOUND)
		.map(sized);
};
