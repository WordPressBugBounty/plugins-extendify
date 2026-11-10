import { abilityNamed, runAbility } from '@agentx/lib/abilities';
import { blockAt } from '@agentx/lib/block-box';
import { brandName, editOption } from '@agentx/lib/block-names';
import { linkContact } from '@agentx/lib/contact';
import { coverMedia } from '@agentx/lib/cover';
import { editBlocks } from '@agentx/lib/edit-blocks';
import { leavesShell } from '@agentx/lib/follow-site';
import { titleRowOf } from '@agentx/lib/logo-title';
import { updateProduct } from '@agentx/lib/products';
import { saveSetting } from '@agentx/lib/settings';
import { canUpdate, updatePost } from '@agentx/quick-edit/posts';
import { usePluginsStore } from '@agentx/state/plugins';
import { __, sprintf } from '@wordpress/i18n';

const BLOCK = 'data-extendify-block';
const TYPE = 'data-extendify-block-type';

// Blocks whose words are their own, as the draft's edit-text writes them; a selector names the label inside.
const EDITABLE = {
	'core/heading': null,
	'core/paragraph': null,
	'core/button': '.wp-block-button__link',
	'core/navigation-link': '.wp-block-navigation-item__label',
	'core/navigation-submenu': '.wp-block-navigation-item__label',
	'core/accordion-heading': '.wp-block-accordion-heading__toggle-title',
	'core/details': ':scope > summary',
	'core/list-item': null,
	'core/preformatted': null,
	'core/verse': null,
};

const idIn = (element, selector, key) =>
	Number(element.closest(selector)?.dataset[key]) || null;

const productOf = (element) => {
	const holder = element.closest('[data-product-id], li.product');
	const id =
		holder?.dataset.productId ??
		[...(holder?.classList ?? [])]
			.find((name) => /^post-\d+$/.test(name))
			?.slice(5);
	return Number(id) || null;
};

// The fields WPForms' update-field takes; it refuses the rest, like Lite's phone, date and file upload.
const WPFORMS_FIELDS = [
	'text',
	'textarea',
	'email',
	'number',
	'select',
	'radio',
	'checkbox',
	'name',
]
	.map((type) => `.wpforms-field-${type}[data-field-id]`)
	.join(', ');

// Words a plugin keeps in its own data, not the page, so they save through that plugin.
const PLUGIN_PARTS = [
	{
		words: '.wpforms-field-label',
		// An input has no words of its own, so anywhere in the field opens its label.
		within: WPFORMS_FIELDS,
		// Out while the label is typed, or the caret could land in the unsaved required mark.
		marks: '.wpforms-required-label',
		// translators: An option in the small menu over a field of a form on the user's website, like Email; it changes the field's label, placeholder and choices.
		label: () => __('Edit field', 'extendify-local'),
		field: (words) => ({
			form: idIn(words, 'form[data-formid]', 'formid'),
			field: idIn(words, '.wpforms-field[data-field-id]', 'fieldId'),
		}),
		save: (words, text, more = {}) => {
			const form = idIn(words, 'form[data-formid]', 'formid');
			const field = idIn(words, '.wpforms-field[data-field-id]', 'fieldId');
			return form && field
				? runAbility('wpforms/update-field', {
						form_id: form,
						field_id: field,
						label: text,
						...more,
					})
				: null;
		},
	},
	{
		words: '.wpforms-submit',
		// translators: An option in the small menu over a form's send button on the user's website; it changes the button's words.
		label: () => __('Edit button text', 'extendify-local'),
		save: (words, text) => {
			const form = idIn(words, 'form[data-formid]', 'formid');
			return form
				? runAbility('wpforms/update-form-settings', {
						form_id: form,
						settings: { submit_text: text },
					})
				: null;
		},
	},
	...Object.entries({
		subscribeButtonLabel: ['.smaily-newsletter-block-button-submit'],
		emailInputLabel: [
			'label[for="email"]',
			'.smaily-newsletter-block-form-control',
		],
		nameInputLabel: [
			'label[for="name"]',
			'.smaily-newsletter-block-form-control',
		],
	}).map(([setting, [words, within]]) => ({
		words,
		within,
		label: () =>
			setting === 'subscribeButtonLabel'
				? // translators: An option in the small menu over a form's send button on the user's website; it changes the button's words.
					__('Edit button text', 'extendify-local')
				: // translators: An option in the small menu over a field of a form on the user's website, like Email; it changes the field's label.
					__('Edit field label', 'extendify-local'),
		// The signup form keeps its words in its block, so they go through the draft.
		save: (words, text) => {
			const block = words.closest(`[${TYPE}="smaily/newsletter-block"]`);
			return block
				? editBlocks({
						ops: [
							{
								op: 'set-settings',
								block: block.getAttribute(BLOCK),
								type: 'smaily/newsletter-block',
								settings: { [setting]: text },
								direct: true,
							},
						],
					})
				: null;
		},
	})),
	{
		words: [
			'[data-product-id] .wp-block-post-title a',
			'[data-product-id] .wp-block-post-title',
			'li.product .wp-block-post-title a',
			'li.product .wp-block-post-title',
			'li.product .woocommerce-loop-product__title',
		].join(', '),
		// translators: An option in the small menu over a product's name in the user's online store; it changes the name.
		label: () => __('Edit product name', 'extendify-local'),
		save: (words, text) => {
			const id = productOf(words);
			return id ? updateProduct(id, { name: text }) : null;
		},
	},
];

