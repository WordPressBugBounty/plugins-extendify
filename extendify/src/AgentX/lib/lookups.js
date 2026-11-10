import { digest } from '@shared/api/digest';
import apiFetch from '@wordpress/api-fetch';
import { addQueryArgs } from '@wordpress/url';

const SHORT = 300;
const LONG = 600;

const plain = (html, cap) => {
	const { body } = new DOMParser().parseFromString(html ?? '', 'text/html');
	return body.textContent.replace(/\s+/g, ' ').trim().slice(0, cap);
};

const products = async () => {
	const found = await apiFetch({
		path: addQueryArgs('/wc/v3/products', {
			per_page: 10,
			orderby: 'date',
			order: 'desc',
			status: 'publish',
			_fields: 'id,name,price,short_description,description',
		}),
	});
	return found.map((product) => ({
		id: product.id,
		name: plain(product.name),
		price: product.price,
		shortDescription: plain(product.short_description, SHORT),
		description: plain(product.description, LONG),
	}));
};

const LOOKUPS = { products };

// Kept while the agent is open, so a second product request needs no second fetch.
const looked = {};
const running = {};

const run = (name) => {
	running[name] ??= LOOKUPS[name]()
		.catch((error) => {
			digest({
				error,
				details: { source: 'agentx', caller: `look-up:${name}` },
			});
			return [];
		})
		.then((result) => {
			looked[name] = result;
			return result;
		});
	return running[name];
};

export const lookups = () => ({ ...looked });

export const lookUp = async ({ names = [] } = {}) => {
	const known = names.filter((name) => name in LOOKUPS);
	const results = await Promise.all(known.map(run));
	return {
		found: Object.fromEntries(
			known.map((name, at) => [name, results[at].length]),
		),
	};
};
