import { sampleImages } from '@agentx/demo/sample-images';
import { BLOCK } from '@agentx/lib/block-box';
import { editBlocks } from '@agentx/lib/edit-blocks';
import { refreshCredits, useGeneration } from '@agentx/lib/generation';
import { countPick, stockImages } from '@agentx/lib/image-sources';
import { presetsOf } from '@agentx/lib/presets';
import { setProductImage } from '@agentx/lib/products';
import { shellDocument } from '@agentx/lib/shell-document';
import {
	attachmentFor,
	blockImage,
	libraryImages,
	replaceBlockImage,
	saveImage,
	uploadImage,
} from '@agentx/lib/site-images';
import { track } from '@agentx/lib/track';
import {
	Choices,
	CustomColor,
	DragHandle,
	FIELD,
	SaveButtons,
	SURFACE,
	TEXT_BUTTON,
} from '@agentx/quick-edit/controls';
import {
	dropDuotoneFilters,
	duotoneFilter,
	duotoneOf,
} from '@agentx/quick-edit/duotone';
import { swatchesOf } from '@agentx/quick-edit/inline-color';
import { useBesidePart } from '@agentx/quick-edit/place';
import { updatePost } from '@agentx/quick-edit/posts';
import { quietPage } from '@agentx/quick-edit/quiet-page';
import { useShellStore } from '@agentx/state/shell';
import { useImageGenerationStore } from '@shared/state/generate-images';
import {
	createPortal,
	useEffect,
	useId,
	useRef,
	useState,
} from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';

const SOURCES = [
	{
		id: 'library',
		// translators: A tab in Quick Edit's image panel listing the images already in the user's media library.
		label: () => __('Library', 'extendify-local'),
	},
	{
		id: 'upload',
		// translators: A tab in Quick Edit's image panel for uploading an image from the user's computer.
		label: () => __('Upload', 'extendify-local'),
	},
	{
		id: 'generate',
		// translators: A tab in Quick Edit's image panel for making a new image with AI from a description.
		label: () => __('Generate', 'extendify-local'),
	},
	{
		id: 'stock',
		// translators: A tab in Quick Edit's image panel for searching free stock photos.
		label: () => __('Stock photos', 'extendify-local'),
	},
];

const TAB = `${TEXT_BUTTON} bg-transparent px-2.5 text-agentx-quick-edit-tab-ink hover:bg-agentx-quick-edit-tab-hover aria-selected:bg-agentx-quick-edit-tab-selected`;
const ACCENT = `${TEXT_BUTTON} bg-agentx-quick-edit-image-button text-agentx-quick-edit-image-button-ink`;
const NOTE = 'm-0 py-2 text-agentx-quick-edit text-agentx-quick-edit-label';
// Restored on Cancel, since the page shows each pick at once.
const SHOWN = ['src', 'srcset', 'style'];

const SHAPES = [
	// translators: A shape option in Quick Edit's image panel; the picture keeps its own proportions.
	[null, __('Original', 'extendify-local')],
	// translators: A shape option in Quick Edit's image panel; the picture is cropped to a square.
	['1', __('Square', 'extendify-local')],
	['4/3', '4:3'],
	['3/2', '3:2'],
	['16/9', '16:9'],
	['3/4', '3:4'],
	['2/3', '2:3'],
	['9/16', '9:16'],
];

// The browser writes 4/3 as "4 / 3", and patterns save a square as 1/1 too.
const shapeOf = (picture) => {
	const ratio = picture.style.aspectRatio.replace(/\s+/g, '');
	// WordPress unsets it on a section that has a height of its own.
	if (!ratio || ratio === 'auto' || ratio === 'unset') return null;
	return ratio === '1/1' ? '1' : ratio;
};

// A section is shaped as a whole, and a featured image's shape is every post's in its list.
const shapedOf = ({ type, id, block, picture }) => {
	if (type === 'core/image') return [picture];
	if (type === 'core/cover') return [block];
	if (type !== 'core/post-featured-image') return [];
	return [...block.ownerDocument.querySelectorAll(`[${BLOCK}]`)]
		.filter((each) => each.getAttribute(BLOCK) === id)
		.map((each) => (each.matches('img') ? each : each.querySelector('img')))
		.filter(Boolean);
};

