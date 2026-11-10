import { usePluginsStore } from '@agentx/state/plugins';

const PAGE_PRODUCTS = 50;
const PAGE_FORMS = 10;

const numbered = (classList, prefix) => {
	const found = [...classList].find((name) =>
		new RegExp(`^${prefix}\\d+$`).test(name),
	);
	return found ? Number(found.slice(prefix.length)) : null;
};

const textOf = (element) => element?.textContent.trim() ?? '';

// A theme can make the site title in its header an h1 too, so the page's own title comes first.
const pageTitle = (site) =>
	textOf(
		site.querySelector('main .wp-block-post-title, main h1') ??
			site.querySelector('h1:not(.wp-block-site-title)'),
	);

const TITLE = '.wp-block-post-title, .woocommerce-loop-product__title';

// The product a picked part shows, from the product block or listing around it.
const productOf = (picked) => {
	const holder = picked?.closest(
		'[data-product-id], li.product[class*="post-"]',
	);
	if (!holder) return null;
	const id = holder.dataset.productId
		? Number(holder.dataset.productId)
		: numbered(holder.classList, 'post-');
	if (!id) return null;
	const title = textOf(
		holder.querySelector(TITLE) ?? holder.querySelector('a'),
	);
	return { kind: 'product', id, title };
};

// Ids and titles only, so "this one" needs no lookup; nothing about the site's customers.
const woocommerce = (site, picked) => {
	const pageProducts = [...site.querySelectorAll('li.product[class*="post-"]')]
		.map((tile) => ({
			id: numbered(tile.classList, 'post-'),
			title: textOf(tile.querySelector(TITLE) ?? tile.querySelector('a')),
		}))
		.filter(({ id }) => id)
		.slice(0, PAGE_PRODUCTS);
	const viewed =
		site.body.classList.contains('single-product') &&
		numbered(site.body.classList, 'postid-');
	const product = productOf(picked);
	return {
		pageProducts,
		...(viewed && {
			viewedProduct: { id: viewed, title: pageTitle(site) },
		}),
		...(product && { picked: product }),
	};
};

const LAYOUT = ['label', 'small', 'medium', 'large', 'row', 'container'];

// A field's id is what update-field takes, so "make email required" needs no lookup.
const fieldsOf = (form) =>
	[...form.querySelectorAll('.wpforms-field[data-field-id]')].map((field) => {
		const label = field.querySelector('.wpforms-field-label');
		const type = [...field.classList]
			.map((name) => /^wpforms-field-([a-z-]+)$/.exec(name)?.[1])
			.find((name) => name && !LAYOUT.includes(name));
		return {
			id: Number(field.dataset.fieldId),
			label: textOf(label).replace(/\s*\*$/, ''),
			type: type ?? '',
			required: Boolean(label?.querySelector('.wpforms-required-label')),
		};
	});

const formOf = (form) => ({
	id: Number(form.dataset.formid),
	fields: fieldsOf(form),
	button: textOf(form.querySelector('.wpforms-submit')),
});

const wpforms = (site, picked) => {
	const holder = picked?.closest('.wpforms-container') ?? picked;
	const form = holder?.matches('form[data-formid]')
		? holder
		: holder?.querySelector('form[data-formid]');
	return {
		pageForms: [...site.querySelectorAll('form[data-formid]')]
			.slice(0, PAGE_FORMS)
			.map(formOf),
		...(form && { picked: { kind: 'form', ...formOf(form) } }),
	};
};

const charitable = (site, picked) => {
	const viewed =
		site.body.classList.contains('single-campaign') &&
		numbered(site.body.classList, 'postid-');
	const campaign = Number(
		picked?.closest('[data-campaign-id]')?.dataset.campaignId,
	);
	return {
		...(viewed && {
			viewedCampaign: { id: viewed, title: pageTitle(site) },
		}),
		...(campaign && { picked: { kind: 'campaign', id: campaign } }),
	};
};