const plainWords = ({ words, marks }) => {
	const copy = words.cloneNode(true);
	if (marks) for (const mark of copy.querySelectorAll(marks)) mark.remove();
	return copy.textContent.trim();
};

const pluginPartAt = (element) => {
	for (const part of PLUGIN_PARTS) {
		const words = part.within
			? element?.closest?.(part.within)?.querySelector(part.words)
			: element?.closest?.(part.words);
		if (words) {
			const { save, label, marks } = part;
			return {
				plugin: true,
				words,
				save,
				label,
				marks,
				...(part.field && { form: part.field(words) }),
			};
		}
	}
	return null;
};

// The site's name and tagline are settings the theme prints, so they save live, not to the page.
const SETTING_WORDS = {
	'core/site-title': { setting: 'title', words: 'a' },
	'core/site-tagline': { setting: 'description', words: null },
};

const settingWordsAt = (element) => {
	const block = element?.closest?.(`[${BLOCK}]`);
	const type = block?.getAttribute(TYPE);
	const kind = SETTING_WORDS[type];
	if (!kind) return null;
	const words = (kind.words && block.querySelector(kind.words)) || block;
	return {
		live: true,
		setting: kind.setting,
		id: block.getAttribute(BLOCK),
		type,
		block,
		words,
	};
};

const POST = /^(?:post|postid|page-id)-(\d+)$/;
const POST_TYPE = /^(?:type|single)-([a-z_-]+)$/;

// The post a part shows: in a list of posts, each one's own; elsewhere, the page's.
const postOf = (block) => {
	const listed = block.closest('.wp-block-post');
	const classes = [...(listed ?? block.ownerDocument.body).classList];
	const id = Number(classes.map((name) => POST.exec(name)?.[1]).find(Boolean));
	const type =
		classes.map((name) => POST_TYPE.exec(name)?.[1]).find(Boolean) ??
		(classes.includes('page') ? 'page' : 'post');
	return id ? { id, type, listed: Boolean(listed) } : null;
};

const titleAt = (element) => {
	const block = element?.closest?.(`[${BLOCK}]`);
	if (block?.getAttribute(TYPE) !== 'core/post-title') return null;
	const post = postOf(block);
	// Its own address, since The Events Calendar cuts a ?p= one down to the front page.
	const url = post?.listed
		? block.querySelector('a[href]')?.href
		: block.ownerDocument.URL;
	if (!post || !url) return null;
	return {
		title: ['product', 'page'].includes(post.type) ? post.type : 'post',
		id: block.getAttribute(BLOCK),
		type: 'core/post-title',
		block,
		words: block.querySelector('a') ?? block,
		post: post.id,
		url,
	};
};

// An inline Read more sits in the excerpt's words, but isn't part of the excerpt.
const MORE = '.wp-block-post-excerpt__more-link';

// Only an excerpt the frame marks as shown whole, so saving its words loses none.
const excerptAt = (element) => {
	const block = element?.closest?.('[data-extendify-excerpt]');
	const words = block?.querySelector('.wp-block-post-excerpt__excerpt');
	const post = block && {
		id: Number(block.dataset.extendifyExcerpt),
		type: postOf(block)?.type ?? 'post',
	};
	if (!post?.id || !canUpdate(post) || !words) return null;
	return {
		plugin: true,
		words,
		marks: MORE,
		full: block.dataset.extendifyExcerptFull,
		// translators: An option in the small menu over a blog post's short summary in a list of posts on the user's website; it changes the summary.
		label: () => __('Edit excerpt', 'extendify-local'),
		save: (_, text) => updatePost(post, { excerpt: text }),
	};
};

