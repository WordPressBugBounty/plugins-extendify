import apiFetch from '@wordpress/api-fetch';

// variation here should be added to the payload by the custom component
const id = window.extSharedData.globalStylesPostID;
export default async ({ variation }) => {
	// Get current block style variations (vibe) to preserve them
	const currentVariations = await apiFetch({
		path: '/extendify/v1/agent/block-style-variations',
	});

	const preservedBlocks = Object.keys(currentVariations).reduce(
		(blocks, blockName) => {
			blocks[blockName] = {
				...variation.styles?.blocks?.[blockName],
				variations: currentVariations[blockName],
			};
			return blocks;
		},
		{},
	);

	return apiFetch({
		method: 'POST',
		path: `/wp/v2/global-styles/${id}`,
		data: {
			id,
			settings: variation.settings,
			styles: {
				...variation.styles,
				blocks: {
					...variation.styles?.blocks,
					...preservedBlocks,
				},
			},
		},
	});
};
