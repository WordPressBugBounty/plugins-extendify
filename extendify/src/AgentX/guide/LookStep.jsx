import {
	BOX,
	Loading,
	PULSE,
	Thumb,
	useOptionRow,
} from '@agentx/chat/LayoutOptions';
import {
	designOptions,
	lookLayers,
	pickLook,
	usePreviewVersion,
} from '@agentx/lib/design';
import { draftUrl, picksOf } from '@agentx/lib/draft';
import { useSitePage } from '@agentx/lib/hooks';
import { useDraftStore } from '@agentx/state/draft';
import { useRunStore } from '@agentx/state/run';
import { useEffect, useState } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';

const ORIGINAL = lookLayers({ layout: '', variation: '', vibe: '' });

const nameOf = (at) =>
	at
		? sprintf(
				// translators: %d is a look's place in the AI Agent's Site Guide row of whole site looks to try, each a design, colors and fonts, counting the site's own as 1. Read out by screen readers for its thumbnail.
				__('Look %d', 'extendify-local'),
				at + 1,
			)
		: // translators: Read out by screen readers for the thumbnail of the site's own look, first in the AI Agent's Site Guide row of looks.
			__('Your current look', 'extendify-local');

// Two across, with the second row half showing so it's plain the grid scrolls.
const COLUMNS = 2;
const Grid = ({ children }) => (
	<div className="@container">
		<div
			data-agentx-tiles
			className="-m-1 grid max-h-[min(calc((100cqw-0.5rem)*0.5625+0.75rem),var(--agentx-tiles-fit,999rem))] grid-cols-2 gap-2 overflow-y-auto overscroll-y-contain p-1"
		>
			{children}
		</div>
	</div>
);

const Looks = ({ looks, home, disabled, onPick }) => {
	const draft = useDraftStore();
	const shows = ({ layers }) =>
		Object.entries(layers).every(([layer, pick]) => draft[layer] === pick);
	const pressedAt = looks.findIndex(shows);
	const { buttons, active, setActive, onKeyDown } = useOptionRow(
		looks.length,
		Math.max(pressedAt, 0),
		{ columns: COLUMNS },
	);
	const preview = usePreviewVersion();
	const [seen, setSeen] = useState([]);
	const [drawn, setDrawn] = useState([]);
	const [loaded, setLoaded] = useState([]);

	const rows = looks.map((look) => ({
		...look,
		src: draftUrl(home, preview.first, { ...picksOf(draft), ...look.layers }),
	}));
	// Everything in view renders together, so a row fills in at once rather than tile by tile;
	// a render that scrolled away stays, so coming back never loads it again.
	const shown = ({ id, src }) => seen.includes(id) || drawn.includes(src);

	const pick = async (look) => {
		const href = draftUrl(home, preview.now(), {
			...picksOf(useDraftStore.getState()),
			...look.layers,
		});
		await onPick(look, href, preview);
	};

	return (
		<Grid>
			{rows.map((look, at) => (
				<Thumb
					key={look.id}
					src={shown(look) ? look.src : undefined}
					// Dropping the attribute would leave the old page loaded.
					blank="about:blank"
					drawn={drawn.includes(look.src)}
					ready={loaded.includes(look.src)}
					label={nameOf(at)}
					pressed={at === pressedAt}
					disabled={disabled}
					tabbable={at === active}
					buttonRef={(node) => {
						buttons.current[at] = node;
					}}
					onKeyDown={(event) => onKeyDown(event, at)}
					onFocus={() => setActive(at)}
					onSeen={(inView) => {
						setSeen((was) =>
							inView
								? [...was.filter((each) => each !== look.id), look.id]
								: was.filter((each) => each !== look.id),
						);
					}}
					// One render per look; a draft change gives every look a new address.
					onDrawn={() =>
						setDrawn((was) => [...was, look.src].slice(-rows.length))
					}
					onLoaded={() =>
						setLoaded((was) => [...was, look.src].slice(-rows.length))
					}
					onPick={() => pick(look)}
				/>
			))}
		</Grid>
	);
};

export const LookStep = () => {
	const page = useSitePage();
	const draft = useDraftStore();
	const working = useRunStore((state) => state.working);
	const [list, setList] = useState(null);
	const [failed, setFailed] = useState(false);
	const [problem, setProblem] = useState(false);

	const load = () => {
		setFailed(false);
		designOptions('look').then(
			(got) => (got.options.length ? setList(got) : setFailed(true)),
			() => setFailed(true),
		);
	};
	useEffect(load, []);

	const looks = list && [
		{ id: '', layers: ORIGINAL },
		...list.options.map(({ id, picks }) => ({ id, layers: lookLayers(picks) })),
	];

	const pick = async (look, href, preview) => {
		setProblem(false);
		try {
			await pickLook(href, look.layers, { preview });
		} catch {
			setProblem(true);
		}
	};

	return (
		<div className="flex flex-col gap-3">
			{failed && (
				<p
					role="alert"
					className="m-0 flex items-center gap-2 text-sm text-agentx-alert"
				>
					{
						// translators: Shown in the AI Agent's Site Guide when its whole site looks couldn't load.
						__("Couldn't load the looks.", 'extendify-local')
					}
					<button
						type="button"
						onClick={load}
						className="agentx-focus rounded-agentx-control border-0 bg-transparent p-0 text-sm text-agentx-ink underline"
					>
						{
							// translators: Loads the whole site looks in the AI Agent's Site Guide again after they failed to load.
							__('Try again', 'extendify-local')
						}
					</button>
				</p>
			)}
			{!failed && (
				<fieldset
					// translators: Screen reader name for the AI Agent's Site Guide row of whole site looks to try, each a design, colors and fonts.
					aria-label={__('Looks', 'extendify-local')}
					aria-busy={!looks}
					className="m-0 min-w-0 border-0 p-0"
				>
					{looks ? (
						<Looks
							looks={looks}
							home={list.home}
							disabled={working || !page || draft.clashes.length > 0}
							onPick={pick}
						/>
					) : (
						<Grid>
							{Array.from({ length: COLUMNS * 2 }, (_, index) => (
								<span key={index} className={`${BOX} ${PULSE}`}>
									<Loading />
								</span>
							))}
						</Grid>
					)}
				</fieldset>
			)}
			{problem && (
				<p role="alert" className="m-0 text-sm text-agentx-alert">
					{
						// translators: Shown in the AI Agent's Site Guide when the whole site look the user picked couldn't be applied.
						__("Couldn't apply that look. Please try again.", 'extendify-local')
					}
				</p>
			)}
		</div>
	);
};
