import { IGNORED_BLOCKS } from '@agent/lib/classify-block-edit';
import { buildSubtreeManifest } from '@agent/lib/subtree-manifest';

// Mirrors TagBlocks::$ignored — a patch here would rewrite every loop item.
const LOOP_BLOCKS = new Set([
	'core/query',
	'core/post-template',
	'core/post-content',
	'core/comments',
	'core/comment-template',
	'woocommerce/product-collection',
	'woocommerce/product-template',
]);

const MAX_CANDIDATES = 25;

const BLOCK_ID_ATTR = 'data-extendify-agent-block-id';

// An item can't add a sibling, nor stand in for the whole set.
export const CONTAINER_TYPES = new Set([
	'core/columns',
	'core/list',
	'core/group',
]);

const addressable = (type) =>
	!LOOP_BLOCKS.has(type) && !IGNORED_BLOCKS.has(type);

const containersFor = (matches, byId) => {
	const found = new Map();
	for (const { blockId } of matches) {
		let node = document.querySelector(
			`[${BLOCK_ID_ATTR}="${CSS.escape(String(blockId))}"]`,
		)?.parentElement;
		while (node) {
			const id = node.getAttribute?.(BLOCK_ID_ATTR);
			const entry = id ? byId.get(id) : null;
			if (entry && CONTAINER_TYPES.has(entry.type)) {
				found.set(id, entry);
				break;
			}
			node = node.parentElement;
		}
	}
	return [...found.values()];
};

const matchesText = (blockText, text) =>
	!text || (blockText ?? '').toLowerCase().includes(text.toLowerCase());

const matchesType = (type, blockTypes) =>
	!blockTypes?.length || blockTypes.includes(type);

export default ({ blockTypes, text } = {}) => {
	const root = document.querySelector('.wp-site-blocks') ?? document.body;
	const all = buildSubtreeManifest(root).filter(({ type }) =>
		addressable(type),
	);
	const byId = new Map(all.map((entry) => [entry.blockId, entry]));
	const byType = all.filter(({ type }) => matchesType(type, blockTypes));
	const matches = byType.filter(({ text: blockText }) =>
		matchesText(blockText, text),
	);
	// "hero" is a position, not text: AND-ing it would match nothing.
	const textIgnored =
		Boolean(text) &&
		Boolean(blockTypes?.length) &&
		!matches.length &&
		byType.length > 0;
	const found = textIgnored ? byType : matches;
	// Cap first, or a long match list truncates the containers away.
	const shown = found.slice(0, MAX_CANDIDATES);
	const containers = containersFor(shown, byId).filter(
		(entry) => !shown.some(({ blockId }) => blockId === entry.blockId),
	);
	return {
		blockSearch: {
			total: found.length,
			...(textIgnored && { ignoredText: text }),
			candidates: [...shown, ...containers],
		},
	};
};