const PRODUCT_PART = '[data-extendify-product-part]';
const CALENDAR = '[data-extendify-block-type="sugar-calendar/block"]';
const EVENT = `${CALENDAR} [data-eventid]`;

// An event is Sugar Calendar's own, saved through its ability, so it opens only where the site lets that run.
const eventAt = (element) => {
	const cell = element?.closest?.(EVENT);
	const event = Number(cell?.dataset.eventid);
	if (!event || !abilityNamed('sc-events/update-event')) return null;
	return {
		kind: 'event',
		id: null,
		type: 'sugar-calendar/event',
		block: cell,
		event,
		// translators: An option in the small menu over an event in a calendar on the user's website; it changes the event's name and times.
		label: () => __('Edit event', 'extendify-local'),
	};
};

const calendarAt = (element) => {
	const block = element?.closest?.(CALENDAR);
	if (!block) return null;
	let settings = {};
	try {
		settings = JSON.parse(block.dataset.attributes ?? '{}');
	} catch {
		return null;
	}
	return {
		kind: 'calendar',
		id: block.getAttribute(BLOCK),
		type: 'sugar-calendar/block',
		block,
		settings,
		// translators: An option in the small menu over a calendar of events on the user's website; it changes how the calendar looks.
		label: () => __('Edit calendar', 'extendify-local'),
	};
};

// Marked by the frame, since WooCommerce renders a product's own page outside its block ids.
const productPartAt = (element) => {
	const holder = element?.closest?.(PRODUCT_PART);
	const product = Number(holder?.dataset.productId);
	if (!product) return null;
	const part = holder.dataset.extendifyProductPart;
	if (part === 'price') {
		return {
			kind: 'price',
			id: null,
			type: 'woocommerce/product-price',
			block: holder,
			product,
			// translators: An option in the small menu over a product's price on its own page in the user's online store; it changes the price.
			label: () => __('Edit price', 'extendify-local'),
		};
	}
	if (part === 'photo') {
		const picture = holder.querySelector(
			'.woocommerce-product-gallery__image img, .woocommerce-product-gallery__image--placeholder img',
		);
		return picture
			? {
					kind: 'image',
					logo: false,
					product,
					id: null,
					type: 'woocommerce/product-image-gallery',
					block: holder,
					picture,
					// translators: An option in the small menu over a product's photo on its own page in the user's online store; it changes the photo.
					label: () => __('Edit product photo', 'extendify-local'),
				}
			: null;
	}
	const fields = {
		name: {
			type: 'core/post-title',
			words: holder,
			// translators: An option in the small menu over a product's name in the user's online store; it changes the name.
			label: () => __('Edit product name', 'extendify-local'),
			save: (_, text) => updateProduct(product, { name: text }),
		},
		summary: {
			type: 'core/post-excerpt',
			words: holder.querySelector('.wp-block-post-excerpt__excerpt') ?? holder,
			marks: MORE,
			full: holder.dataset.extendifyExcerptFull,
			// translators: An option in the small menu over a product's short description on its own page in the user's online store; it changes it.
			label: () => __('Edit short description', 'extendify-local'),
			save: (_, text) => updateProduct(product, { short_description: text }),
		},
		description: {
			type: 'woocommerce/product-description',
			words: holder,
			rich: true,
			// translators: An option in the small menu over a product's description on its own page in the user's online store; it changes the description.
			label: () => __('Edit description', 'extendify-local'),
			save: (_, html) => updateProduct(product, { description: html }),
		},
	};
	return fields[part] ? { plugin: true, ...fields[part] } : null;
};

// Pictures the draft's replace-image changes, and the logo, a setting saved live; not ones in inner blocks.
const PICTURES = {
	'core/image': 'img',
	'core/site-logo': 'img',
	'core/cover': ':scope > .wp-block-cover__image-background',
	'core/media-text': ':scope > .wp-block-media-text__media img',
	'woocommerce/product-image': 'img',
	'core/post-featured-image': 'img',
};