// What a shape changes, put back one by one, since a filter being tried shares the style.
const SHAPING = ['aspect-ratio', 'object-fit', 'min-height', 'width', 'height'];

const drawnShape = (element) => ({
	element,
	style: element.getAttribute('style'),
	props: SHAPING.map((name) => [name, element.style.getPropertyValue(name)]),
});

const undrawShape = ({ element, props }) => {
	for (const [name, value] of props) {
		if (value) element.style.setProperty(name, value);
		else element.style.removeProperty(name);
	}
};

const drawShape = (element, ratio, type) => {
	if (type === 'core/cover') {
		element.style.aspectRatio = ratio ?? 'unset';
		element.style.minHeight = ratio ? 'unset' : '';
		return;
	}
	element.style.aspectRatio = ratio ?? 'auto';
	element.style.objectFit = ratio ? 'cover' : '';
	if (type !== 'core/post-featured-image' || !ratio) return;
	element.style.width = '100%';
	element.style.height = '';
};

const Shapes = ({ value, onChange }) => {
	const id = useId();
	// A ratio the list lacks, like a pattern's 5/4, stays a choice instead of reading as Original.
	const [own] = useState(() =>
		SHAPES.some(([ratio]) => ratio === value) ? null : value,
	);
	const options = SHAPES.map(([ratio, label]) => [ratio ?? '', label]);
	return (
		<div className="flex items-center gap-2 px-1 text-agentx-quick-edit">
			<label htmlFor={id} className="text-agentx-quick-edit-label">
				{
					// translators: Label of the row in Quick Edit's image panel that crops the picture to a shape, like a square.
					__('Shape', 'extendify-local')
				}
			</label>
			<Choices
				id={id}
				value={value ?? ''}
				options={own ? [...options, [own, own.replace('/', ':')]] : options}
				onChange={(ratio) => onChange(ratio || null)}
			/>
		</div>
	);
};

const Filters = ({ value, filters, own, onChange }) => {
	const id = useId();
	const options = [
		// translators: A filter option in Quick Edit's image panel; the picture shows its own colors, with no two-color tint.
		['', __('None', 'extendify-local')],
		...filters.map(({ slug, name }) => [slug, name]),
		// translators: A filter option in Quick Edit's image panel; the two-color tint the picture already has, which isn't one of the theme's.
		...(own ? [['custom', __('Custom', 'extendify-local')]] : []),
	];
	return (
		<div className="flex items-center gap-2 px-1 text-agentx-quick-edit">
			<label htmlFor={id} className="text-agentx-quick-edit-label">
				{
					// translators: Label of the choice in Quick Edit's image panel that tints the picture with two of the theme's colors, or takes that tint off.
					__('Filter', 'extendify-local')
				}
			</label>
			<Choices id={id} value={value} options={options} onChange={onChange} />
		</div>
	);
};

