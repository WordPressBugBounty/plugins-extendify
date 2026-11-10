import { useStoreGuideStore } from '@agentx/state/store-guide';
import apiFetch from '@wordpress/api-fetch';
import { decodeEntities } from '@wordpress/html-entities';
import { __ } from '@wordpress/i18n';
import { addQueryArgs } from '@wordpress/url';

// Every step saves through WooCommerce's own REST routes; the plugin only keeps progress and one read of the store.
const GENERAL = '/wc/v3/settings/general';
const TAXES = '/wc/v3/taxes';
const ZONES = '/wc/v3/shipping/zones';
const PRODUCTS = '/wc/v3/products';

export const refreshStore = async () => {
	const store = await apiFetch({ path: '/extendify/v1/agentx/store-guide' });
	useStoreGuideStore.setState(store);
	return store;
};

export const markStoreDone = async (step) => {
	useStoreGuideStore.setState(({ steps }) => ({
		steps: { ...steps, [step]: 'done' },
	}));
	try {
		useStoreGuideStore.setState(
			await apiFetch({
				path: '/extendify/v1/agentx/store-guide',
				method: 'POST',
				data: { step },
			}),
		);
	} catch {
		// The step shows done at once; a lost save only shows it undone after a reload.
	}
};

const SETTINGS = {
	address: 'woocommerce_store_address',
	city: 'woocommerce_store_city',
	postcode: 'woocommerce_store_postcode',
	country: 'woocommerce_default_country',
	currency: 'woocommerce_currency',
};

const settingIn = (settings, id) => settings.find((each) => each.id === id);

const wcSetting = (id) =>
	apiFetch({ path: `${GENERAL}/${id}` }).then(
		(setting) => setting?.value ?? '',
	);

const saveWcSetting = (id, value) =>
	apiFetch({ path: `${GENERAL}/${id}`, method: 'PUT', data: { value } });

// Tax rates and shipping zones key on the country alone, not Woo's "US:OR" pair.
const baseCountry = () =>
	wcSetting('woocommerce_default_country').then((value) => value.split(':')[0]);

export const loadDetails = async () => {
	const [general, site] = await Promise.all([
		apiFetch({ path: GENERAL }),
		apiFetch({ path: addQueryArgs('/wp/v2/settings', { _fields: 'title' }) }),
	]);
	const settings = general ?? [];
	return {
		// WooCommerce has no store name of its own; it shows the site title.
		name: site?.title ?? '',
		...Object.fromEntries(
			Object.entries(SETTINGS).map(([field, id]) => [
				field,
				settingIn(settings, id)?.value ?? '',
			]),
		),
		countries: settingIn(settings, SETTINGS.country)?.options ?? {},
		currencies: settingIn(settings, SETTINGS.currency)?.options ?? {},
	};
};

export const saveDetails = async ({ name, ...fields }) => {
	const [batch] = await Promise.all([
		apiFetch({
			path: `${GENERAL}/batch`,
			method: 'POST',
			data: {
				update: Object.entries(SETTINGS).map(([field, id]) => ({
					id,
					value: fields[field] ?? '',
				})),
			},
		}),
		apiFetch({
			path: '/wp/v2/settings',
			method: 'POST',
			data: { title: name },
		}),
	]);
	// The batch answers 200 and reports a rejected value on its setting instead.
	const failed = (batch?.update ?? []).find(({ error }) => error);
	if (failed) throw new Error(failed.error.message);
};

const productOf = (product) => {
	// Woo answers for a product with no photo with its placeholder, at id 0.
	const images = (product.images ?? []).filter(({ id }) => id > 0);
	return {
		id: product.id,
		name: decodeEntities(product.name ?? ''),
		price: product.regular_price ?? '',
		salePrice: product.sale_price ?? '',
		description: product.short_description ?? '',
		image: images[0]
			? { id: images[0].id, attachment: true, url: images[0].src }
			: null,
		gallery: images.slice(1).map(({ id }) => id),
	};
};

export const loadProducts = () =>
	apiFetch({
		path: addQueryArgs(PRODUCTS, {
			// The view context runs the words through the_content, which the fields would show wrapped.
			context: 'edit',
			status: 'publish',
			orderby: 'date',
			order: 'asc',
			per_page: 20,
			_fields: 'id,name,regular_price,sale_price,short_description,images',
		}),
	}).then((products) => (products ?? []).map(productOf));