const pictureAt = (element) => {
	const block = element?.closest?.(`[${BLOCK}]`);
	const type = block?.getAttribute(TYPE);
	if (!(type in PICTURES)) return null;
	// Its text side holds words, not the picture.
	if (
		type === 'core/media-text' &&
		!element.closest('.wp-block-media-text__media')
	) {
		return null;
	}
	const picture = block.matches('img')
		? block
		: block.querySelector(PICTURES[type]);
	// Without its product's id, a product's photo has nowhere to save.
	const product = type === 'woocommerce/product-image' && productOf(block);
	const post = type === 'core/post-featured-image' && postOf(block);
	if (!picture || product === null || post === null) return null;
	if (post && !canUpdate(post)) return null;
	return {
		kind: 'image',
		logo: type === 'core/site-logo',
		product: product || null,
		post: post || null,
		id: block.getAttribute(BLOCK),
		type,
		block,
		picture,
	};
};

const priceAt = (element) => {
	const block = element?.closest?.(`[${BLOCK}]`);
	if (block?.getAttribute(TYPE) !== 'woocommerce/product-price') return null;
	const product = productOf(block);
	return product
		? {
				kind: 'price',
				id: block.getAttribute(BLOCK),
				type: 'woocommerce/product-price',
				block,
				product,
			}
		: null;
};

const SOCIAL = '[data-extendify-block-type="core/social-link"]';

// Every link in the row, since one icon is too small a part to edit alone.
const socialAt = (element) => {
	const block = element?.closest?.(
		'[data-extendify-block-type="core/social-links"]',
	);
	const links = [...(block?.querySelectorAll(SOCIAL) ?? [])].map((link) => ({
		id: link.getAttribute(BLOCK),
		name:
			link.querySelector('.wp-block-social-link-label')?.textContent.trim() ||
			brandName(
				[...link.classList]
					.find((name) => name.startsWith('wp-social-link-'))
					?.slice(15) ?? 'link',
			),
		url: link.querySelector('a')?.getAttribute('href') ?? '',
		icon: link.querySelector('svg'),
	}));
	if (!links.length) return null;
	return {
		kind: 'social',
		id: block.getAttribute(BLOCK),
		type: 'core/social-links',
		block,
		links,
		focus: element.closest(SOCIAL)?.getAttribute(BLOCK) ?? null,
	};
};

// Only a section that already has a background offers one, so plain layout stays quiet.
const SECTIONS = ['core/group', 'core/columns', 'core/column'];

const sectionAt = (element) => {
	const block = element?.closest?.(`[${BLOCK}]`);
	const type = block?.getAttribute(TYPE);
	if (!SECTIONS.includes(type) || !block.classList.contains('has-background')) {
		return null;
	}
	return { kind: 'section', id: block.getAttribute(BLOCK), type, block };
};

// What Quick Edit can change where a click lands, in the innermost block there; null if nothing.
export const editableAt = (element) => {
	const part =
		productPartAt(element) ??
		eventAt(element) ??
		calendarAt(element) ??
		pluginPartAt(element) ??
		settingWordsAt(element) ??
		titleAt(element) ??
		excerptAt(element) ??
		pictureAt(element) ??
		priceAt(element) ??
		socialAt(element) ??
		sectionAt(element);
	if (part) return part;
	const block = element?.closest?.(`[${BLOCK}]`);
	const type = block?.getAttribute(TYPE);
	if (!block || !(type in EDITABLE)) return null;
	// The draft can't edit an item's words apart from the list nested in it.
	if (
		type === 'core/list-item' &&
		block.querySelector(':scope > ul, :scope > ol')
	) {
		return null;
	}
	const words = EDITABLE[type] ? block.querySelector(EDITABLE[type]) : block;
	return words ? { id: block.getAttribute(BLOCK), type, block, words } : null;
};

// Only a web page is a link to visit; a phone or email link is its number or address.
// Only a page of this site opens in the frame; wp-admin and the login page leave the shell.
const linkOf = (anchor, leaveUrls) => {
	try {
		const url = new URL(anchor.getAttribute('href'), anchor.baseURI);
		if (!['http:', 'https:'].includes(url.protocol)) return null;
		return {
			href: url.href,
			internal:
				url.origin === window.location.origin && !leavesShell(url, leaveUrls),
		};
	} catch {
		return null;
	}
};

