import { showSaved } from '@agentx/lib/settings';
import { usePluginsStore } from '@agentx/state/plugins';
import apiFetch from '@wordpress/api-fetch';
import { addQueryArgs } from '@wordpress/url';
import { create } from 'zustand';

// Its card reloads the site once Imagify says it's done.
const WATCHED = ['imagify/optimize-media'];

// Each product the chat changed, by id, so the card that made it keeps up.
export const useProductsStore = create(() => ({}));

// A product found off the page, so its update form can still name it.
const found = new Map();
export const foundProductName = (id) => found.get(id);

// WPForms' field types on this site, Pro adding more, named in the site's language.
export const useFieldTypesStore = create(() => ({ types: null }));

const FOLLOWS = {
	'woocommerce/products-query': ({ products = [] }) => {
		for (const { id, name } of products) if (name) found.set(id, name);
	},
	'woocommerce/product-update': ({ product }) =>
		product && useProductsStore.setState({ [product.id]: product }),
	'woocommerce/product-delete': ({ deleted, id }) =>
		deleted && useProductsStore.setState({ [id]: { deleted: true } }),
	'wpforms/describe-editing-schema': ({ field_types: types }) =>
		Array.isArray(types) && useFieldTypesStore.setState({ types }),
};

let asking = null;
export const fieldTypes = () => {
	const { types } = useFieldTypesStore.getState();
	if (types) return Promise.resolve(types);
	asking ??= runAbility('wpforms/describe-editing-schema', {})
		.then(({ field_types: listed = [] }) => listed)
		.catch(() => [])
		.finally(() => {
			asking = null;
		});
	return asking;
};

// WPForms takes a field type by its key, and the agent or the user may give the name it shows, like Dropdown.
export const keyedType = (type, known) =>
	known.find((each) => each.type === type)?.type ??
	known.find(({ label }) => label?.toLowerCase() === String(type).toLowerCase())
		?.type ??
	type;

const keyedTypes = async (types) => {
	const known = await fieldTypes();
	return types.map((type) => keyedType(type, known));
};

const INPUTS = {
	'imagify/bulk-optimize': async (input) => ({ context: 'wp', ...input }),
	'wpforms/add-field': async (input) => {
		const [type] = await keyedTypes([input.type]);
		return { ...input, type };
	},
	'wpforms/create-form': async (input) => {
		if (!Array.isArray(input.fields)) return input;
		const types = await keyedTypes(input.fields.map((field) => field?.type));
		return {
			...input,
			fields: input.fields.map((field, at) => ({ ...field, type: types[at] })),
		};
	},
};

// Tool names can't hold a slash, and ability names never hold an underscore.
export const abilityOf = (tool) =>
	tool.includes('__') ? tool.replace('__', '/') : null;

export const abilityNamed = (name) => {
	for (const category of usePluginsStore.getState().abilities) {
		const ability = category.abilities.find((each) => each.name === name);
		if (ability) return { ...ability, plugin: category.label };
	}
	return null;
};

// Core's DELETE verb; destructive alone is an update, like a new price.
export const isDelete = ({ annotations }) =>
	Boolean(annotations.destructive && annotations.idempotent);

// SimplyBook leaves readonly unset on every ability; a list or get by its name only reads.
const READS = /^[^/]+\/(list|get|count|search|query|describe|find|read)-/;
const reads = (ability) =>
	ability.annotations.readonly ?? READS.test(ability.name);

export const asks = (name) => {
	const ability = abilityNamed(name);
	return Boolean(ability && !reads(ability));
};

export const readOnly = (name) => {
	const ability = abilityNamed(name);
	return Boolean(ability && reads(ability));
};

// Core's run route answers any other verb with a 405.
const verbOf = (ability) => {
	if (ability.annotations.readonly) return 'GET';
	return isDelete(ability) ? 'DELETE' : 'POST';
};

// The model sends null for a field it left out, which the ability's schema refuses.
const withoutNulls = (value) => {
	if (Array.isArray(value)) return value.map(withoutNulls);
	if (!value || typeof value !== 'object') return value;
	return Object.fromEntries(
		Object.entries(value)
			.filter(([, each]) => each != null)
			.map(([key, each]) => [key, withoutNulls(each)]),
	);
};

// A query string carries text, and PHP reads "false" as true.
const queryable = (value) => {
	if (typeof value === 'boolean') return Number(value);
	if (Array.isArray(value)) return value.map(queryable);
	if (!value || typeof value !== 'object') return value;
	return Object.fromEntries(
		Object.entries(value).map(([key, each]) => [key, queryable(each)]),
	);
};