// Woo keeps the two prices as a pair, so a change to either sends both.
const productChanges = (form, was) => {
	const data = {};
	if (form.name.trim() !== was.name) data.name = form.name.trim();
	if (form.description !== was.description) {
		data.short_description = form.description;
	}
	if (form.price !== was.price || form.salePrice !== was.salePrice) {
		data.regular_price = form.price;
		data.sale_price = form.salePrice;
	}
	// Woo's images list replaces the whole set, so the gallery goes along with a new photo.
	if (form.image?.id !== was.image?.id) {
		data.images = [
			...(form.image ? [{ id: form.image.id }] : []),
			...was.gallery.map((id) => ({ id })),
		];
	}
	return data;
};

export const saveProduct = async (form, was) => {
	if (!was) {
		await apiFetch({
			path: PRODUCTS,
			method: 'POST',
			data: {
				type: 'simple',
				status: 'publish',
				name: form.name.trim(),
				regular_price: form.price,
				sale_price: form.salePrice,
				short_description: form.description,
				...(form.image && { images: [{ id: form.image.id }] }),
			},
		});
		return;
	}
	const data = productChanges(form, was);
	if (!Object.keys(data).length) return;
	await apiFetch({ path: `${PRODUCTS}/${was.id}`, method: 'PUT', data });
};

// Without force Woo moves a product to the trash, where WooCommerce can still restore it.
export const removeProduct = (id) =>
	apiFetch({ path: `${PRODUCTS}/${id}`, method: 'DELETE' });

export const OFFLINE = [
	{
		id: 'cod',
		// translators: A way to pay that a store can turn on in the AI Agent's store setup guide.
		title: () => __('Cash on delivery', 'extendify-local'),
		description: () =>
			// translators: Under the Cash on delivery choice in the AI Agent's store setup guide.
			__('You take payment at delivery or pickup.', 'extendify-local'),
	},
	{
		id: 'bacs',
		// translators: A way to pay that a store can turn on in the AI Agent's store setup guide.
		title: () => __('Bank transfer', 'extendify-local'),
		description: () =>
			// translators: Under the Bank transfer choice in the AI Agent's store setup guide.
			__('Customers pay into your bank account.', 'extendify-local'),
	},
];

export const ONLINE = [
	{
		id: 'stripe',
		slug: 'woocommerce-gateway-stripe',
		name: 'Stripe',
		description: () =>
			// translators: Under Stripe, a payment plugin, in the AI Agent's store setup guide.
			__('Cards, Apple Pay and Google Pay.', 'extendify-local'),
	},
	{
		id: 'ppcp-gateway',
		slug: 'woocommerce-paypal-payments',
		name: 'PayPal',
		description: () =>
			// translators: Under PayPal, a payment plugin, in the AI Agent's store setup guide.
			__('PayPal, Venmo and cards.', 'extendify-local'),
	},
];

// A gateway exists only while its plugin is active, so an online one present means installed.
export const loadPayments = async () => {
	const gateways = await apiFetch({ path: '/wc/v3/payment_gateways' });
	const byId = Object.fromEntries(
		(gateways ?? []).map((gateway) => [gateway.id, gateway]),
	);
	return {
		offline: Object.fromEntries(
			OFFLINE.map(({ id }) => [id, Boolean(byId[id]?.enabled)]),
		),
		online: Object.fromEntries(ONLINE.map(({ id }) => [id, id in byId])),
	};
};

export const savePayments = ({ offline, was }) =>
	Promise.all(
		OFFLINE.filter(({ id }) => offline[id] !== was[id]).map(({ id }) =>
			apiFetch({
				path: `/wc/v3/payment_gateways/${id}`,
				method: 'PUT',
				data: { enabled: offline[id] },
			}),
		),
	);

// The step owns one standard rate, the oldest.
export const loadTax = async () => {
	const [rates, calc] = await Promise.all([
		apiFetch({
			path: addQueryArgs(TAXES, {
				class: 'standard',
				orderby: 'id',
				order: 'asc',
				per_page: 1,
			}),
		}),
		wcSetting('woocommerce_calc_taxes'),
	]);
	const rate = (rates ?? [])[0];
	return {
		// Woo keeps four decimals, and the field wants 8.5.
		rate: rate ? String(Number(rate.rate)) : '',
		rateId: rate?.id ?? null,
		charges: calc === 'yes' || Boolean(rate),
	};
};