const DROPDOWN = '.wp-block-navigation__submenu-container';

export const submenuAt = (element) =>
	element?.closest?.('.wp-block-navigation-item.has-child') ?? null;

const CONTROL = 'summary, button, [role="button"], [role="tab"]';

// A control whose click works as on the live site, like a toggle or a slider's arrow.
export const actionAt = (element) => {
	const item = submenuAt(element);
	// Hovering a menu item opens its submenu, so its toggle isn't a control here.
	if (item && !item.querySelector(DROPDOWN)?.contains(element)) return null;
	const control = element?.closest?.(CONTROL);
	// A form's submit button would send the form.
	if (!control || (control.form && control.type === 'submit')) return null;
	// A tab's script listens on the link inside it.
	if (control.matches('[role="tab"]')) {
		return {
			kind: 'tab',
			control: control.querySelector('a, button') ?? control,
		};
	}
	return { kind: 'press', control };
};

const FIELD = 'input:not([type="hidden"]), textarea, select';

// Unlike actionAt, a submit counts: with nothing offered, a click sends the form as the site does.
export const pressableAt = (element) => {
	const control = element?.closest?.(CONTROL);
	const anchor = element?.closest?.('a[href]');
	return (
		element?.closest?.(FIELD) ??
		actionAt(element)?.control ??
		(control?.form && control.type === 'submit' ? control : null) ??
		(anchor && linkOf(anchor, []) ? anchor : null)
	);
};

export const press = (target) => {
	// Selected as when tabbed into, or typing lands before the old value.
	if (target.matches(FIELD)) {
		target.focus({ preventScroll: true });
		if (target.tagName === 'INPUT') target.select();
	}
	target.click();
};

export const bubbleAt = (element, { leaveUrls = [], contact = null } = {}) => {
	const tagged = blockAt(element);
	// A product page's part or a calendar's event holds no block id, unless one of its blocks is the one pointed at.
	const live = element?.closest?.(`${PRODUCT_PART}, ${EVENT}`);
	const block = live && !live.contains(tagged) ? live : tagged;
	if (!block) return null;
	const action = actionAt(element);
	const anchor = element.closest('a[href]');
	// A spacer's Edit opens the block it sits in.
	const target = editableAt(element) ?? editableAt(block);
	return {
		id: block.getAttribute(BLOCK),
		type:
			block.getAttribute(TYPE) ??
			(block.matches(EVENT) ? 'sugar-calendar/event' : null) ??
			productPartAt(block)?.type ??
			null,
		block,
		live: block === live,
		// What the pointer is on, since a form's label or a product's name sits inside a bigger block.
		at: element,
		action,
		// A tab's link only shows its panel.
		link: anchor && action?.kind !== 'tab' ? linkOf(anchor, leaveUrls) : null,
		contact: linkContact(anchor) ?? contact,
		editable: Boolean(target),
		// What its Edit changes, since all of a form's fields sit in one block.
		edits: target ? (target.words ?? target.picture ?? target.block) : null,
	};
};

const editLabel = ({ contact, type, block, at }) => {
	const own =
		at && (productPartAt(at) ?? eventAt(at) ?? calendarAt(at) ?? excerptAt(at));
	if (own?.label) return own.label();
	const plugin = at && pluginPartAt(at);
	if (plugin) return plugin.label();
	if (type === 'core/social-link' || type === 'core/social-links') {
		// translators: An option in the small menu over the social media icons on the user's website; it changes where each one links.
		return __('Edit social links', 'extendify-local');
	}
	const title = titleAt(block);
	if (title) {
		return {
			// translators: An option in the small menu over a page's title on the user's website; it changes the title.
			page: __('Edit page title', 'extendify-local'),
			// translators: An option in the small menu over a product's name in the user's online store; it changes the name.
			product: __('Edit product name', 'extendify-local'),
			// translators: An option in the small menu over a blog post's title on the user's website; it changes the title.
			post: __('Edit post title', 'extendify-local'),
		}[title.title];
	}
	// A menu item with a submenu is a link like the rest.
	if (type === 'core/navigation-submenu') {
		return editOption('core/navigation-link');
	}
	if (type === 'core/media-text' && at && pictureAt(at)) {
		// translators: An option in the small menu over a picture on the user's website; it changes the picture.
		return __('Edit image', 'extendify-local');
	}
	if (contact?.kind === 'phone') {
		// translators: An option in the small menu over a phone number on the user's website; it changes the number.
		return __('Edit phone number', 'extendify-local');
	}
	if (contact?.kind === 'email') {
		// translators: An option in the small menu over an email address on the user's website; it changes the address.
		return __('Edit email address', 'extendify-local');
	}
	if (at && sectionAt(at)) {
		// translators: An option in the small menu over a section of the user's website that has a background color; it changes that color.
		return __('Edit background', 'extendify-local');
	}
	const media = coverMedia(block);
	if (media === 'image') {
		// translators: An option in the small menu over a section of the user's website with an image as its background; it changes the image.
		return __('Edit cover image', 'extendify-local');
	}
	if (media === 'video') {
		// translators: An option in the small menu over a section of the user's website with a video as its background; it changes the video.
		return __('Edit cover video', 'extendify-local');
	}
	return editOption(type);
};

