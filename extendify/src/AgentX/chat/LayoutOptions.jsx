import { PickedBadge } from '@agentx/chat/PickedBadge';
import { ScrollRow } from '@agentx/chat/ScrollRow';
import { noteChange } from '@agentx/lib/card-changes';
import {
	designOptions,
	pickLayout,
	usePreviewVersion,
	useShownPick,
} from '@agentx/lib/design';
import { draftUrl, picksOf } from '@agentx/lib/draft';
import { scaleSite } from '@agentx/lib/fit-site';
import { useInView, useSitePage } from '@agentx/lib/hooks';
import { useDraftStore } from '@agentx/state/draft';
import { useRunStore } from '@agentx/state/run';
import { useEffect, useRef, useState } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';

// About two in view, with the next one peeking.
export const ITEM = 'shrink-0 basis-[42%]';
export const BOX =
	'relative aspect-[4/3] overflow-hidden rounded-agentx-design-option bg-agentx-layout-thumb';
export const PULSE = 'animate-pulse motion-reduce:animate-none';

// Each thumbnail renders the whole home page and can take seconds, which a faint pulse doesn't show.
export const Loading = ({ className = 'inset-0 m-auto size-6' }) => (
	<span
		aria-hidden="true"
		className={`pointer-events-none absolute ${className} animate-spin rounded-full bg-[conic-gradient(transparent_0_20%,var(--color-agentx-ink)_100%)] mask-[radial-gradient(farthest-side,transparent_calc(100%-3px),#000_calc(100%-2px))] opacity-40 motion-reduce:animate-none`}
	/>
);

export const Thumb = ({
	src,
	blank,
	drawn,
	ready,
	label,
	pressed,
	disabled,
	tabbable,
	buttonRef,
	onKeyDown,
	onFocus,
	onSeen,
	onDrawn,
	onLoaded,
	onPick,
}) => {
	const ref = useRef(null);
	const frame = useRef(null);
	const inView = useInView(ref);

	useEffect(() => onSeen(inView), [inView]);

	useEffect(() => {
		// React 18 drops a boolean inert, and React 19 drops an empty one.
		frame.current.inert = true;
		return scaleSite(frame.current);
	}, []);

	// The page shows long before its load event, which waits on every image and font.
	useEffect(() => {
		if (!onDrawn || !src || drawn) return;
		const timer = setInterval(() => {
			const page = frame.current?.contentDocument;
			if (
				!page ||
				page.URL === 'about:blank' ||
				page.readyState === 'loading'
			) {
				return;
			}
			clearInterval(timer);
			onDrawn();
		}, 100);
		return () => clearInterval(timer);
	}, [src, drawn]);

	return (
		<div
			ref={ref}
			className={`${ITEM} relative transition-transform ${
				disabled
					? 'opacity-[var(--agentx-disabled-opacity,60%)]'
					: 'has-[button:active]:scale-(--agentx-press-scale)'
			}`}
		>
			<div className={`${BOX} ${(onDrawn ? drawn : ready) ? '' : PULSE}`}>
				<iframe
					ref={frame}
					src={src ?? blank}
					title={label}
					// Scripts stay off; an opaque origin would cache fonts apart from the site's.
					sandbox="allow-same-origin"
					aria-hidden="true"
					tabIndex={-1}
					onLoad={() => src && onLoaded()}
					className="pointer-events-none absolute start-0 top-0 origin-top-left border-0 rtl:origin-top-right"
				/>
				{!ready && <Loading />}
			</div>
			<button
				ref={buttonRef}
				type="button"
				aria-label={label}
				aria-pressed={pressed}
				aria-disabled={disabled}
				tabIndex={tabbable ? 0 : -1}
				onKeyDown={onKeyDown}
				onFocus={onFocus}
				onClick={() => !disabled && onPick()}
				className="agentx-focus absolute inset-0 rounded-agentx-design-option border border-solid border-agentx-layout-thumb-border bg-transparent p-0 text-agentx-ink transition-colors not-aria-pressed:not-aria-disabled:hover:border-agentx-layout-thumb-hover-border aria-pressed:border-2 aria-pressed:border-agentx-layout-thumb-picked"
			>
				{pressed && <PickedBadge />}
			</button>
		</div>
	);
};

const nameOf = (at) =>
	at
		? sprintf(
				// translators: %d is a layout's place in the AI Agent's row of home page layouts to try, counting the site's own as 1. Read out by screen readers for its thumbnail.
				__('Layout %d', 'extendify-local'),
				at + 1,
			)
		: // translators: Read out by screen readers for the thumbnail of the home page's own layout, first in the AI Agent's row of layouts to try.
			__('Original layout', 'extendify-local');

export const useOptionRow = (count, start, { columns = 0 } = {}) => {
	const buttons = useRef([]);
	// Only one option takes Tab; the arrow keys move between them, as in a toolbar.
	const [active, setActive] = useState(start);

	const focusAt = (at) => {
		const button = buttons.current[at];
		button?.focus({ preventScroll: true });
		button?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
	};

	const onKeyDown = (event, at) => {
		const rtl = getComputedStyle(event.currentTarget).direction === 'rtl';
		const to = {
			ArrowRight: at + (rtl ? -1 : 1),
			ArrowLeft: at + (rtl ? 1 : -1),
			...(columns && {
				ArrowDown: Math.min(at + columns, count - 1),
				ArrowUp: Math.max(at - columns, 0),
			}),
			Home: 0,
			End: count - 1,
		}[event.key];
		if (to === undefined) return;
		// Left and Right would otherwise scroll the row instead of moving between options.
		event.preventDefault();
		focusAt(Math.min(Math.max(to, 0), count - 1));
	};

	return { buttons, active, setActive, focusAt, onKeyDown };
};

