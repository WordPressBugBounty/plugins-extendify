import { playOf, useAnimation } from '@agentx/chat/AnimationOptions';
import {
	loadFonts,
	SLOW,
	usePreloadFonts,
	useSlowFont,
} from '@agentx/chat/FontOptions';
import { Loading } from '@agentx/chat/LayoutOptions';
import { TILE } from '@agentx/chat/styles';
import { VibeDrawing } from '@agentx/chat/VibeOptions';
import {
	designOptions,
	pickStyle,
	pickUrl,
	restyles,
	shownPick,
	usePreviewVersion,
	useShownPick,
} from '@agentx/lib/design';
import { useSitePage } from '@agentx/lib/hooks';
import { renderUrl } from '@agentx/lib/patch-site';
import { useWarmOptions } from '@agentx/lib/prefetch';
import { useDraftStore } from '@agentx/state/draft';
import { useRunStore } from '@agentx/state/run';
import { useEffect, useId, useRef, useState } from '@wordpress/element';
import { decodeEntities } from '@wordpress/html-entities';
import { __ } from '@wordpress/i18n';

const SHOWN = 8;

const useLocked = () => {
	const page = useSitePage();
	const working = useRunStore((state) => state.working);
	const stuck = useDraftStore((state) => state.clashes.length > 0);
	return working || stuck || !page;
};

const Problem = ({ children }) => (
	<p role="alert" className="m-0 text-agentx-caption text-agentx-alert">
		{children}
	</p>
);

// translators: Shown in the AI Agent's Site Guide when the design option the user picked couldn't be applied.
const notApplied = () =>
	__("Couldn't apply that. Please try again.", 'extendify-local');

const Swatches = ({ colors }) => (
	<span aria-hidden="true" className="flex -space-x-2 rtl:space-x-reverse">
		{['foreground', 'primary', 'secondary', 'tertiary'].map((role) => (
			<span
				key={role}
				style={{
					background: colors[role] ?? 'transparent',
					boxShadow: `${colors.background ?? 'transparent'} 0 0 0 1.5px, rgb(0 0 0 / 0.08) 0 0 0 1px inset`,
				}}
				className="size-6 rounded-full"
			/>
		))}
	</span>
);

const FontSample = ({ fonts, title, pending = false }) => {
	const slow = useSlowFont(fonts);
	return (
		<>
			<span
				style={{ fontFamily: fonts.heading ?? undefined }}
				className="truncate text-base text-agentx-design-option-ink"
			>
				{decodeEntities(window.extSharedData?.siteTitle ?? '') || title}
			</span>
			<span
				style={{ fontFamily: fonts.body ?? undefined }}
				className="truncate text-agentx-caption text-agentx-muted"
			>
				{title}
			</span>
			{(slow || pending) && <Loading className="end-1.5 top-1.5 size-3" />}
		</>
	);
};

// A corner-only tile drew every style as the same gray square.
const VibeFace = (option) => (
	<VibeDrawing option={option} className="size-full" />
);

// Every tab stands at the tallest one's height, so the card doesn't resize across them.
const ROWS =
	'h-[min(calc(4.5*2.75rem+4*0.5rem+0.25rem),var(--agentx-tiles-fit,999rem))]';

const LAYERS = {
	colors: {
		// translators: Screen reader name for the AI Agent's list of color schemes to try on the site.
		group: () => __('Color schemes', 'extendify-local'),
		columns: 'grid-cols-2',
		scrolls: ROWS,
		tile: 'flex h-11 items-center justify-center',
		style: ({ colors }) => ({ background: colors.background ?? undefined }),
		Face: Swatches,
	},
	fonts: {
		// translators: Screen reader name for the AI Agent's list of font pairs to try on the site.
		group: () => __('Font pairs', 'extendify-local'),
		columns: 'grid-cols-2',
		scrolls: ROWS,
		tile: 'flex h-11 min-w-0 flex-col justify-center bg-agentx-design-option px-3 text-start',
		Face: FontSample,
		onLoad: loadFonts,
		waits: true,
	},
	vibe: {
		// translators: Screen reader name for the AI Agent's list of site styles to try. A site style sets corners, spacing and how blocks look, not colors or fonts.
		group: () => __('Site styles', 'extendify-local'),
		columns: 'grid-cols-4',
		scrolls: ROWS,
		tile: 'aspect-square overflow-hidden',
		Face: VibeFace,
	},
};

const SWATCHES = [
	'background',
	'foreground',
	'primary',
	'secondary',
	'tertiary',
];
const sameColors = (option, original) =>
	Boolean(option.colors && original.colors) &&
	SWATCHES.every(
		(slug) =>
			(option.colors[slug] ?? '').toLowerCase() ===
			(original.colors[slug] ?? '').toLowerCase(),
	);