const LAYOUT = ['core/group', 'core/post-content', 'core/template-part'];

// On a translated page, saving these words would write the translation over the original.
const TRANSLATABLE = new Set([
	'core/post-excerpt',
	'woocommerce/product-description',
	'sugar-calendar/event',
	'core/paragraph',
	'core/heading',
	'core/button',
	'core/list-item',
	'core/accordion-heading',
	'core/details',
	'core/post-title',
	'core/preformatted',
	'core/verse',
	'core/site-title',
	'core/site-tagline',
	'core/navigation-link',
	'core/navigation-submenu',
]);

const TRANSLATORS = {
	translatepress: 'TranslatePress',
	wpml: 'WPML',
	polylang: 'Polylang',
};

// A form takes new fields through WPForms' own ability, which a site may not let the agent run.
export const formOf = ({ at, block } = {}) =>
	abilityNamed('wpforms/add-field')
		? (at?.closest?.('form[data-formid]') ??
			block?.querySelector?.('form[data-formid]') ??
			null)
		: null;

// A plugin block Quick Edit can't change opens that plugin's own settings instead.
const settingsOf = ({ type }) =>
	usePluginsStore
		.getState()
		.plugins.settings?.find(({ block }) => block === type) ?? null;

// The field goes above the one before it, so the first has nowhere to go.
export const fieldAbove = ({ at } = {}) => {
	const field = at?.closest?.('.wpforms-field[data-field-id]');
	const form = field?.closest('form[data-formid]');
	if (!form || !abilityNamed('extendify/wpforms-move-field')) return null;
	const fields = [...field.parentElement.children].filter((each) =>
		each.matches('.wpforms-field[data-field-id]'),
	);
	const above = fields[fields.indexOf(field) - 1];
	return above
		? {
				form: Number(form.dataset.formid),
				field: Number(field.dataset.fieldId),
				above: Number(above.dataset.fieldId),
			}
		: null;
};

export const bubbleRows = (
	part,
	{ translatedBy = null, minimized = false } = {},
) => {
	if (!part) return [];
	// Layout has nothing to edit, so it shows only to be sent to a minimized agent.
	const layout = LAYOUT.includes(part.type) && !part.editable;
	if (layout && !minimized) return [];
	const rows = [];
	if (TRANSLATORS[translatedBy] && TRANSLATABLE.has(part.type)) {
		rows.push({
			id: 'translated',
			label: sprintf(
				// translators: %s is a translation plugin's name, like WPML. Shown, not clickable, in the small menu over words on a translated page of the user's website, which Quick Edit can't change.
				__('Edit translations in %s', 'extendify-local'),
				TRANSLATORS[translatedBy],
			),
			icon: 'edit',
		});
	} else if (!layout && part.editable) {
		rows.push({ id: 'edit', label: editLabel(part), icon: 'edit' });
	}
	const title = titleRowOf(part);
	if (title) {
		rows.push({
			id: 'title',
			label: title.shown
				? // translators: An option in the small menu over the logo, or the site's name beside it, in the header of the user's website; it stops the name from showing there.
					__('Hide site title', 'extendify-local')
				: // translators: An option in the small menu over the logo in the header of the user's website; it shows the site's name beside the logo again.
					__('Show site title', 'extendify-local'),
			icon: title.shown ? 'unseen' : 'seen',
			...title,
		});
	}
	if (formOf(part)) {
		rows.push({
			id: 'add-field',
			// translators: An option in the small menu over a form on the user's website; it adds a new field, like a dropdown, to the form.
			label: __('Add field', 'extendify-local'),
			icon: 'add',
		});
	}
	if (fieldAbove(part)) {
		rows.push({
			id: 'move-up',
			// translators: An option in the small menu over a field of a form on the user's website; it moves the field above the one before it.
			label: __('Move field up', 'extendify-local'),
			icon: 'up',
		});
	}
	const settings = settingsOf(part);
	if (settings) {
		rows.push({
			id: 'settings',
			label: sprintf(
				// translators: %s is the name of a WordPress plugin, like SimplyBook.me. An option in the small menu over that plugin's part of the user's website, like a booking calendar; it opens the plugin's settings in a new browser tab.
				__('Open %s settings', 'extendify-local'),
				settings.name,
			),
			icon: 'external',
			href: settings.url,
		});
	}
	// An open chat has its own Select for this, and the agent only takes a part with a block id.
	if (minimized && !part.live) {
		rows.push({
			id: 'send',
			// translators: An option in the small menu over the user's website while the AI Agent's chat is minimized; it brings the chat back with the part under the pointer.
			label: __('Send to agent', 'extendify-local'),
			icon: 'send',
		});
	}
	return rows;
};

