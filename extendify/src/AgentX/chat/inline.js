import { AdjustColors } from '@agentx/chat/AdjustColors';
import { DesignCard } from '@agentx/chat/DesignCard';
import { LayoutCard } from '@agentx/chat/LayoutCard';
import { OpenPage } from '@agentx/chat/OpenPage';
import { OptimizeCard } from '@agentx/chat/OptimizeCard';
import { DeleteAsk, PageAsk } from '@agentx/chat/PageCard';
import { PlanInline } from '@agentx/chat/PlanPanel';
import { ProductCard } from '@agentx/chat/ProductCard';
import { RestylePlan } from '@agentx/chat/RestylePlan';
import {
	abilityOf,
	fieldTypes,
	foundProductName,
	keyedType,
	useFieldTypesStore,
} from '@agentx/lib/abilities';
import { abilityContext } from '@agentx/lib/ability-context';
import { __, _x } from '@wordpress/i18n';
import { getToolName } from 'ai';

// Only the newest of these stays open; the others fold.
export const FOLDING = ['adjust-design', 'choose-layout', 'adjust-colors'];

// Drawn as nothing, so a reply holding only these still shows the status line.
export const UNSEEN = [
	'what-can-i-do',
	'hand-back',
	'look-at-page',
	'redirect',
];

// Tools whose component stays in the conversation in place of their step, under the reply's text.
export const INLINE = {
	'adjust-design': DesignCard,
	'adjust-colors': AdjustColors,
	'choose-layout': LayoutCard,
	// Its list opens as a sheet, so the reply keeps only its line.
	'what-can-i-do': () => null,
	// Another workflow answers in the same reply, so the misfire shows nothing.
	'hand-back': () => null,
	'look-at-page': () => null,
	redirect: () => null,
	'confirm-page-status': PageAsk,
	'confirm-delete': DeleteAsk,
	'open-page': OpenPage,
	'show-plan': PlanInline,
	'restyle-site': RestylePlan,
};

const ABILITY_CARDS = {
	'woocommerce/product-create': ProductCard,
	'woocommerce/product-update': ProductCard,
	'imagify/optimize-media': OptimizeCard,
};

const productLabels = () => ({
	// translators: Label of the field for a product's name, on the AI Agent's form for adding or changing a WooCommerce product.
	name: _x('Name', 'product', 'extendify-local'),
	// translators: Label of the field for a product's price, on the AI Agent's form for adding or changing a WooCommerce product.
	regular_price: __('Price', 'extendify-local'),
	// translators: Label of the row for a product's picture, on the AI Agent's form for adding or changing a WooCommerce product.
	images: __('Image', 'extendify-local'),
	// translators: Label of the field for a product's discounted price, on the AI Agent's form for adding or changing a WooCommerce product.
	sale_price: __('Sale price', 'extendify-local'),
	// translators: Label of the field for a product's one- or two-sentence summary, on the AI Agent's form for adding or changing a WooCommerce product.
	short_description: __('Short description', 'extendify-local'),
	// translators: Label of the field for a product's full description, on the AI Agent's form for adding or changing a WooCommerce product.
	description: __('Description', 'extendify-local'),
});

const fieldLabels = () => ({
	// translators: Label of the menu on the AI Agent's form for adding a field to a form on the user's website; it picks what kind of field, like Dropdown or Email.
	type: __('Type', 'extendify-local'),
	// translators: Label of the box on the AI Agent's form for adding a field to a form on the user's website; it sets the new field's name shown on the form, like Birthdate.
	label: __('Label', 'extendify-local'),
	// translators: Label of the box on the AI Agent's form for adding a field to a form on the user's website; it sets the short help text shown under the new field.
	description: __('Description', 'extendify-local'),
	// translators: Label of the box on the AI Agent's form for adding a field to a form on the user's website; it sets the faint example text shown inside the new field until a visitor types.
	placeholder: __('Placeholder', 'extendify-local'),
	// translators: Label of the list on the AI Agent's form for adding a field like a dropdown to a form on the user's website; each item is one option a visitor can pick.
	choices: __('Choices', 'extendify-local'),
	// translators: Checkbox on the AI Agent's form for adding a field to a form on the user's website; when checked, a visitor has to fill in the field to send the form.
	required: __('Required', 'extendify-local'),
});

