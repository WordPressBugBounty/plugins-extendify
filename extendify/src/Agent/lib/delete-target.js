import { detectBlockType } from './block-type';

const BLOCK_ID_ATTR = 'data-extendify-agent-block-id';

// Wrappers that are broken markup without their last item — the op takes the
// wrapper. Not group/columns: an empty one still renders a box worth keeping.
const LIST_WRAPPERS = new Set([
	'core/buttons',
	'core/social-links',
	'core/list',
	'core/quote',
]);

// The wrapper never reaches the model (dropped from the manifest), so "delete this
// button" can only name the button — walk up to the wrapper when it's the last item.
export const resolveDeleteTarget = (blockId) => {
	const el = document.querySelector(`[${BLOCK_ID_ATTR}="${blockId}"]`);
	if (!el) return blockId;
	let targetId = blockId;
	let parent = el.parentElement?.closest(`[${BLOCK_ID_ATTR}]`);
	while (
		parent &&
		LIST_WRAPPERS.has(detectBlockType(parent)) &&
		parent.querySelectorAll(`[${BLOCK_ID_ATTR}]`).length === 1
	) {
		targetId = parent.getAttribute(BLOCK_ID_ATTR);
		parent = parent.parentElement?.closest(`[${BLOCK_ID_ATTR}]`);
	}
	return targetId;
};