const Layouts = ({ ids, home, samples, disabled, live, picked, onPick }) => {
	const draft = useDraftStore();
	const pressedAt = Math.max(ids.indexOf(picked), 0);
	const { buttons, active, setActive, focusAt, onKeyDown } = useOptionRow(
		ids.length,
		pressedAt,
	);

	// Once the newest card has focus, its keyboard starts on the layout the site shows now.
	useEffect(() => {
		const card = buttons.current[pressedAt]?.closest('section');
		if (!live || samples || !card) return;
		const toPressed = (event) => event.target === card && focusAt(pressedAt);
		if (document.activeElement === card) focusAt(pressedAt);
		card.addEventListener('focus', toPressed);
		return () => card.removeEventListener('focus', toPressed);
	}, []);

	const preview = usePreviewVersion();
	const [seen, setSeen] = useState([]);
	const [loaded, setLoaded] = useState([]);
	const rows = ids.map((id, at) => ({
		id,
		src:
			samples?.[at] ??
			draftUrl(home, preview.first, { ...picksOf(draft), layout: id }),
	}));
	const pick = (id, at) =>
		onPick(
			samples?.[at] ??
				draftUrl(home, preview.now(), {
					...picksOf(useDraftStore.getState()),
					layout: id,
				}),
			id,
			preview,
		);
	// One at a time, so the thumbnails don't slow the site in view.
	const next = rows.find(
		({ id, src }) => seen.includes(id) && !loaded.includes(src),
	);

	return (
		<ScrollRow
			// translators: Screen reader name for the handle under the AI Agent's row of home page layouts, which scrolls the row sideways.
			label={__('Scroll layouts', 'extendify-local')}
		>
			{rows.map(({ id, src }, at) => (
				<Thumb
					key={id}
					src={loaded.includes(src) || id === next?.id ? src : undefined}
					ready={loaded.includes(src)}
					label={nameOf(at)}
					pressed={id === picked}
					disabled={disabled}
					tabbable={at === active}
					buttonRef={(node) => {
						buttons.current[at] = node;
					}}
					onKeyDown={(event) => onKeyDown(event, at)}
					onFocus={() => setActive(at)}
					onSeen={(inView) =>
						setSeen((was) =>
							inView
								? [...was.filter((each) => each !== id), id]
								: was.filter((each) => each !== id),
						)
					}
					onLoaded={() => setLoaded((was) => [...was, src])}
					onPick={() => pick(id, at)}
				/>
			))}
		</ScrollRow>
	);
};

export const LayoutOptions = ({ samples, live }) => {
	const page = useSitePage();
	const [list, setList] = useState(null);
	const [failed, setFailed] = useState(false);
	const [problem, setProblem] = useState(null);
	const draft = useDraftStore();
	const picked = useShownPick(draft, 'layout', list);
	const working = useRunStore((state) => state.working);
	const stuck = draft.clashes.length > 0;

	const load = () => {
		if (samples) return;
		setFailed(false);
		const { version } = draft;
		designOptions('layout').then(
			(got) =>
				got.options.length ? setList({ ...got, version }) : setFailed(true),
			() => setFailed(true),
		);
	};
	useEffect(load, [draft.version]);

	const ids = samples
		? samples.map((_, at) => (at ? `layout:sample-${at}` : ''))
		: list && ['', ...list.options.map(({ id }) => id)];

	const pick = async (href, id, preview) => {
		if (id === picked) return;
		setProblem(null);
		try {
			await pickLayout(href, id, { preview });
			noteChange({
				kind: 'layout',
				// translators: A finished step in the AI Agent's chat, after the user picked a new top section for their home page on its card.
				done: __('Changed your home page layout', 'extendify-local'),
			});
		} catch {
			setProblem(
				// translators: Shown under the AI Agent's row of home page layouts when the one the user picked couldn't be applied.
				__("Couldn't apply that layout. Please try again.", 'extendify-local'),
			);
		}
	};

	return (
		<div className="flex flex-col gap-3">
			{failed && (
				<p
					role="alert"
					className="m-0 flex items-center gap-2 text-agentx-body text-agentx-alert"
				>
					{
						// translators: Shown on the AI Agent's layout card when its home page layouts couldn't load.
						__("Couldn't load the layouts.", 'extendify-local')
					}
					<button
						type="button"
						onClick={load}
						className="agentx-focus rounded-agentx-control border-0 bg-transparent p-0 text-agentx-body text-agentx-card-ink underline"
					>
						{
							// translators: Loads the home page layouts on the AI Agent's layout card again after they failed to load.
							__('Try again', 'extendify-local')
						}
					</button>
				</p>
			)}
			{!failed && (
				<fieldset
					// translators: Screen reader name for the AI Agent's row of layouts to try for the top section of the site's home page.
					aria-label={__('Layouts', 'extendify-local')}
					aria-busy={!ids}
					className="m-0 min-w-0 border-0 p-0"
				>
					{ids ? (
						<Layouts
							// A Save makes another layout the site's own, so every thumbnail loads again.
							key={list?.current?.name ?? ''}
							ids={ids}
							home={list?.home}
							samples={samples}
							live={live}
							disabled={working || stuck || !page}
							picked={picked}
							onPick={pick}
						/>
					) : (
						<div className="flex gap-2 overflow-hidden">
							{Array.from({ length: 3 }, (_, index) => (
								<span key={index} className={`${ITEM} ${BOX} ${PULSE}`}>
									<Loading />
								</span>
							))}
						</div>
					)}
				</fieldset>
			)}
			{problem && (
				<p role="alert" className="m-0 text-agentx-body text-agentx-alert">
					{problem}
				</p>
			)}
		</div>
	);
};