const Overlay = ({ swatches, color, dim, onColor, onClear, onDim }) => (
	<div className="flex flex-col gap-2.5 px-1">
		<div className="flex flex-wrap items-center gap-2">
			<span className="w-16 shrink-0 text-agentx-quick-edit text-agentx-quick-edit-label">
				{
					// translators: Label of the row in Quick Edit's panel over a section with a background picture; it sets the color laid over the picture.
					__('Overlay', 'extendify-local')
				}
			</span>
			<fieldset
				// translators: Screen reader name for the color choices in Quick Edit's panel over a section with a background picture.
				aria-label={__('Overlay color', 'extendify-local')}
				className="m-0 flex flex-wrap items-center gap-2 border-0 p-0"
			>
				<button
					type="button"
					// translators: The first color choice in Quick Edit's panel over a section with a background picture; it takes the color laid over the picture off.
					aria-label={__('Transparent', 'extendify-local')}
					aria-pressed={dim === 0}
					title={__('Transparent', 'extendify-local')}
					onClick={onClear}
					className="agentx-focus size-6 shrink-0 cursor-pointer rounded-agentx-quick-edit-swatch border border-solid border-agentx-quick-edit-swatch-border bg-[repeating-conic-gradient(#d1d5db_0_25%,#fff_0_50%)] bg-size-[8px_8px] p-0 aria-pressed:outline-2 aria-pressed:outline-offset-2 aria-pressed:outline-agentx-quick-edit-swatch-picked"
				/>
				{swatches.map((swatch) => (
					<button
						key={swatch.slug}
						type="button"
						aria-label={swatch.name}
						aria-pressed={color === swatch.slug}
						title={swatch.name}
						onClick={() => onColor({ value: swatch.slug, css: swatch.css })}
						style={{ background: swatch.css }}
						className="agentx-focus size-6 shrink-0 cursor-pointer rounded-agentx-quick-edit-swatch border border-solid border-agentx-quick-edit-swatch-border p-0 aria-pressed:outline-2 aria-pressed:outline-offset-2 aria-pressed:outline-agentx-quick-edit-swatch-picked"
					/>
				))}
				<CustomColor
					value={
						color && !swatches.some(({ slug }) => slug === color) ? color : null
					}
					onPick={(value) => onColor({ value, css: value })}
				/>
			</fieldset>
		</div>
		<label className="flex items-center gap-2 text-agentx-quick-edit">
			<span className="w-16 shrink-0 text-agentx-quick-edit-label">
				{
					// translators: Label of the slider in Quick Edit's panel over a section with a background picture; it sets how strongly the overlay color covers the picture.
					__('Strength', 'extendify-local')
				}
			</span>
			<input
				type="range"
				min="0"
				max="100"
				step="10"
				value={dim}
				onChange={(event) => onDim(Number(event.target.value))}
				className="min-w-0 flex-1 accent-agentx-quick-edit-slider"
			/>
		</label>
	</div>
);

const show = (picture, url) => {
	// A fixed cover paints its picture as a background.
	if (!picture.matches('img')) {
		picture.style.backgroundImage = `url(${JSON.stringify(url)})`;
		return;
	}
	picture.removeAttribute('srcset');
	picture.setAttribute('src', url);
};

const useSettled = (value, ms = 300) => {
	const [settled, setSettled] = useState(value);
	useEffect(() => {
		const wait = setTimeout(() => setSettled(value), ms);
		return () => clearTimeout(wait);
	}, [value, ms]);
	return settled;
};

const Grid = ({ images, picked, onPick }) => (
	<div className="grid grid-cols-4 gap-1.5">
		{images.map((image) => (
			<button
				key={image.id ?? image.url}
				type="button"
				aria-pressed={picked?.url === image.url}
				aria-label={
					image.name ||
					// translators: Screen reader name for a picture with no description in Quick Edit's image panel.
					__('Image', 'extendify-local')
				}
				onClick={() => onPick(image)}
				className="agentx-focus aspect-square cursor-pointer overflow-hidden rounded-agentx-quick-edit-control border-2 border-solid border-transparent bg-agentx-quick-edit-tile p-0 aria-pressed:border-agentx-quick-edit-tile-picked"
			>
				<img
					src={image.thumb ?? image.url}
					alt=""
					className="size-full object-cover"
				/>
			</button>
		))}
	</div>
);

const SearchField = ({ value, onChange, label }) => (
	<input
		value={value}
		onChange={(event) => onChange(event.target.value)}
		aria-label={label}
		placeholder={label}
		className={`${FIELD} mb-2 w-full`}
	/>
);

