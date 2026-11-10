import { ImageGrid, SearchField, useDebounced } from '@agentx/chat/ImageGrid';
import { PRESS } from '@agentx/chat/styles';
import { sampleImages } from '@agentx/demo/sample-images';
import { libraryImages } from '@agentx/lib/site-images';
import { useEffect, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

// Pages of the media library's images, kept per search so a late answer only fills its own.
export const useLibrary = ({ term = '', generated, demo }) => {
	const [found, setFound] = useState({});
	const [loading, setLoading] = useState(false);
	const [focusAt, setFocusAt] = useState(null);

	useEffect(() => {
		if (demo) return;
		const controller = new AbortController();
		libraryImages({
			search: term,
			page: 1,
			generated,
			signal: controller.signal,
		}).then(
			(got) => setFound((was) => ({ ...was, [term]: { ...got, page: 1 } })),
			(error) =>
				error?.name !== 'AbortError' &&
				setFound((was) => ({ ...was, [term]: { failed: true } })),
		);
		return () => controller.abort();
	}, [term, generated, demo]);

	const shown = demo
		? {
				images: sampleImages(generated ? 'made' : 'library', generated ? 3 : 9),
			}
		: (found[term] ?? { images: null });

	const more = async () => {
		if (loading) return;
		setLoading(true);
		try {
			const got = await libraryImages({
				search: term,
				page: shown.page + 1,
				generated,
			});
			setFound((was) => ({
				...was,
				[term]: {
					...got,
					page: shown.page + 1,
					images: [...shown.images, ...got.images],
				},
			}));
			if (!got.more) setFocusAt(shown.images.length);
		} catch {
			// The images already shown stay; the button stays to try again.
		}
		setLoading(false);
	};

	return { shown, more, loading, focusAt };
};

export const LoadMore = ({ loading, onClick }) => (
	<button
		type="button"
		onClick={onClick}
		aria-disabled={loading}
		className={`agentx-focus self-center rounded-agentx-control border border-agentx-button-border bg-agentx-button px-3 py-[5px] text-agentx-body font-agentx-button text-agentx-button-ink ${PRESS} not-aria-disabled:hover:bg-agentx-button-hover aria-disabled:text-agentx-button-ink/[var(--agentx-disabled-opacity,60%)]`}
	>
		{loading
			? // translators: Shown on the AI Agent's Load more button while more images load.
				__('Loading…', 'extendify-local')
			: // translators: Loads more images in the AI Agent's image sheet.
				__('Load more', 'extendify-local')}
	</button>
);

export const LibraryImages = ({ which, current, pickedId, onPick, demo }) => {
	const [search, setSearch] = useState('');
	const term = useDebounced(search.trim(), 300);
	const { shown, more, loading, focusAt } = useLibrary({ term, demo });

	return (
		<div className="flex flex-col gap-3">
			<SearchField
				// translators: Placeholder and name of the search field on the AI Agent's media library tab.
				label={__('Search your media library', 'extendify-local')}
				value={search}
				onChange={setSearch}
			/>
			{shown.failed ? (
				<p role="alert" className="m-0 text-agentx-body text-agentx-alert">
					{
						// translators: Shown on the AI Agent's media library tab when the images couldn't load.
						__("Couldn't load your media library.", 'extendify-local')
					}
				</p>
			) : (
				<ImageGrid
					images={shown.images}
					pickedId={pickedId}
					currentId={current?.id}
					// Logos are often wide, so the whole image shows.
					fit={which === 'logo' ? 'contain' : 'cover'}
					focusAt={focusAt}
					empty={
						term
							? // translators: Shown on the AI Agent's media library tab when no image matches the search.
								__('No images match your search.', 'extendify-local')
							: // translators: Shown on the AI Agent's media library tab when the site has no images.
								__('Your media library has no images yet.', 'extendify-local')
					}
					onPick={onPick}
				/>
			)}
			{shown.more && <LoadMore loading={loading} onClick={more} />}
		</div>
	);
};
