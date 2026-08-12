import { fetchBlockCodeById } from '@agent/lib/block-code';
import { applyBlockPatch } from '@agent/lib/block-patch';
import { buildNewBlock } from '@agent/lib/insertable-blocks';
import { ensureCoreBlocksRegistered } from '@agent/lib/register-blocks';
import { swapBlockImage } from '@agent/lib/replace-image';
import { useQuickEditStore } from '@quick-edit/state/store';
import apiFetch from '@wordpress/api-fetch';

// clear lists attributes to reset — null in a patch means "no change", not "remove".
const buildEdit = async ({ blockId, patch, clear }, source, postId) => {
	const previousContent = await fetchBlockCodeById(blockId, source, postId);
	if (!previousContent) return null;
	const presetSlugs = window.extAgentData?.context?.presetSlugs ?? {};
	const blockCode = applyBlockPatch(
		previousContent,
		patch,
		clear ?? [],
		presetSlugs,
	);
	if (blockCode === previousContent) return null;
	return { op: 'edit', blockId, block: blockCode };
};

const buildAdd = ({ anchorId, position, blockType, patch, clear }) => {
	const presetSlugs = window.extAgentData?.context?.presetSlugs ?? {};
	const block = buildNewBlock(blockType, patch, clear ?? [], presetSlugs);
	if (!block) return null;
	return { op: 'add', anchorId, position, block };
};

// The backend op has no image — the confirm UI attaches it before the tool runs.
const buildReplaceImage = async ({ blockId, image }, source, postId) => {
	if (!image) return null;
	const previousContent = await fetchBlockCodeById(blockId, source, postId);
	if (!previousContent) return null;
	const blockCode = swapBlockImage(previousContent, image);
	if (!blockCode || blockCode === previousContent) return null;
	return { op: 'edit', blockId, block: blockCode };
};

const BUILDERS = {
	edit: buildEdit,
	'replace-image': buildReplaceImage,
	delete: ({ blockId }) => ({ op: 'delete', blockId }),
	move: ({ blockId, targetId, position }) => ({
		op: 'move',
		blockId,
		targetId,
		position,
	}),
	wrap: ({ blockId, container }) => ({ op: 'wrap', blockId, container }),
	add: buildAdd,
};

export default async (input) => {
	await ensureCoreBlocksRegistered();
	const operations = Array.isArray(input?.operations) ? input.operations : [];
	if (!operations.length) return { refused: true, reason: 'no-block' };

	const { agentBlock } = useQuickEditStore.getState();
	// Template parts have a separate id space; refusing beats a silent no-op.
	if (agentBlock?.source?.kind === 'template-part')
		return { refused: true, reason: 'template-part' };

	const { postId } = window.extAgentData?.context ?? {};
	const results = await Promise.all(
		operations.map((operation) =>
			BUILDERS[operation?.op]?.(operation, agentBlock?.source, postId),
		),
	);
	const built = results.filter(Boolean);
	// A no-op build must surface, or the reply claims a change that never happened.
	const dropped = operations
		.filter((operation, index) => operation && !results[index])
		.map(({ blockId }) => ({ blockId, reason: 'no-change' }));
	if (!built.length) return { refused: true, reason: 'no-op' };

	const { applied = [], refused = [] } = await apiFetch({
		path: '/extendify/v1/agent/update-blocks',
		method: 'POST',
		data: { postId, operations: built },
	});
	if (!applied.length) return { refused: true, reason: 'not-applied' };
	// Not `refused`: Agent.jsx reads any truthy `refused` — even [] — as a refusal.
	return { ok: true, applied, refusedOperations: [...refused, ...dropped] };
};