const Library = ({ picked, onPick }) => {
	const [search, setSearch] = useState('');
	const query = useSettled(search.trim());
	const [more, setMore] = useState({ query, page: 1 });
	// A new search starts again from its first page.
	const page = more.query === query ? more.page : 1;
	const [found, setFound] = useState({ images: [], more: false });
	const [failed, setFailed] = useState(false);
	// A demo, like the Designer's, has no media library to ask.
	const demo = useShellStore((state) => Boolean(state.chatDemo));

	useEffect(() => {
		if (demo) {
			setFound({ images: sampleImages('library'), more: false });
			return;
		}
		const stop = new AbortController();
		setFailed(false);
		libraryImages({ search: query, page, signal: stop.signal })
			.then((got) =>
				setFound((was) =>
					page === 1 ? got : { ...got, images: [...was.images, ...got.images] },
				),
			)
			.catch((error) => error?.name !== 'AbortError' && setFailed(true));
		return () => stop.abort();
	}, [query, page, demo]);

	return (
		<>
			<SearchField
				value={search}
				onChange={setSearch}
				// translators: Placeholder and screen reader name for the search field over the user's media library in Quick Edit's image panel.
				label={__('Search your images', 'extendify-local')}
			/>
			{failed && (
				<p className={NOTE}>
					{
						// translators: Shown in Quick Edit's image panel when the user's media library didn't load.
						__("Couldn't load your images.", 'extendify-local')
					}
				</p>
			)}
			<Grid images={found.images} picked={picked} onPick={onPick} />
			{found.more && (
				<button
					type="button"
					onClick={() => setMore({ query, page: page + 1 })}
					className={`${TAB} mt-2 w-full`}
				>
					{
						// translators: Button under the user's media library in Quick Edit's image panel that loads more of their images.
						__('Show more', 'extendify-local')
					}
				</button>
			)}
		</>
	);
};

const Upload = ({ onPick }) => {
	const input = useRef(null);
	const [over, setOver] = useState(false);
	const [busy, setBusy] = useState(false);
	const [failed, setFailed] = useState(false);

	const take = async (file) => {
		if (!file?.type.startsWith('image/') || busy) return;
		setBusy(true);
		setFailed(false);
		try {
			// A file's name is no description, so its alt text starts empty.
			onPick({ ...(await uploadImage(file)), name: '' });
		} catch {
			setFailed(true);
		}
		setBusy(false);
	};

	return (
		<section
			// translators: Screen reader name for the upload tab of Quick Edit's image panel, where the user drops or chooses an image from their computer.
			aria-label={__('Upload an image', 'extendify-local')}
			onDragOver={(event) => {
				event.preventDefault();
				setOver(true);
			}}
			onDragLeave={(event) => {
				if (event.currentTarget.contains(event.relatedTarget)) return;
				setOver(false);
			}}
			onDrop={(event) => {
				event.preventDefault();
				setOver(false);
				take(event.dataTransfer.files?.[0]);
			}}
			className={`flex h-full flex-col items-center justify-center gap-2 rounded-agentx-quick-edit-control border-2 border-dashed ${over ? 'border-agentx-quick-edit-drop-active' : 'border-agentx-quick-edit-drop-border'}`}
		>
			<input
				ref={input}
				type="file"
				accept="image/*"
				hidden
				onChange={(event) => take(event.target.files?.[0])}
			/>
			<button
				type="button"
				disabled={busy}
				onClick={() => input.current?.click()}
				className={ACCENT}
			>
				{busy
					? // translators: Shown on Quick Edit's upload button while the chosen image uploads.
						__('Uploading…', 'extendify-local')
					: // translators: Button in Quick Edit's image panel that opens the user's files to pick an image.
						__('Choose an image', 'extendify-local')}
			</button>
			<p className={`${NOTE} py-0`}>
				{
					// translators: Shown under the upload button in Quick Edit's image panel.
					__('or drop one here', 'extendify-local')
				}
			</p>
			{failed && (
				<p className={NOTE}>
					{
						// translators: Shown in Quick Edit's image panel when the chosen image didn't upload.
						__("Couldn't upload it. Please try again.", 'extendify-local')
					}
				</p>
			)}
		</section>
	);
};