const Options = ({
	layer,
	firsts,
	opened,
	active,
	onPicked,
	optionsOf = designOptions,
}) => {
	const { group, columns, tile, style, Face, onLoad, scrolls, waits } =
		LAYERS[layer];
	const draft = useDraftStore();
	const locked = useLocked();
	const page = useSitePage();
	const preview = usePreviewVersion();
	const [list, setList] = useState(null);
	const [failed, setFailed] = useState(false);
	const [problem, setProblem] = useState(false);
	const [trying, setTrying] = useState(null);
	const [slowPick, setSlowPick] = useState(null);
	const picked = useShownPick(draft, layer, list, trying);

	useEffect(() => {
		setSlowPick(null);
		if (!waits || trying === null) return;
		const timer = setTimeout(() => setSlowPick(trying), SLOW);
		return () => clearTimeout(timer);
	}, [trying, waits]);

	const load = () => {
		setFailed(false);
		const { version } = draft;
		optionsOf(layer).then(
			(got) =>
				Promise.resolve(onLoad?.(got)).then(() => {
					firsts.current[layer] ??= got.current;
					opened.current[layer] ??= shownPick(
						useDraftStore.getState(),
						layer,
						got,
					);
					setList({ ...got, version });
				}),
			() => setFailed(true),
		);
	};
	// A save's newer draft comes before its count, and the list is kept by the count.
	useEffect(load, [draft.version, draft.saves]);

	const urlOf = (id) => pickUrl(page, layer, id, { version: preview.now() });
	const warmUrlOf = (id) =>
		restyles(layer) ? renderUrl(urlOf(id)) : urlOf(id);
	const warmOne = useWarmOptions(
		Boolean(list && !locked && active),
		() =>
			['', ...list.options.map(({ id }) => id)].slice(0, SHOWN).map(warmUrlOf),
		{ fetched: restyles(layer) },
	);

	if (failed) {
		return (
			<Problem>
				{
					// translators: Shown in the AI Agent's Site Guide when its design options couldn't load.
					__("Couldn't load these.", 'extendify-local')
				}{' '}
				<button
					type="button"
					onClick={load}
					className="agentx-focus border-0 bg-transparent p-0 text-agentx-caption text-agentx-guide-ink underline"
				>
					{
						// translators: Loads the design options in the AI Agent's Site Guide again after they failed to load.
						__('Try again', 'extendify-local')
					}
				</button>
			</Problem>
		);
	}

	const original = list && {
		id: '',
		// translators: The AI Agent's Site Guide option that keeps what the site has now, beside other colors, fonts or styles to try.
		title: __('Original', 'extendify-local'),
		...(firsts.current[layer] ?? list.current),
	};
	// A site saved on one of the options would show it twice.
	const options = list && [
		...(list.options.some((option) => sameColors(option, original))
			? []
			: [original]),
		...list.options,
	];

	const pick = async (id) => {
		if (id === picked || locked) return;
		setProblem(false);
		setTrying(id);
		try {
			const { colors, paint, duotone } =
				options.find((option) => option.id === id) ?? {};
			// Autosave may have saved a later pick, so Original names the look the tab opened on.
			const sent = id === '' ? (opened.current[layer] ?? '') : id;
			await pickStyle(layer, sent, {
				preview,
				colors,
				paint,
				duotone,
				tile: id,
			});
			onPicked?.(layer);
		} catch {
			setProblem(true);
		}
		// A newer pick may still be loading, and needs its spinner kept.
		setTrying((now) => (now === id ? null : now));
	};

	return (
		<div className="@container flex flex-col gap-2">
			<fieldset
				data-agentx-tiles
				aria-label={group()}
				aria-busy={!options}
				// Overflow-hidden squares have no minimum height, so auto rows would shrink them to fit.
				className={`-m-1 grid min-w-0 auto-rows-max ${columns} gap-2 overflow-y-auto overscroll-y-contain border-0 p-1 ${scrolls}`}
			>
				{options
					? options.map((option) => (
							<button
								key={option.id}
								type="button"
								aria-label={option.title}
								aria-pressed={option.id === picked}
								aria-disabled={locked}
								onClick={() => pick(option.id)}
								onPointerEnter={() => warmOne(warmUrlOf(option.id))}
								onPointerLeave={() => warmOne(null)}
								onFocus={() => warmOne(warmUrlOf(option.id))}
								style={style?.(option)}
								className={`${TILE} ${tile}`}
							>
								<Face
									{...option}
									{...(waits && { pending: slowPick === option.id })}
								/>
							</button>
						))
					: Array.from({ length: SHOWN }, (_, at) => (
							<span
								key={at}
								className={`animate-pulse rounded-agentx-control bg-agentx-design-option-loading motion-reduce:animate-none ${tile}`}
							/>
						))}
			</fieldset>
			{problem && <Problem>{notApplied()}</Problem>}
		</div>
	);
};

