import { buildSubtreeManifest } from './subtree-manifest';

// Wrapper/child units edited as one so both schemas ship; grow over time.
const COMBO_BLOCKS = new Set(['core/buttons', 'core/button']);

// Temporary ignore logos until we add template support
export const IGNORED_BLOCKS = new Set(['core/site-logo']);

// single/combo pin the selection's schema; multi ships the subtree's or narrows.
export const classifyBlockEdit = ({ block, root }) => {
	if (!block?.blockType || IGNORED_BLOCKS.has(block.blockType))
		return { bucket: 'multi' };
	if (COMBO_BLOCKS.has(block.blockType)) return { bucket: 'combo' };
	if (buildSubtreeManifest(root).length > 1) return { bucket: 'multi' };
	return { bucket: 'single' };
};