const Generate = ({ generation, picked, onPick }) => {
	const { prompt, setPrompt, made, working, problem, generate } = generation;
	const { remaining, total } = useImageGenerationStore(
		(state) => state.imageCredits,
	);
	const blocked = !prompt.trim() || working || remaining <= 0;

	useEffect(() => {
		refreshCredits();
	}, []);

	return (
		<div className="flex flex-col gap-2">
			<textarea
				value={prompt}
				onChange={(event) => setPrompt(event.target.value)}
				onKeyDown={(event) => {
					if (event.key !== 'Enter' || event.nativeEvent.isComposing) return;
					// Shift+Enter breaks the line, and Cmd+Enter saves the whole edit.
					if (event.shiftKey || event.metaKey || event.ctrlKey) return;
					event.preventDefault();
					if (!blocked) generate();
				}}
				rows={2}
				// translators: Placeholder and screen reader name for the field in Quick Edit's image panel where the user describes an image for AI to make.
				aria-label={__('Describe the image', 'extendify-local')}
				placeholder={__('Describe the image', 'extendify-local')}
				className={`${FIELD} h-auto w-full resize-none py-1.5`}
			/>
			<div className="flex items-center justify-between gap-2">
				<span className="text-agentx-caption text-agentx-quick-edit-label">
					{sprintf(
						// translators: %1$d is how many image generations the site has left today, %2$d how many it gets a day. Shown in Quick Edit's image panel.
						__('Image credits left today: %1$d of %2$d', 'extendify-local'),
						remaining,
						total,
					)}
				</span>
				<button
					type="button"
					disabled={blocked}
					onClick={() => generate()}
					className={ACCENT}
				>
					{working
						? // translators: Shown on Quick Edit's Generate button while AI makes the image.
							__('Generating…', 'extendify-local')
						: // translators: Button in Quick Edit's image panel that makes an image with AI from the description above it.
							__('Generate', 'extendify-local')}
				</button>
			</div>
			{problem && <p className={NOTE}>{problem}</p>}
			<Grid images={made} picked={picked} onPick={onPick} />
		</div>
	);
};

const Stock = ({ initial, picked, onPick }) => {
	const [search, setSearch] = useState(initial);
	const query = useSettled(search.trim());
	const [found, setFound] = useState([]);
	const [failed, setFailed] = useState(false);

	useEffect(() => {
		setFailed(false);
		if (!query) {
			setFound([]);
			return;
		}
		let current = true;
		stockImages(query)
			.then((images) => current && setFound(images))
			.catch(() => current && setFailed(true));
		return () => {
			current = false;
		};
	}, [query]);

	return (
		<>
			<SearchField
				value={search}
				onChange={setSearch}
				// translators: Placeholder and screen reader name for the search field in Quick Edit's stock photos tab.
				label={__('Search stock photos', 'extendify-local')}
			/>
			{failed && (
				<p className={NOTE}>
					{
						// translators: Shown in Quick Edit's image panel when the stock photo search failed.
						__("Couldn't load stock photos.", 'extendify-local')
					}
				</p>
			)}
			<Grid
				images={found}
				picked={picked}
				onPick={(image) => onPick({ ...image, stock: true })}
			/>
		</>
	);
};

const OVERLAY = ':scope > .wp-block-cover__background';
// The pictures whose filter the draft writes as a block setting.
const FILTERED = ['core/image', 'core/cover'];