export const KINDS = [
	// translators: The AI Agent's Site Guide option for no entrance animation on the site.
	{ id: 'none', title: () => __('None', 'extendify-local') },
	// translators: The AI Agent's Site Guide option for an entrance animation where blocks fade into view.
	{ id: 'fade', title: () => __('Fade in', 'extendify-local') },
	// translators: The AI Agent's Site Guide option for an entrance animation where blocks fade in while rising into place.
	{ id: 'fade-up', title: () => __('Fade up', 'extendify-local') },
	// translators: The AI Agent's Site Guide option for an entrance animation where blocks grow into their full size.
	{ id: 'zoom-in', title: () => __('Zoom in', 'extendify-local') },
];

export const SPEEDS = [
	// translators: A speed for the site's entrance animations, in the AI Agent's Site Guide.
	{ id: 'slow', title: () => __('Slow', 'extendify-local') },
	// translators: A speed for the site's entrance animations, in the AI Agent's Site Guide.
	{ id: 'medium', title: () => __('Medium', 'extendify-local') },
	// translators: A speed for the site's entrance animations, in the AI Agent's Site Guide.
	{ id: 'fast', title: () => __('Fast', 'extendify-local') },
];

// One after another, the way a page's sections come into view.
const LINES = ['w-full', 'w-3/4', 'w-5/6'];

const Lines = ({ kind, speed }) => (
	<span
		aria-hidden="true"
		className="flex h-10 w-12 shrink-0 flex-col justify-center gap-1 overflow-hidden rounded-agentx-control bg-agentx-hover px-1.5"
	>
		{LINES.map((width, at) => (
			<span
				key={width}
				style={{ '--agentx-tile-delay': `${at * 100}ms` }}
				className={`h-1.5 rounded-full bg-agentx-ink/25 ${width} ${playOf(kind, speed)} motion-reduce:group-hover/tile:animate-none`}
			/>
		))}
	</span>
);

const Animations = ({ active, onPicked }) => {
	const locked = useLocked();
	const page = useSitePage();
	const preview = usePreviewVersion();
	const [problem, setProblem] = useState(false);
	const { shown, type, speed, pickOf } = useAnimation();

	const urlOf = (id) =>
		pickUrl(page, 'animation', pickOf(id), { version: preview.now() });
	const warmOne = useWarmOptions(!locked && active, () =>
		KINDS.map(({ id }) => urlOf(`${id}:${speed}`)),
	);

	const pick = async (id) => {
		if (locked || id === shown) return;
		setProblem(false);
		try {
			await pickStyle('animation', pickOf(id), { preview });
			onPicked?.('animation');
		} catch {
			setProblem(true);
		}
	};

	return (
		<div className={`flex flex-col gap-3 overflow-y-auto ${ROWS}`}>
			<fieldset
				// translators: Screen reader name for the AI Agent's list of entrance animations to try on the site.
				aria-label={__('Animations', 'extendify-local')}
				className="m-0 grid min-w-0 grid-cols-2 gap-2 border-0 p-0"
			>
				{KINDS.map(({ id, title }) => (
					<button
						key={id}
						type="button"
						aria-pressed={id === type}
						aria-disabled={locked}
						onClick={() => pick(`${id}:${speed}`)}
						onPointerEnter={() => warmOne(urlOf(`${id}:${speed}`))}
						onFocus={() => warmOne(urlOf(`${id}:${speed}`))}
						className={`${TILE} group/tile flex h-14 items-center gap-3 bg-agentx-design-option px-2 text-agentx-caption font-agentx-button text-agentx-design-option-ink`}
					>
						<Lines kind={id} speed={speed} />
						{title()}
					</button>
				))}
			</fieldset>
			<div className="flex items-center justify-between gap-3">
				<span className="text-agentx-caption text-agentx-guide-muted">
					{
						// translators: Label for how fast the site's entrance animations play, in the AI Agent's Site Guide.
						__('Speed', 'extendify-local')
					}
				</span>
				<fieldset
					// translators: Screen reader name for the choice of how fast the site's entrance animations play, in the AI Agent's Site Guide.
					aria-label={__('Speed', 'extendify-local')}
					className="m-0 inline-flex min-w-0 rounded-agentx-control border-0 bg-agentx-design-tabs p-0.75"
				>
					{SPEEDS.map(({ id, title }) => (
						<button
							key={id}
							type="button"
							aria-pressed={id === speed}
							aria-disabled={locked || type === 'none'}
							onClick={() => type !== 'none' && pick(`${type}:${id}`)}
							onPointerEnter={() =>
								type !== 'none' && warmOne(urlOf(`${type}:${id}`))
							}
							onFocus={() => type !== 'none' && warmOne(urlOf(`${type}:${id}`))}
							className="agentx-focus rounded-agentx-control border-0 bg-transparent px-3 py-1 text-agentx-caption font-agentx-button text-agentx-guide-speed-ink hover:text-agentx-design-tabs-hover-ink aria-disabled:opacity-[var(--agentx-disabled-opacity,50%)] aria-pressed:bg-agentx-design-tab aria-pressed:text-agentx-design-tab-ink aria-pressed:shadow-(--agentx-design-tab-shadow)"
						>
							{title()}
						</button>
					))}
				</fieldset>
			</div>
			{problem && <Problem>{notApplied()}</Problem>}
		</div>
	);
};

