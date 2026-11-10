import { showSaved } from '@agentx/lib/settings';
import apiFetch from '@wordpress/api-fetch';

// Woo's ability can't set a photo and needs the product's type for a price; this route takes both.
const PRODUCTS = '/wc/v3/products';

export const loadProduct = (id) =>
	apiFetch({
		path: `${PRODUCTS}/${id}?context=edit&_fields=id,type,regular_price,sale_price,images`,
	});

export const updateProduct = async (id, data) => {
	const product = await apiFetch({
		path: `${PRODUCTS}/${id}`,
		method: 'PUT',
		data,
	});
	await showSaved();
	return product;
};

// The list Woo takes replaces every photo, so the gallery goes along behind the new one.
export const setProductImage = async (id, image) => {
	const { images = [] } = await loadProduct(id);
	const gallery = images.slice(1).filter((each) => each.id > 0);
	return updateProduct(id, {
		images: [{ id: image.id }, ...gallery.map((each) => ({ id: each.id }))],
	});
};
