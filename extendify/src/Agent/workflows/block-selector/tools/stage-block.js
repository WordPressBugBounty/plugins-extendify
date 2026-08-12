import { buildAgentBlockDescriptor } from '@quick-edit/lib/agent-block-descriptor';
import { useQuickEditStore } from '@quick-edit/state/store';

const BLOCK_ID_ATTR = 'data-extendify-agent-block-id';

const tagged = (el) => Boolean(el?.getAttribute?.(BLOCK_ID_ATTR));

const nearestTagged = (el) => {
	let node = el;
	while (node && !tagged(node)) node = node.parentElement;
	return node;
};

// Narrowing shrinks a section back; one block can't reach its siblings.
const patternFor = (el) => {
	const root = document.querySelector('.wp-site-blocks');
	let outermost = el;
	let node = el.parentElement;
	while (node && root?.contains(node)) {
		if (tagged(node)) outermost = node;
		node = node.parentElement;
	}
	return outermost;
};

const enclosing = (els) => {
	let node = els[0];
	while (node && !els.every((el) => node.contains(el)))
		node = node.parentElement;
	return nearestTagged(node) ?? els[0];
};

export default ({ blockIds } = {}) => {
	const ids = (blockIds ?? []).filter(Boolean);
	const els = ids
		.map((id) =>
			document.querySelector(`[${BLOCK_ID_ATTR}="${CSS.escape(String(id))}"]`),
		)
		.filter(Boolean);
	if (!els.length) {
		return {
			error: {
				message: ids.length
					? `Block ${ids[0]} is no longer on the page`
					: 'No block id was given',
			},
		};
	}
	const target = els.length > 1 ? enclosing(els) : patternFor(els[0]);
	const descriptor = buildAgentBlockDescriptor(target);
	useQuickEditStore.getState().setAgentBlock(descriptor);
	// DOMHighlighter measures but never scrolls, so an off-screen match stays unseen.
	target.scrollIntoView({ behavior: 'smooth', block: 'center' });
	return { stagedBlockIds: [descriptor.id] };
};