const TABS = [
	// translators: Tab in the AI Agent's Site Guide for trying color schemes on the site.
	{ id: 'colors', title: () => __('Colors', 'extendify-local') },
	// translators: Tab in the AI Agent's Site Guide for trying font pairs on the site.
	{ id: 'fonts', title: () => __('Fonts', 'extendify-local') },
	// translators: Tab in the AI Agent's Site Guide for trying site styles, like corners and spacing.
	{ id: 'vibe', title: () => __('Style', 'extendify-local') },
	// translators: Tab in the AI Agent's Site Guide for trying entrance animations on the site.
	{ id: 'animation', title: () => __('Animation', 'extendify-local') },
];

export const designTabs = () =>
	TABS.filter(
		(tab) => tab.id !== 'animation' || window.extAgentXData?.animations,
	);

// The guide holds the tab, so its Next and Skip can step through them.
export const DesignStep = ({
	stage,
	onStage,
	active = true,
	onPicked,
	optionsOf,
}) => {
	const id = useId();
	const tabs = useRef({});
	const root = useRef(null);
	// A pick reloads the tab, and Original would show the look just tried, even after a tab switch.
	const firsts = useRef({});
	const opened = useRef({});
	usePreloadFonts(root);
	const shown = designTabs();
	const tab = stage ?? shown[0].id;
	const setTab = onStage;

	// The tab a workflow opened on may start out of sight in a narrow chat.
	useEffect(() => {
		const button = tabs.current[tab];
		const list = button?.parentElement;
		if (!list || list.scrollWidth <= list.clientWidth) return;
		const at = button.getBoundingClientRect();
		const box = list.getBoundingClientRect();
		list.scrollLeft += at.left - box.left - (box.width - at.width) / 2;
	}, [tab]);

	const onKeyDown = (event) => {
		const at = shown.findIndex((each) => each.id === tab);
		const rtl = getComputedStyle(event.currentTarget).direction === 'rtl';
		const step = { ArrowRight: rtl ? -1 : 1, ArrowLeft: rtl ? 1 : -1 }[
			event.key
		];
		if (!step) return;
		event.preventDefault();
		const next = shown[(at + step + shown.length) % shown.length].id;
		setTab(next);
		tabs.current[next]?.focus();
	};

	return (
		<div ref={root} className="flex flex-col gap-2">
			<div
				role="tablist"
				// translators: Screen reader name for the tabs of the AI Agent's Site Guide design step.
				aria-label={__('Design', 'extendify-local')}
				onKeyDown={onKeyDown}
				// Long labels in some languages scroll sideways rather than spill out.
				className="flex h-9 w-full items-center overflow-x-auto rounded-agentx-control bg-agentx-design-tabs p-[3px] [scrollbar-width:none]"
			>
				{shown.map(({ id: each, title }) => (
					<button
						key={each}
						ref={(node) => {
							tabs.current[each] = node;
						}}
						type="button"
						role="tab"
						id={`${id}-${each}`}
						aria-selected={each === tab}
						aria-controls={`${id}-panel`}
						tabIndex={each === tab ? 0 : -1}
						onClick={() => setTab(each)}
						className="agentx-focus inline-flex h-full flex-1 items-center justify-center rounded-[calc(var(--radius-agentx-control)-3px)] border-0 bg-transparent px-2 text-agentx-caption font-agentx-button whitespace-nowrap text-agentx-design-tabs-ink transition-colors hover:text-agentx-design-tabs-hover-ink aria-selected:bg-agentx-design-tab aria-selected:text-agentx-design-tab-ink aria-selected:shadow-(--agentx-design-tab-shadow)"
					>
						{title()}
					</button>
				))}
			</div>
			<div
				role="tabpanel"
				id={`${id}-panel`}
				aria-labelledby={`${id}-${tab}`}
				className="pt-1"
			>
				{tab === 'animation' ? (
					<Animations active={active} onPicked={onPicked} />
				) : (
					<Options
						key={tab}
						layer={tab}
						firsts={firsts}
						opened={opened}
						active={active}
						onPicked={onPicked}
						optionsOf={optionsOf}
					/>
				)}
			</div>
		</div>
	);
};
