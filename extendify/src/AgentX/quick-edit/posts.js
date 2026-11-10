import { showSaved } from '@agentx/lib/settings';
import apiFetch from '@wordpress/api-fetch';

// WordPress's own routes for the kinds of posts a page or a list of posts shows.
const ROUTES = { post: 'posts', page: 'pages' };

export const canUpdate = ({ type }) => type in ROUTES;

// Saved live, like a product, since a post's excerpt and featured image sit outside any page's blocks.
export const updatePost = async ({ id, type }, data) => {
	const saved = await apiFetch({
		path: `/wp/v2/${ROUTES[type]}/${id}`,
		method: 'POST',
		data,
	});
	await showSaved();
	return saved;
};