// WPForms Lite's, until the site's own list comes in.
const LITE_TYPES_TAKING = {
	placeholder: ['text', 'textarea', 'email', 'number'],
	choices: ['select', 'radio', 'checkbox'],
};

const typesTaking = (types, key) =>
	types
		? types
				.filter(({ properties = [] }) =>
					properties.some((each) => each.key === key),
				)
				.map(({ type }) => type)
		: LITE_TYPES_TAKING[key];

// A type the site lacks stays as sent, so what shows is what WPForms refuses.
const typeControl = (types, sent) => {
	const value = keyedType(sent, types);
	const options = types.map(({ type, label }) => ({ value: type, label }));
	return {
		type: 'select',
		options:
			!value || options.some((each) => each.value === value)
				? options
				: [...options, { value, label: value }],
		value,
	};
};

// A demo brings its own types, so the card looks the same on any site.
const fieldControls = ({ type }, demo) => {
	const types = demo?.fieldTypes ?? useFieldTypesStore.getState().types;
	if (!types) fieldTypes();
	return {
		...(types && { type: typeControl(types, type) }),
		description: { type: 'text' },
		placeholder: {
			type: 'text',
			when: { type: typesTaking(types, 'placeholder') },
		},
		choices: { type: 'choices', when: { type: typesTaking(types, 'choices') } },
	};
};

const productControls = () => ({ images: { type: 'image' } });

const productOnPage = (id) => {
	const { pageProducts = [], viewedProduct } =
		abilityContext().woocommerce ?? {};
	return [viewedProduct, ...pageProducts].find((each) => each?.id === id)
		?.title;
};

// Fields each ability's form adds to the agent's, and ones it hides but still sends.
export const ABILITY_FORMS = {
	'woocommerce/product-create': {
		fields: [
			'name',
			'regular_price',
			'short_description',
			'description',
			'images',
		],
		hidden: ['product_type_alias'],
		defaults: { product_type_alias: 'physical' },
		labels: productLabels,
		controls: productControls,
	},
	// Its picture shows only when the agent asked for one, so a price change keeps a short form.
	'woocommerce/product-update': {
		hidden: ['product_type_alias'],
		labels: productLabels,
		controls: productControls,
		title: ({ id, name }) => productOnPage(id) || name || foundProductName(id),
	},
	// With nothing to fill in, it asks on the card that names its credits.
	'imagify/optimize-media': {
		hidden: ['media_id', 'media_filename', 'media_url', 'optimization_level'],
	},
	// Only the media library is optimized, so it asks on the Allow card.
	'imagify/bulk-optimize': {
		hidden: ['context', 'optimization_level'],
	},
	'imagify/restore-media': {
		hidden: ['media_id', 'media_filename', 'media_url'],
	},
	// A template's slug and the editor mode mean nothing to the user; the agent's picks still go.
	'charitable/create-campaign': {
		hidden: ['template', 'mode'],
	},
	// Where a field goes is field ids, which mean nothing on a form, so it asks on the Allow card.
	'extendify/wpforms-move-field': {
		hidden: ['position', 'next_to'],
	},
	// Typed over its key, a type's name like "dropdown" is refused, so it's picked by name.
	'wpforms/add-field': {
		fields: [
			'type',
			'label',
			'description',
			'placeholder',
			'choices',
			'required',
		],
		hidden: [
			'size',
			'label_hide',
			'default_value',
			'input_columns',
			'style',
			'extensions',
			'max_size',
			'max_file_number',
			'media_library',
		],
		labels: fieldLabels,
		controls: fieldControls,
	},
};

export const inlineOf = (part) => {
	const name = getToolName(part);
	if (name in INLINE) return INLINE[name];
	if (part.state !== 'output-available') return null;
	const { canceled, refused, skipped, open } = part.output ?? {};
	if (canceled || refused || skipped || open) return null;
	return ABILITY_CARDS[abilityOf(name)] ?? null;
};