// Enter or leaving the words saves them, Shift+Enter breaks the line, Escape puts them back.
export const startEditing = ({ words }, { onSave, onCancel } = {}) => {
	const before = words.innerHTML;
	let done = false;
	const finish = (save) => {
		if (done) return;
		done = true;
		words.removeAttribute('contenteditable');
		words.removeEventListener('keydown', onKey);
		words.removeEventListener('blur', onBlur);
		const after = words.innerHTML;
		// Emptied words would leave an empty heading behind; removing the block is its own change.
		if (!save || after === before || !words.textContent.trim()) {
			words.innerHTML = before;
			onCancel?.();
			return;
		}
		onSave?.(after);
	};
	const onKey = (event) => {
		if (event.key === 'Escape') {
			event.preventDefault();
			finish(false);
		}
		if (event.key === 'Enter' && !event.shiftKey) {
			event.preventDefault();
			finish(true);
		}
	};
	const onBlur = () => finish(true);
	words.setAttribute('contenteditable', 'true');
	words.addEventListener('keydown', onKey);
	words.addEventListener('blur', onBlur);
	words.focus();
	return () => finish(false);
};

// What a browser adds to typed words: a paragraph per pasted line, a last line break, non-breaking spaces.
export const tidy = (html) =>
	html
		.replace(/<\/(div|p)>/gi, '')
		.replace(/(?!^)<(div|p)\b[^>]*>/gi, '<br>')
		.replace(/^<(div|p)\b[^>]*>/i, '')
		.replace(/(<br\s*\/?>\s*)+$/i, '')
		.replace(/&nbsp;/g, ' ')
		.trim();

// Plugin words through that plugin's ability; the rest through the draft, as format-text since edit-text escapes formatting.
export const saveWords = (
	target,
	html,
	{ confirmed = false, more = {} } = {},
) => {
	if (target.live) {
		return saveSetting(target.setting, target.words.textContent.trim());
	}
	if (target.title) {
		return editBlocks({
			ops: [
				{
					op: 'rename',
					block: target.id,
					type: target.type,
					url: target.url,
					title: target.words.textContent.replace(/\s+/g, ' ').trim(),
				},
			],
			// Typing over the title is the ask the draft makes before renaming a post everywhere.
			confirmed: true,
		});
	}
	if (target.plugin) {
		const words = target.rich
			? target.words.innerHTML.trim()
			: plainWords(target);
		return (
			target.save(target.words, words, more) ??
			Promise.reject(new Error("Couldn't tell which one to change."))
		);
	}
	const { id, type } = target;
	return editBlocks({
		ops: [
			{ op: 'format-text', block: id, type, text: tidy(html), direct: true },
		],
		...(confirmed && { confirmed }),
	});
};

// For a tool or a button that names the part, like the agent handing a heading back to the user to type.
export const editInPlace = (id, handlers) => {
	const site = document.getElementById(
		'extendify-agentx-site',
	)?.contentDocument;
	const block = site?.querySelector(
		`[${BLOCK}="${String(id).replace(/["\\]/g, '\\$&')}"]`,
	);
	const target = editableAt(block);
	return target ? startEditing(target, handlers) : null;
};
