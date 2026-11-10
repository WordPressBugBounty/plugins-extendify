import { ImageGrid, SearchField, useDebounced } from '@agentx/chat/ImageGrid';
import { sampleImages } from '@agentx/demo/sample-images';
import { stockImages } from '@agentx/lib/image-sources';
import { defaultImageSearch } from '@shared/lib/image-search-defaults';
import { useEffect, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

export const StockImages = ({ pickedId, onPick, demo, seed = '' }) => {
	const [search, setSearch] = useState(seed);
	const term = useDebounced(search.trim(), 500);
	// An empty search shows photos for the site's own topics, picked once per opening.
	const [fallback] = useState(defaultImageSearch);
	const query = term || fallback;
	// Kept per query, so an answer that lands late only fills its own search.
	const [found, setFound] = useState({});

	useEffect(() => {
		if (demo) return;
		stockImages(query).then(
			(images) => setFound((was) => ({ ...was, [query]: { images } })),
			() => setFound((was) => ({ ...was, [query]: { failed: true } })),
		);
	}, [query, demo]);

	const shown = demo
		? { images: sampleImages('stock') }
		: (found[query] ?? { images: null });

	return (
		<div className="flex flex-col gap-3">
			<SearchField
				// translators: Placeholder and name of the search field on the AI Agent's stock photos tab.
				label={__('Search stock photos', 'extendify-local')}
				value={search}
				onChange={setSearch}
			/>
			{shown.failed ? (
				<p role="alert" className="m-0 text-sm text-agentx-alert">
					{
						// translators: Shown on the AI Agent's stock photos tab when the search failed.
						__("Couldn't load stock photos.", 'extendify-local')
					}
				</p>
			) : (
				<ImageGrid
					images={shown.images}
					pickedId={pickedId}
					empty={
						// translators: Shown on the AI Agent's stock photos tab when the search finds nothing.
						__('No images found.', 'extendify-local')
					}
					onPick={onPick}
				/>
			)}
		</div>
	);
};