export const ImageBar = ({
	target,
	changed,
	commit = { current: null },
	onDone,
	onFailed,
	failed = null,
}) => {
	const { block, picture, logo, product, post } = target;
	// A logo's, product photo's or featured image's alt text is the media library's, not the page's.
	const ownAlt = !logo && !product && !post;
	const [shapes] = useState(() => shapedOf(target).map(drawnShape));
	const shaped = shapes.length > 0;
	const layer =
		target.type === 'core/cover' ? block.querySelector(OVERLAY) : null;
	// The frame's own list follows a color scheme being tried; the shell's is the saved one.
	const [filters] = useState(() =>
		FILTERED.includes(target.type)
			? (picture.ownerDocument.defaultView?.extAgentXDuotones ??
				presetsOf().duotones ??
				[])
			: [],
	);
	const id = useId();
	const bar = useRef(null);
	const [before] = useState(() => ({
		filter: duotoneOf(block, filters),
		...Object.fromEntries(
			SHOWN.map((name) => [name, picture.getAttribute(name)]),
		),
		alt: picture.getAttribute('alt') ?? '',
		shape: shaped ? shapeOf(shapes[0].element) : null,
		layer: layer && {
			style: layer.getAttribute('style'),
			dim: Math.round(
				Number(
					layer.ownerDocument.defaultView.getComputedStyle(layer).opacity,
				) * 100,
			),
		},
	}));
	const [shape, setShape] = useState(before.shape);
	const [filter, setFilter] = useState(before.filter);
	const filtered =
		FILTERED.includes(target.type) &&
		(filters.length > 0 || before.filter !== '');
	const [dim, setDim] = useState(before.layer?.dim ?? 0);
	// A picked overlay color: none until one is, then its value and how it shows.
	const [tint, setTint] = useState(null);
	const [swatches] = useState(() => (layer ? swatchesOf(presetsOf()) : []));
	const [source, setSource] = useState('library');
	const [picked, setPicked] = useState(null);
	const [alt, setAlt] = useState(before.alt);
	const [problem] = useState(failed);
	const saved = useRef(false);

	const pick = (image) => {
		setPicked(image);
		setAlt(image.name ?? '');
		show(picture, image.url);
	};
	// Here, not in its tab, so switching tabs never throws away a paid image.
	const generation = useGeneration({ samples: [], onMade: pick });
	const looks = {
		...(shaped && shape !== before.shape && { aspect_ratio: shape }),
		...(filtered && filter !== before.filter && { duotone: filter || null }),
		...(layer && dim !== before.layer.dim && { overlay: dim }),
		...(layer && tint && { overlay_color: tint.value }),
	};
	changed.current = () =>
		generation.working ||
		Boolean(picked) ||
		alt !== before.alt ||
		Object.keys(looks).length > 0;

	const pickShape = (ratio) => {
		setShape(ratio);
		for (const each of shapes) {
			// A section's own height can't be read back once a shape unsets it.
			if (ratio === before.shape) undrawShape(each);
			else drawShape(each.element, ratio, target.type);
		}
	};

	const pickFilter = (slug) => {
		setFilter(slug);
		if (slug === before.filter) {
			picture.style.filter = '';
			return;
		}
		const preset = filters.find((each) => each.slug === slug);
		const drawn = preset && duotoneFilter(picture.ownerDocument, preset);
		picture.style.filter = drawn ? `url(#${drawn})` : 'none';
	};

	const pickDim = (value) => {
		setDim(value);
		layer.style.opacity = String(value / 100);
	};

	const pickTint = (next) => {
		setTint(next);
		// A theme color's class sets the layer's color with !important.
		layer.style.setProperty('background-color', next.css, 'important');
		// A color laid over at no strength would show nothing of it.
		if (dim === 0) pickDim(50);
	};

	// No color and no strength; strength given back later shows WordPress's own black, as it saves.
	const clearTint = () => {
		setTint({ value: null, css: '#000' });
		layer.style.setProperty('background-color', '#000', 'important');
		pickDim(0);
	};

	const putBack = useRef(null);
	putBack.current = () => {
		for (const { element, style } of shapes) {
			if (style === null) element.removeAttribute('style');
			else element.setAttribute('style', style);
		}
		for (const name of SHOWN) {
			if (before[name] === null) picture.removeAttribute(name);
			else picture.setAttribute(name, before[name]);
		}
		if (!layer) return;
		if (before.layer.style === null) layer.removeAttribute('style');
		else layer.setAttribute('style', before.layer.style);
	};

	useEffect(() => {
		const quiet = quietPage(block, { typed: false });
		bar.current?.focus();
		return () => {
			quiet();
			dropDuotoneFilters(picture.ownerDocument);
			if (!saved.current) putBack.current();
		};
	}, [block, picture]);

	const drag = useBesidePart(bar, block, { inView: true });

	const keep = async (image) => {
		if (logo) return saveImage('logo', image);
		if (product) return setProductImage(product, image);
		const restyle = {
			op: 'set-style',
			block: target.id,
			type: target.type,
			styles: looks,
			direct: true,
		};
		// The picture is the post's own and saves live; the shape is the list's, in the draft.
		if (post) {
			const result = Object.keys(looks).length
				? await editBlocks({ ops: [restyle] })
				: null;
			if (result?.refused || result?.confirm || !image) return result;
			await updatePost(post, { featured_media: image.id });
			return result;
		}
		if (!Object.keys(looks).length) {
			return replaceBlockImage(
				{ id: target.id, type: target.type },
				{ ...image, name: alt },
			);
		}
		// One edit, so one Undo takes back the picture and its look together.
		return editBlocks({
			ops: image
				? [
						{
							op: 'replace-image',
							block: target.id,
							type: target.type,
							image: { id: image.id, ...(alt && { alt }) },
						},
						restyle,
					]
				: [restyle],
		});
	};

	const describe = () =>
		editBlocks({
			ops: [
				{
					op: 'set-alt',
					block: target.id,
					type: target.type,
					alt,
					direct: true,
				},
				...(Object.keys(looks).length
					? [
							{
								op: 'set-style',
								block: target.id,
								type: target.type,
								styles: looks,
								direct: true,
							},
						]
					: []),
			],
		});

	const save = async () => {
		const pictured = Boolean(picked) || alt !== before.alt;
		const described = !picked && ownAlt && alt !== before.alt;
		saved.current = pictured || Object.keys(looks).length > 0;
		onDone();
		if (!saved.current) return;
		try {
			const image =
				!pictured || described
					? null
					: picked
						? await attachmentFor(logo ? 'logo' : 'image', {
								...picked,
								name: alt || picked.name,
							})
						: await blockImage({ id: target.id });
			if (pictured && !described && !image?.id) {
				throw new Error(
					// translators: Shown in Quick Edit when the user changed a picture's alt text, but the picture isn't one of their uploaded images, so it can't be saved.
					__(
						'This picture isn’t in your media library, so its alt text can’t be saved. Pick an image to replace it instead.',
						'extendify-local',
					),
				);
			}
			const result = described ? await describe() : await keep(image);
			if (result?.confirm) {
				throw new Error(
					// translators: Shown in Quick Edit when the picture sits in a part shared by several pages of the user's website, which it can't save yet.
					__(
						'This part shows on other pages too, so it can’t be changed here yet.',
						'extendify-local',
					),
				);
			}
			if (result?.refused) throw new Error(result.refused);
			if (picked?.stock || picked?.generated) {
				countPick({
					source: picked.stock ? 'stock' : 'generated',
					image: picked,
				});
			}
			track('quick-edit-saved', { kind: 'image' });
		} catch (error) {
			putBack.current();
			onFailed?.(
				error?.message ||
					// translators: Shown in Quick Edit when saving a picture failed.
					__("Couldn't save it. Please try again.", 'extendify-local'),
			);
		}
	};
	commit.current = save;

	const keys = useRef(null);
	keys.current = (event) => {
		// Escape or Cmd+Enter typed in the chat box mustn't cancel or save the picture.
		if (!bar.current?.contains(event.target) && event.target !== document.body)
			return;
		if (event.key === 'Escape') {
			event.preventDefault();
			event.stopPropagation();
			onDone();
		}
		if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
			event.preventDefault();
			save();
		}
	};
	useEffect(() => {
		const listen = (event) => keys.current(event);
		document.addEventListener('keydown', listen);
		return () => document.removeEventListener('keydown', listen);
	}, []);

	const panel = {
		library: <Library picked={picked} onPick={pick} />,
		upload: <Upload onPick={pick} />,
		generate: (
			<Generate generation={generation} picked={picked} onPick={pick} />
		),
		stock: <Stock initial={before.alt} picked={picked} onPick={pick} />,
	}[source];

	return createPortal(
		<div
			ref={bar}
			data-agentx-editor=""
			role="dialog"
			tabIndex={-1}
			aria-label={
				logo
					? // translators: Screen reader name for Quick Edit's panel over the logo on the user's website, for changing it.
						__('Change logo', 'extendify-local')
					: // translators: Screen reader name for Quick Edit's panel over a picture on the user's website, for changing it.
						__('Change image', 'extendify-local')
			}
			className={`group fixed top-0 left-0 z-100002 flex w-[30rem] max-w-[calc(100vw-1rem)] flex-col gap-1 rounded-agentx-quick-edit p-1 outline-none ${SURFACE}`}
		>
			<div className="flex items-start gap-0.5">
				<DragHandle onPointerDown={drag} />
				<div
					role="tablist"
					// translators: Screen reader name for the tabs of Quick Edit's image panel, each a place to get a picture from.
					aria-label={__('Image sources', 'extendify-local')}
					className="flex min-w-0 flex-1 flex-wrap items-center gap-0.5"
				>
					{SOURCES.map((tab) => (
						<button
							key={tab.id}
							id={`${id}-${tab.id}`}
							type="button"
							role="tab"
							aria-selected={source === tab.id}
							aria-controls={`${id}-panel`}
							onClick={() => setSource(tab.id)}
							className={TAB}
						>
							{tab.label()}
						</button>
					))}
				</div>
			</div>
			<div
				id={`${id}-panel`}
				role="tabpanel"
				aria-labelledby={`${id}-${source}`}
				className="h-72 overflow-y-auto px-1 pt-1"
			>
				{panel}
			</div>
			{(layer || shaped || filtered || ownAlt) && (
				<div className="flex flex-col gap-3 pt-2 pb-1">
					{layer && (
						<Overlay
							swatches={swatches}
							color={tint?.value ?? null}
							dim={dim}
							onColor={pickTint}
							onClear={clearTint}
							onDim={pickDim}
						/>
					)}
					{(shaped || filtered) && (
						<div className="flex flex-wrap items-center gap-x-4 gap-y-2">
							{shaped && <Shapes value={shape} onChange={pickShape} />}
							{filtered && (
								<Filters
									value={filter}
									filters={filters}
									own={before.filter === 'custom'}
									onChange={pickFilter}
								/>
							)}
						</div>
					)}
					{post && shape !== before.shape && (
						<p className="m-0 px-1 text-agentx-quick-edit text-agentx-quick-edit-label">
							{
								// translators: Shown in Quick Edit's image panel over a post's featured image once the user picks a shape; the shape is the site's layout for every post, so it isn't saved for this post alone.
								__(
									'Every post’s featured image takes this shape, not only this one.',
									'extendify-local',
								)
							}
						</p>
					)}
					{ownAlt && (
						<label className="flex items-center gap-2 px-1 text-agentx-quick-edit">
							<span className="shrink-0 text-agentx-quick-edit-label">
								{
									// translators: Label of the field in Quick Edit's image panel for the picture's description, read by screen readers.
									__('Alt text', 'extendify-local')
								}
							</span>
							<input
								value={alt}
								onChange={(event) => setAlt(event.target.value)}
								onKeyDown={(event) => {
									if (event.key !== 'Enter' || event.nativeEvent.isComposing)
										return;
									event.preventDefault();
									save();
								}}
								className={`${FIELD} flex-1`}
							/>
						</label>
					)}
				</div>
			)}
			{problem && (
				<p
					role="alert"
					className="m-0 px-2 pb-2 text-agentx-quick-edit text-agentx-quick-edit-problem"
				>
					{problem}
				</p>
			)}
			{/* Four tabs and both buttons don't fit one row in every language, so the buttons get their own. */}
			<div className="flex justify-end">
				<SaveButtons onCancel={onDone} onSave={save} />
			</div>
		</div>,
		shellDocument().body,
	);
};
