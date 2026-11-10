import { PickedBadge } from '@agentx/chat/PickedBadge';
import { PRESS } from '@agentx/chat/styles';
import { useEffect, useRef, useState } from '@wordpress/element';
import { __, _n, sprintf } from '@wordpress/i18n';

export const useDebounced = (value, wait) => {
	const [settled, setSettled] = useState(value);
	useEffect(() => {
		const timer = setTimeout(() => setSettled(value), wait);
		return () => clearTimeout(timer);
	}, [value, wait]);
	return settled;
};

export const SearchField = ({ label, value, onChange }) => (
	<input
		type="search"
		value={value}
		onChange={(event) => onChange(event.target.value)}
		placeholder={label}
		aria-label={label}
		className="agentx-focus-inset w-full rounded-agentx-control border border-agentx-sheet-field-border bg-agentx-sheet-field px-3 py-2 text-agentx-body text-agentx-sheet-field-ink"
	/>
);

const Placeholder = () => (
	<span className="aspect-square animate-pulse rounded-agentx-control bg-agentx-sheet-tile" />
);

const said = (images, empty) => {
	if (!images)
		// translators: Read out by screen readers while the AI Agent's image sheet loads images.
		return __('Loading images…', 'extendify-local');
	if (!images.length) return empty;
	return sprintf(
		// translators: %d is how many images the AI Agent's image sheet shows. Read out by screen readers.
		_n('%d image', '%d images', images.length, 'extendify-local'),
		images.length,
	);
};

// Images is null while they load; pending adds tiles still on their way, like a generation.
export const ImageGrid = ({
	images,
	pending = 0,
	pickedId,
	currentId,
	fit = 'cover',
	empty,
	focusAt,
	onPick,
}) => {
	const grid = useRef(null);

	// A Load more that runs out of pages leaves, so focus moves to the first new image.
	useEffect(() => {
		if (focusAt != null) grid.current?.children[focusAt]?.focus();
	}, [focusAt]);

	return (
		<>
			{empty && <output className="sr-only">{said(images, empty)}</output>}
			{images?.length === 0 && !pending ? (
				<p className="m-0 py-6 text-center text-agentx-body text-agentx-sheet-muted">
					{empty}
				</p>
			) : (
				<div ref={grid} className="grid grid-cols-3 gap-2">
					{Array.from({ length: images ? pending : 6 }, (_, index) => (
						<Placeholder key={`pending-${index}`} />
					))}
					{images?.map((image) => (
						<button
							key={image.id}
							type="button"
							aria-pressed={image.id === pickedId}
							onClick={() => onPick(image)}
							// The focus ring sits outside the picked ring, so a picked tile under focus shows both.
							className={`agentx-focus relative aspect-square overflow-hidden rounded-agentx-control border-0 bg-agentx-sheet-tile p-0 ring-2 ring-offset-2 ring-offset-agentx-sheet ${PRESS} focus-visible:outline-offset-[6px] ${
								image.id === pickedId
									? 'ring-agentx-sheet-tile-picked'
									: 'ring-transparent hover:ring-agentx-sheet-tile-hover-ring'
							}`}
						>
							<img
								src={image.thumb ?? image.url}
								alt={
									image.name ||
									// translators: Names an image without a description in the AI Agent's image sheet.
									__('Image', 'extendify-local')
								}
								loading="lazy"
								className={`size-full ${fit === 'contain' ? 'object-contain' : 'object-cover'}`}
							/>
							{image.id === pickedId && <PickedBadge />}
							{image.id === currentId && (
								<span className="absolute start-1 bottom-1 rounded-sm bg-agentx-sheet-tag px-1.5 py-0.5 text-[11px] leading-none text-agentx-sheet-tag-ink">
									{
										// translators: Marks the site's current logo or icon among the images in the AI Agent's image sheet.
										__('Current', 'extendify-local')
									}
								</span>
							)}
						</button>
					))}
				</div>
			)}
		</>
	);
};
