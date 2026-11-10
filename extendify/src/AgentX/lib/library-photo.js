import { siteFrame } from '@agentx/lib/block-box';
import apiFetch from '@wordpress/api-fetch';

// The image library's photos only, so an op can't put just any address on the page.
const LIBRARY = 'https://images.unsplash.com/';
const MOST_SHOWN = 60;

// The picked part alone misses the page's other photos, so the backend could pick one again.
export const photosOnPage = () => {
	const images = siteFrame()?.contentDocument?.images ?? [];
	const names = [...images].map((image) =>
		(image.currentSrc || image.src).split('?')[0].split('/').pop(),
	);
	return [...new Set(names)]
		.filter((name) => name.startsWith('photo-'))
		.slice(0, MOST_SHOWN);
};

// The draft takes only media library pictures, so a found photo is uploaded first.
export const libraryPhoto = async ({ url, alt }) => {
	if (typeof url !== 'string' || !url.startsWith(LIBRARY)) return null;
	const response = await fetch(url);
	if (!response.ok) return null;
	const blob = await response.blob();
	// Named for the photo, so the next copy can tell the page already shows it.
	const name = `${url.slice(LIBRARY.length).split('?')[0]}.jpg`;
	const body = new FormData();
	body.append(
		'file',
		new File([blob], name, { type: blob.type || 'image/jpeg' }),
		name,
	);
	if (alt) body.append('alt_text', alt);
	const media = await apiFetch({ path: '/wp/v2/media', method: 'POST', body });
	return media?.id ? { id: media.id, ...(alt && { alt }) } : null;
};