export const saveTax = async ({ charges, rate, rateId }) => {
	if (!charges) {
		// A rate left behind would still apply at checkout, and Woo only deletes one when forced.
		if (rateId) {
			await apiFetch({
				path: addQueryArgs(`${TAXES}/${rateId}`, { force: true }),
				method: 'DELETE',
			});
		}
		await saveWcSetting('woocommerce_calc_taxes', 'no');
		return;
	}
	const data = {
		country: await baseCountry(),
		state: '',
		rate: String(rate),
		// translators: The name a sales tax rate gets in WooCommerce when the AI Agent's store setup guide adds it.
		name: __('Tax', 'extendify-local'),
		priority: 1,
		compound: false,
		shipping: true,
		class: 'standard',
	};
	await apiFetch(
		rateId
			? { path: `${TAXES}/${rateId}`, method: 'PUT', data }
			: { path: TAXES, method: 'POST', data },
	);
	await saveWcSetting('woocommerce_calc_taxes', 'yes');
};

// The zones list leaves out locations, so each zone is read in turn.
const zoneFor = async (country) => {
	for (const zone of (await apiFetch({ path: ZONES })) ?? []) {
		const at = await apiFetch({ path: `${ZONES}/${zone.id}/locations` });
		if (
			(at ?? []).some(
				({ type, code }) => type === 'country' && code === country,
			)
		) {
			return zone.id;
		}
	}
	return null;
};

export const loadShipping = async () => {
	const country = await baseCountry();
	const zone = await zoneFor(country);
	const methods = zone
		? ((await apiFetch({ path: `${ZONES}/${zone}/methods` })) ?? [])
		: [];
	const flat = methods.find(({ method_id }) => method_id === 'flat_rate');
	const free = methods.find(({ method_id }) => method_id === 'free_shipping');
	return {
		country,
		zone,
		cost: flat?.settings?.cost?.value ?? '',
		flatId: flat?.id ?? null,
		freeOver: free?.settings?.min_amount?.value ?? '',
		freeId: free?.id ?? null,
	};
};

export const saveShipping = async ({
	country,
	zone,
	cost,
	flatId,
	freeOver,
	freeId,
}) => {
	let at = zone;
	if (!at) {
		const { name } = await apiFetch({
			path: `/wc/v3/data/countries/${country}`,
		});
		at = (
			await apiFetch({
				path: ZONES,
				method: 'POST',
				data: { name: name ?? country },
			})
		).id;
		await apiFetch({
			path: `${ZONES}/${at}/locations`,
			method: 'PUT',
			data: [{ code: country, type: 'country' }],
		});
	}
	const methods = `${ZONES}/${at}/methods`;
	await apiFetch(
		flatId
			? {
					path: `${methods}/${flatId}`,
					method: 'PUT',
					data: { settings: { cost: cost ?? '' } },
				}
			: {
					path: methods,
					method: 'POST',
					data: { method_id: 'flat_rate', settings: { cost: cost ?? '' } },
				},
	);
	const settings = { requires: 'min_amount', min_amount: freeOver };
	if (freeOver !== '' && freeOver != null) {
		await apiFetch(
			freeId
				? { path: `${methods}/${freeId}`, method: 'PUT', data: { settings } }
				: {
						path: methods,
						method: 'POST',
						data: { method_id: 'free_shipping', settings },
					},
		);
	} else if (freeId) {
		// Woo only deletes a shipping method when forced.
		await apiFetch({
			path: addQueryArgs(`${methods}/${freeId}`, { force: true }),
			method: 'DELETE',
		});
	}
};

// Woo's own Site visibility tab writes this, through the one route that lets it.
export const setStoreOpen = (open) =>
	apiFetch({
		path: '/wc-admin/options',
		method: 'POST',
		data: { woocommerce_coming_soon: open ? 'no' : 'yes' },
	});

const WOO_TASKS = [
	'store_details',
	'products',
	'payments',
	'tax',
	'shipping',
	'launch-your-store',
];
const TRACKED = 'woocommerce_task_list_tracked_completed_tasks';

// WooCommerce keeps asking until its own markers are set; it reads which tasks are met from the store itself.
export const reportFinished = async ({ skipped }) => {
	await apiFetch({
		path: '/wc-admin/onboarding/profile',
		method: 'PUT',
		data: skipped ? { skipped: true } : { completed: true },
	});
	const lists = await apiFetch({ path: '/wc-admin/onboarding/tasks' });
	const met = (lists ?? [])
		.flatMap((list) => list?.tasks ?? [])
		.filter(({ id, isComplete }) => isComplete && WOO_TASKS.includes(id))
		.map(({ id }) => id);
	if (!met.length) return;
	const options = await apiFetch({
		path: addQueryArgs('/wc-admin/options', { options: TRACKED }),
	});
	await apiFetch({
		path: '/wc-admin/options',
		method: 'POST',
		data: { [TRACKED]: [...new Set([...(options?.[TRACKED] ?? []), ...met])] },
	});
};