// The calendar block keeps its settings in a data attribute, which says which calendars it shows.
const sugarCalendar = (_site, picked) => {
	const block = picked?.closest(
		'[data-extendify-block-type^="sugar-calendar/"]',
	);
	if (!block) return {};
	let settings = {};
	try {
		settings = JSON.parse(block.dataset.attributes ?? '{}');
	} catch {}
	return {
		picked: {
			kind: 'calendar',
			...(settings.display && { display: settings.display }),
			...(settings.calendars?.length && { calendars: settings.calendars }),
		},
	};
};

const simplybook = (_site, picked) =>
	picked?.closest('[data-extendify-block-type="simplybook/widget"]')
		? { picked: { kind: 'booking' } }
		: {};

// An event's own page says which event "this" is; a calendar's blocks list many.
const eventsCalendar = (site, picked) => {
	const viewed =
		site.body.classList.contains('single-tribe_events') &&
		numbered(site.body.classList, 'postid-');
	const calendar = picked?.closest(
		'[data-extendify-block-type^="tec/"], [data-extendify-block-type^="tribe/"]',
	);
	const event = viewed && {
		id: viewed,
		title: pageTitle(site),
	};
	return {
		...(event && { viewedEvent: event }),
		...(calendar && {
			picked: event ? { kind: 'event', ...event } : { kind: 'calendar' },
		}),
	};
};

const givewp = (_site, picked) => {
	const block = picked?.closest('[data-extendify-block-type^="givewp/"]');
	if (!block) return {};
	const id = Number(
		block.querySelector('[data-campaign-id]')?.dataset.campaignId,
	);
	return { picked: { kind: 'campaign', ...(id && { id }) } };
};

const bookly = (_site, picked) =>
	picked?.closest('[data-extendify-block-type="bookly/form"], .bookly-form')
		? { picked: { kind: 'booking' } }
		: {};

// Brevo has no block: its shortcode draws the form, numbered in its id.
const brevo = (_site, picked) => {
	const form =
		picked?.closest('form.sib_signup_form') ??
		picked?.querySelector('form.sib_signup_form');
	if (!form) return {};
	const id = Number(form.id.replace('sib_signup_form_', ''));
	return { picked: { kind: 'form', ...(id && { id }) } };
};

// What each plugin's prompt reads from the page on screen, keyed by its ability category, not its namespace.
const READERS = {
	woocommerce,
	'wpforms-forms': wpforms,
	charitable,
	'sc-events': sugarCalendar,
	simplybook,
	'the-events-calendar': eventsCalendar,
	givewp,
	bookly,
	brevo,
};

// Each plugin's block on the page, for the one in view when nothing is picked.
const BLOCKS = {
	woocommerce: '[data-product-id]',
	'wpforms-forms': '.wpforms-container',
	charitable: '[data-campaign-id]',
	'sc-events': '[data-extendify-block-type^="sugar-calendar/"]',
	simplybook: '[data-extendify-block-type="simplybook/widget"]',
	'the-events-calendar':
		'[data-extendify-block-type^="tec/"], [data-extendify-block-type^="tribe/"]',
	givewp: '[data-extendify-block-type^="givewp/"]',
	bookly: '[data-extendify-block-type="bookly/form"], .bookly-form',
	brevo: 'form.sib_signup_form',
};

const inViewIn = (site, selector) =>
	[...site.querySelectorAll(selector)].find((element) => {
		const box = element.getBoundingClientRect();
		return box.bottom > 0 && box.top < site.defaultView.innerHeight;
	});

// A part picked, or found by the agent, goes to the plugin that shows it as what "this" means.
// With nothing picked, the plugin block in view is what "this" most likely means.
export const abilityContext = (selection = null) => {
	const site = document.getElementById(
		'extendify-agentx-site',
	)?.contentDocument;
	if (!site?.body) return {};
	const id = selection?.id?.replace(/["\\]/g, '\\$&');
	const picked = id
		? site.querySelector(`[data-extendify-block="${id}"]`)
		: null;
	return Object.fromEntries(
		usePluginsStore
			.getState()
			.abilities.filter(
				({ category, abilities }) => category in READERS && abilities.length,
			)
			.map(({ category }) => {
				const read = READERS[category](site, picked);
				const near = !picked && inViewIn(site, BLOCKS[category]);
				const shown = near && READERS[category](site, near).picked;
				return [category, shown ? { ...read, inView: shown } : read];
			}),
	);
};
