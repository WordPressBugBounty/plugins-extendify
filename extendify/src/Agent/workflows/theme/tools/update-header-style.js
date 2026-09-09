import { fetchBlockCodeById } from '@agent/lib/block-code';
import { ensureCoreBlocksRegistered } from '@agent/lib/register-blocks';
import apiFetch from '@wordpress/api-fetch';
import { parse, serialize } from '@wordpress/blocks';

const PART_ATTR = 'data-extendify-part';
const PART_ID_ATTR = 'data-extendify-part-block-id';
const PART_SLUG_ATTR = 'data-extendify-part-slug';

// The compositions style.css documents. Anything else has no theme rules: a
// pill with no glass has no background, dark with no scrim is white on white.
export const HEADER_STATES = {
	plain: [],
	sticky: ['ext-header-sticky'],
	overlay: ['ext-header-overlay'],
	'overlay-dark': ['ext-header-overlay', 'ext-header--dark'],
	glass: ['ext-header-sticky', 'ext-header-glass'],
	'glass-dark': ['ext-header-sticky', 'ext-header-glass', 'ext-header--dark'],
	pill: [
		'ext-header-sticky',
		'ext-header-overlay',
		'ext-header-glass',
		'ext-header-sticky--floating-pill',
	],
	'pill-dark': [
		'ext-header-sticky',
		'ext-header-overlay',
		'ext-header-glass',
		'ext-header-sticky--floating-pill',
		'ext-header--dark',
	],
};

const OWNED = [...new Set(Object.values(HEADER_STATES).flat())];

export const headerBlockEl = () =>
	[...document.querySelectorAll(`[${PART_ATTR}="header"]`)].find(
		(el) => !el.parentElement?.closest(`[${PART_ATTR}="header"]`),
	) ?? null;

export const isExtendableHeader = () => {
	const el = headerBlockEl();
	if (!el) return false;
	const classes = String(el.className).split(/\s+/);
	return OWNED.some((cls) => classes.includes(cls));
};

const stateOf = (classes) => {
	const on = OWNED.filter((cls) => classes.includes(cls));
	const match = Object.entries(HEADER_STATES).find(
		([, want]) =>
			want.length === on.length && want.every((cls) => on.includes(cls)),
	);
	return match?.[0] ?? null;
};

// Null for a header the theme never composed, so the model is not told a state
// that would silently rewrite the other classes.
export const currentHeaderState = () => {
	const el = headerBlockEl();
	return el ? stateOf([...el.classList]) : null;
};

export const nextClasses = (current, state) => {
	const want = HEADER_STATES[state];
	if (!want) return [...current];
	return [...current.filter((cls) => !OWNED.includes(cls)), ...want];
};

export default async ({ state } = {}) => {
	const el = headerBlockEl();
	const blockId = el?.getAttribute(PART_ID_ATTR);
	const partSlug = el?.getAttribute(PART_SLUG_ATTR);
	if (!blockId || !partSlug) {
		return { changed: false, message: 'This page has no header to change.' };
	}

	await ensureCoreBlocksRegistered();
	const code = await fetchBlockCodeById(blockId, {
		kind: 'template-part',
		partSlug,
	});
	const blocks = code ? parse(code) : [];
	if (blocks.length !== 1 || !blocks[0].name) {
		return { changed: false, message: 'The header block could not be read.' };
	}

	const block = blocks[0];
	const current = String(block.attributes?.className ?? '')
		.split(/\s+/)
		.filter(Boolean);
	const next = nextClasses(current, state);
	if (stateOf(next) === stateOf(current)) {
		return { changed: false, headerState: stateOf(next) };
	}

	const { applied = [] } = await apiFetch({
		path: '/extendify/v1/agent/update-blocks',
		method: 'POST',
		data: {
			partSlug,
			operations: [
				{
					op: 'edit',
					blockId,
					block: serialize([
						{
							...block,
							attributes: { ...block.attributes, className: next.join(' ') },
						},
					]),
				},
			],
		},
	});
	if (!applied.length) {
		return { changed: false, message: 'The header change was not saved.' };
	}

	// Without this the change shows only after a reload.
	for (const cls of OWNED) el.classList.toggle(cls, next.includes(cls));
	return { changed: true, headerState: stateOf(next) };
};
