import { foundPhotos } from '@agentx/lib/find-photo';
import { libraryPhoto } from '@agentx/lib/library-photo';
import apiFetch from '@wordpress/api-fetch';

const escaped = (text) =>
	text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const blockOf = ({ kind, text }) =>
	kind === 'heading'
		? `<!-- wp:heading -->\n<h2 class="wp-block-heading">${escaped(text)}</h2>\n<!-- /wp:heading -->`
		: `<!-- wp:paragraph -->\n<p>${escaped(text)}</p>\n<!-- /wp:paragraph -->`;

// A photo that won't load leaves the post without one, never without the post.
const featuredPhoto = async (photo) => {
	for (const url of await foundPhotos(photo, 'agentx-post')) {
		const media = await libraryPhoto({ url, alt: photo }).catch(() => null);
		if (media) return media;
	}
	return null;
};

export const makePost = async ({ title, content, photo }, step = () => {}) => {
	step('photo');
	const media = photo ? await featuredPhoto(photo) : null;
	step('post');
	return apiFetch({
		path: '/wp/v2/posts',
		method: 'POST',
		data: {
			title,
			status: 'draft',
			content: content.map(blockOf).join('\n\n'),
			...(media && { featured_media: media.id }),
		},
	});
};