// The model never sees confirm, since the user's Allow is the confirmation.
const takesConfirm = (schema) =>
	[
		schema,
		...(schema?.oneOf ?? []),
		...(schema?.anyOf ?? []),
		...(schema?.allOf ?? []),
	].some((each) => each?.properties?.confirm?.type === 'boolean');

// Core reads a missing input as null, which an object schema without a default refuses.
const emptyInput = (schema) => {
	if (schema?.type !== 'object' || 'default' in schema) return null;
	return Object.fromEntries(
		Object.entries(schema.properties ?? {})
			.filter(([, each]) => each?.default !== undefined)
			.map(([key, each]) => [key, each.default]),
	);
};

const queried = (path, input) => {
	if (!input) return path;
	if (!Object.keys(input).length) return `${path}?input=`;
	return addQueryArgs(path, { input: queryable(input) });
};

export const runAbility = async (name, given, { confirm = true } = {}) => {
	const ability = abilityNamed(name);
	if (!ability) throw new Error(`${name} isn't available on this site.`);
	const asked = (await INPUTS[name]?.(given ?? {})) ?? given;
	const sent = withoutNulls({
		...asked,
		...(takesConfirm(ability.inputSchema) && { confirm }),
	});
	const input = Object.keys(sent).length
		? sent
		: emptyInput(ability.inputSchema);
	const path = `/wp-abilities/v1/abilities/${name}/run`;
	const method = verbOf(ability);
	// Marks the run as the agent's, which the plugin lets write where a plugin keeps AI writes off.
	const headers = { 'X-Extendify-Agent': '1' };
	const result = await apiFetch(
		method === 'POST'
			? { path, method, headers, ...(input && { data: { input } }) }
			: { path: queried(path, input), method, headers },
	);
	FOLLOWS[name]?.(result ?? {});
	if (!reads(ability) && !WATCHED.includes(name)) await showSaved();
	return result;
};

const isSchema = (value) =>
	typeof value === 'object' && value !== null && !Array.isArray(value);

const withEnums = (a, b) =>
	a.enum && b.enum ? { ...a, enum: [...new Set([...a.enum, ...b.enum])] } : a;

// WooCommerce puts a product's fields in one oneOf branch per product type.
const flattened = (schema) => {
	const branches = [
		...(schema.oneOf ?? []),
		...(schema.anyOf ?? []),
		...(schema.allOf ?? []),
	]
		.filter(isSchema)
		.map(flattened);
	const properties = { ...schema.properties };
	for (const branch of branches) {
		for (const [key, property] of Object.entries(branch.properties)) {
			properties[key] = properties[key]
				? withEnums(properties[key], property)
				: property;
		}
	}
	const byAll = (branches[0]?.required ?? []).filter((key) =>
		branches.every((branch) => branch.required.includes(key)),
	);
	return { properties, required: [...(schema.required ?? []), ...byAll] };
};

const controlOf = (name, property) => {
	if (property.enum) return { type: 'select', options: property.enum };
	const type = [property.type].flat().find((each) => each !== 'null');
	if (type === 'boolean') return { type: 'checkbox' };
	if (type === 'integer' || type === 'number') return { type: 'number' };
	if (type !== 'string') return null;
	if (name.includes('price')) return { type: 'price' };
	return { type: name.includes('description') ? 'textarea' : 'text' };
};

const tidied = (name) => {
	const words = name.replace(/[_-]+/g, ' ').trim();
	return words.charAt(0).toUpperCase() + words.slice(1);
};

// A field the schema lacks, or a list or object, has no control unless the form gives one; its value still goes with the run.
export const formFields = (
	schema,
	input,
	{ fields = [], hidden = [], labels = {}, controls = {} } = {},
) => {
	const { properties, required } = flattened(isSchema(schema) ? schema : {});
	// The agent looks an id up, and the user knows the thing by its name.
	const shown = [
		...new Set([...fields, ...Object.keys(input), ...required]),
	].filter((name) => !/(^|_)id$/.test(name) && !hidden.includes(name));
	return shown.flatMap((name) => {
		const control =
			controls[name] ??
			(isSchema(properties[name]) ? controlOf(name, properties[name]) : null);
		if (!control) return [];
		return [
			{
				name,
				label: labels[name] || tidied(name),
				value: input[name],
				...control,
				required: required.includes(name),
			},
		];
	});
};
