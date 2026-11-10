import { Sheet } from '@agentx/chat/Sheet';
import { HISTORY_ACTION } from '@agentx/chat/styles';
import {
	ago,
	changeLabel,
	decksOf,
	historyOf,
	opLabel,
	opOnPage,
	pagesOf,
	styledLabel,
} from '@agentx/lib/changes';
import { discard, draftUrl, restore } from '@agentx/lib/draft';
import { askLive } from '@agentx/lib/draft-actions';
import { pageUrl } from '@agentx/lib/follow-site';
import { showCurrent, showDraft } from '@agentx/lib/show-draft';
import { coverWhile, switchSite } from '@agentx/lib/switch-site';
import { useDraftStore } from '@agentx/state/draft';
import { useRunStore } from '@agentx/state/run';
import { useEffect, useRef, useState } from '@wordpress/element';
import { __, _n, sprintf } from '@wordpress/i18n';
import {
	backup,
	blockDefault,
	brush,
	chevronDown,
	cog,
	color,
	Icon,
	layout,
	pencil,
	published,
	shadow,
	styles,
	trash,
	typography,
} from '@wordpress/icons';

const AT = 'extendify-draft-at';
// A card's edits take at most this many lines, Show more included.
const OP_LINES = 2;
const { variations = [] } = window.extAgentXData ?? {};

const siteFrame = () => document.getElementById('extendify-agentx-site');
const shownPage = () => pageUrl(siteFrame().contentWindow.location.href);

// The site as it stood right after a version, rendered without changing anything.
const atUrl = (version, id) => {
	const url = new URL(draftUrl(shownPage(), version));
	url.searchParams.set(AT, id);
	return url.href;
};

const Tag = ({ children, outline }) => (
	<span
		className={`rounded-full px-1.5 py-px text-agentx-caption font-medium whitespace-nowrap ${
			outline
				? 'bg-transparent text-agentx-history-viewing ring-1 ring-agentx-history-viewing ring-inset'
				: 'bg-agentx-history-current text-agentx-history-current-ink'
		}`}
	>
		{children}
	</span>
);

const ICONS = {
	colors: color,
	fonts: typography,
	vibe: brush,
	animation: shadow,
	layout,
	variation: styles,
	restore: backup,
};

const OP_ICONS = { attributes: cog, remove: trash };
// A request's palette color or theme setting joins its block edits in one change.
const EDITS = ['block', 'palette', 'settings'];

const Ops = ({ version, expanded, onToggle }) => {
	if (!EDITS.includes(version.kind)) return null;
	const onePage = pagesOf(version).length === 1;
	const lines = [
		...version.changed.map((item, at) => ({
			key: `${item.block}:${at}`,
			icon: OP_ICONS[item.op] ?? pencil,
			text: onePage ? opLabel(item) : opOnPage(item),
		})),
		...(version.styled ?? []).map((item, at) => ({
			key: `styled:${at}`,
			icon: item.layer === 'settings' ? cog : color,
			text: styledLabel(item),
		})),
	];
	if (!lines.length) return null;
	const folds = lines.length > OP_LINES;
	const hidden = lines.length - (OP_LINES - 1);
	return (
		<div className="ms-1 flex flex-col gap-1 border-0 border-s-2 border-solid border-agentx-history-row-border ps-3">
			<ul className="m-0 flex list-none flex-col gap-0.5 p-0 text-[0.8125rem] leading-[1.125rem] text-agentx-history-row-ink">
				{(folds && !expanded ? lines.slice(0, OP_LINES - 1) : lines).map(
					(line) => (
						<li key={line.key} className="flex items-start gap-1.5">
							<Icon
								icon={line.icon}
								size={16}
								className="mt-px shrink-0 fill-agentx-sheet-muted"
							/>
							<span className="min-w-0 break-words">{line.text}</span>
						</li>
					),
				)}
			</ul>
			{folds && (
				<button
					type="button"
					aria-expanded={expanded}
					onClick={onToggle}
					className={`${HISTORY_ACTION} ms-[1.375rem] self-start`}
				>
					{expanded
						? // translators: Folds a group of edits in the AI Agent's list of unsaved changes back to its first few.
							__('Show fewer', 'extendify-local')
						: sprintf(
								// translators: %d is how many more edits a group in the AI Agent's list of unsaved changes holds, shown when pressed.
								_n('Show %d more', 'Show %d more', hidden, 'extendify-local'),
								hidden,
							)}
				</button>
			)}
		</div>
	);
};

const EDGE =
	'absolute inset-y-0 rounded-agentx-control border border-solid border-agentx-history-row-border bg-agentx-history-row transition-[inset-inline-end,color] duration-150 ease-out motion-reduce:transition-none';

// The card under a closed deck's top one, extended on hover to reveal the down arrow.
const Edges = ({ more, onOpen }) => (
	<button
		type="button"
		aria-expanded="false"
		aria-label={sprintf(
			// translators: %d is how many earlier changes to one thing, like other colors put on a button in a row, sit under the newest in the AI Agent's list of unsaved changes. Screen reader name for the down arrow that opens them.
			_n('Expand %d more', 'Expand %d more', more, 'extendify-local'),
			more,
		)}
		onClick={onOpen}
		className={`${EDGE} agentx-focus -z-10 start-2 -end-2 flex translate-y-2 cursor-pointer items-center justify-end p-0 text-agentx-sheet-muted group-focus-within/deck:-end-4 group-hover/deck:-end-4 hover:text-agentx-history-row-ink`}
	>
		<Icon
			icon={chevronDown}
			size={16}
			className="fill-current opacity-0 transition-opacity duration-150 ease-out group-focus-within/deck:opacity-100 group-hover/deck:opacity-100 motion-reduce:transition-none"
		/>
	</button>
);

const Row = ({
	icon,
	label,
	ops,
	meta,
	tags,
	current,
	viewing,
	actions,
	deck,
	nested,
}) => (
	<li
		className={`group relative flex items-start gap-3 rounded-agentx-control border border-solid bg-agentx-history-row p-3 ${
			viewing && !current
				? 'border-agentx-history-viewing ring-4 ring-agentx-history-viewing/15'
				: 'border-agentx-history-row-border'
		} ${deck && !deck.open ? 'group/deck me-2 mb-2' : ''} ${nested ? 'ms-4' : ''}`}
	>
		{deck && !deck.open && <Edges more={deck.tried} onOpen={deck.onToggle} />}
		<span className="-mt-1 flex size-7 shrink-0 items-center justify-center rounded-full bg-agentx-history-icon text-agentx-history-row-ink">
			<Icon icon={icon} size={20} className="fill-current" />
		</span>
		<span className="flex min-w-0 flex-1 flex-col gap-1.5">
			<span
				title={label}
				className="line-clamp-2 text-agentx-body font-medium break-words text-agentx-history-row-ink"
			>
				{label}
			</span>
			{ops}
			<span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-agentx-caption text-agentx-sheet-muted [@media(hover:hover)]:relative">
				<span>{meta}</span>
				{tags}
				{actions && (
					// Floating keeps the hidden buttons from holding a blank line; touch can't hover, so it shows them.
					// A row in preview keeps them in line, or End preview would cover its Viewing tag.
					<span
						className={`flex items-center gap-1.5 whitespace-nowrap ${
							viewing
								? ''
								: 'transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 [@media(hover:hover)]:absolute [@media(hover:hover)]:-inset-y-1 [@media(hover:hover)]:end-0 [@media(hover:hover)]:ps-6 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:ltr:bg-[image:linear-gradient(to_left,var(--color-agentx-history-row)_calc(100%-1.5rem),transparent)] [@media(hover:hover)]:rtl:bg-[image:linear-gradient(to_right,var(--color-agentx-history-row)_calc(100%-1.5rem),transparent)]'
						}`}
					>
						{actions}
					</span>
				)}
			</span>
		</span>
	</li>
);

// Every change since the last save, newest first, to look at again or go back to.
export const ChangesSheet = ({ changes, onClose }) => {
	const sheet = useRef(null);
	const live = useDraftStore();
	const working = useRunStore((state) => state.working);
	const stuck = live.clashes.length > 0;
	const draft = changes ?? live;
	const [previewing, setPreviewing] = useState(null);
	const [expanded, setExpanded] = useState([]);
	const [opened, setOpened] = useState([]);
	// A demo state names its open decks, since the sheet stays mounted between states.
	const open = changes?.opened ?? opened;
	const [busy, setBusy] = useState(false);
	const [problem, setProblem] = useState(null);
	const { rows, savedId, refused, shown } = historyOf(draft);
	const savedIsCurrent = shown === savedId && !refused;

	useEffect(() => {
		// A demo state leaves focus on the dev tool, where the arrow keys step through the states.
		if (changes) return;
		sheet.current?.focus({ preventScroll: true });
	}, []);

	// A preview lasts only while the sheet is open.
	const close = async () => {
		if (busy) return;
		onClose();
		if (previewing === null || changes) return;
		await showCurrent();
	};

	const preview = (versionId) => {
		if (busy || working || changes) return;
		const again = previewing === versionId;
		setPreviewing(again ? null : versionId);
		if (again) showCurrent();
		else switchSite(siteFrame(), atUrl(live.version, versionId));
	};

	const restoreTo = async (versionId) => {
		if (busy || stuck || working || changes) return;
		setBusy(true);
		setProblem(null);
		try {
			await coverWhile(() =>
				showDraft(
					() => (versionId === savedId ? discard() : restore(versionId)),
					{ pressed: true },
				),
			);
			onClose();
			// A restore that left the draft as it was switches nothing, so the preview would stay.
			if (previewing !== null) await showCurrent();
		} catch (error) {
			if (error?.code === 'live_changed') {
				onClose();
				askLive(
					'restore',
					(live) => restore(versionId, live),
					error.data?.live ?? [],
				);
				return;
			}
			setProblem(
				// translators: Shown in the AI Agent's list of unsaved changes when going back to one of them failed.
				__("Couldn't go back to that. Please try again.", 'extendify-local'),
			);
			setBusy(false);
		}
	};

	const toggleDeck = (versionId) =>
		setOpened((open) =>
			open.includes(versionId)
				? open.filter((each) => each !== versionId)
				: [...open, versionId],
		);

	const toggle = (versionId) =>
		setExpanded((open) =>
			open.includes(versionId)
				? open.filter((each) => each !== versionId)
				: [...open, versionId],
		);

	const actions = (versionId, current) =>
		current ? null : (
			<>
				<button
					type="button"
					aria-disabled={busy || working}
					onClick={() => preview(versionId)}
					// Same-property utilities sort by name, so a plain one would lose to the action's ink.
					className={`${HISTORY_ACTION} ${previewing === versionId ? 'not-aria-disabled:text-agentx-history-viewing' : ''}`}
				>
					{previewing === versionId
						? // translators: Stops showing one of the changes in the AI Agent's list of unsaved changes, and shows the site as it is now.
							__('End preview', 'extendify-local')
						: // translators: Shows the site as it was at one of the changes in the AI Agent's list of unsaved changes, until the list closes.
							__('Preview', 'extendify-local')}
				</button>
				<span aria-hidden="true">·</span>
				<button
					type="button"
					aria-disabled={busy || stuck || working}
					onClick={() => restoreTo(versionId)}
					className={HISTORY_ACTION}
				>
					{
						// translators: Goes back to one of the changes in the AI Agent's list of unsaved changes, as a new change.
						__('Restore', 'extendify-local')
					}
				</button>
			</>
		);

	const tagsOf = ({ current, undone, live, versionId }) => (
		<>
			{live && (
				<Tag outline>
					{
						// translators: Marks a change in the AI Agent's history that saved on the site at once, like a new logo, so there is nothing to discard.
						__('Saved', 'extendify-local')
					}
				</Tag>
			)}
			{versionId === savedId && savedId !== 0 && (
				<Tag outline>
					{
						// translators: Marks the change visitors see now, the last one saved, in the AI Agent's history of changes.
						__('Live', 'extendify-local')
					}
				</Tag>
			)}
			{current && (
				<Tag>
					{
						// translators: Marks the change the site shows now in the AI Agent's list of unsaved changes.
						__('Current', 'extendify-local')
					}
				</Tag>
			)}
			{undone && (
				<Tag outline>
					{
						// translators: Marks a saved change that was undone, which the next Save takes off the live site, in the AI Agent's list of unsaved changes.
						__('Undone', 'extendify-local')
					}
				</Tag>
			)}
			{previewing === versionId && (
				<Tag outline>
					{
						// translators: Marks the change the site is showing as a preview in the AI Agent's list of unsaved changes.
						__('Viewing', 'extendify-local')
					}
				</Tag>
			)}
		</>
	);

	return (
		<Sheet
			sheet={sheet}
			title={
				// translators: Heading of the AI Agent's history of changes, saved or not.
				__('History', 'extendify-local')
			}
			closeLabel={
				// translators: Closes the AI Agent's list of unsaved changes, and ends any preview from it.
				__('Close', 'extendify-local')
			}
			onClose={close}
		>
			<ol className="isolate m-0 flex min-h-0 list-none flex-col gap-2 overflow-y-auto px-4 pt-1 pb-4">
				{decksOf(rows).flatMap(([top, ...tried]) => {
					// A deck holding the change the site shows opens, so its Current tag shows.
					const deckOpen =
						open.includes(top.id) || tried.some(({ id }) => id === shown);
					const rowOf = (version, more) => {
						const current = version.id === shown;
						return (
							<Row
								key={version.id}
								icon={ICONS[version.kind] ?? blockDefault}
								label={changeLabel(version, draft.versions, variations)}
								ops={
									<Ops
										version={version}
										expanded={expanded.includes(version.id)}
										onToggle={() => toggle(version.id)}
									/>
								}
								meta={ago(version.at)}
								current={current}
								viewing={previewing === version.id}
								tags={tagsOf({
									current,
									undone: version.undone,
									live: version.kind === 'live',
									versionId: version.id,
								})}
								actions={actions(version.id, current)}
								{...more}
							/>
						);
					};
					return [
						rowOf(
							top,
							tried.length && {
								deck: {
									tried: tried.length,
									open: deckOpen,
									onToggle: () => toggleDeck(top.id),
								},
							},
						),
						...(deckOpen
							? tried.map((version) => rowOf(version, { nested: true }))
							: []),
					];
				})}
				{/* Before anything was saved, the site visitors see is the one before the first change. */}
				{savedId === 0 && (
					<Row
						icon={published}
						current={savedIsCurrent}
						viewing={previewing === savedId}
						label={
							// translators: The bottom of the AI Agent's list of unsaved changes: the site as it was last saved, live for visitors.
							__('Last saved', 'extendify-local')
						}
						meta={
							// translators: Explains the Last saved row in the AI Agent's list of unsaved changes.
							__('What visitors see now', 'extendify-local')
						}
						tags={tagsOf({ current: savedIsCurrent, versionId: savedId })}
						actions={actions(savedId, savedIsCurrent)}
					/>
				)}
			</ol>
			{problem && (
				<p
					role="alert"
					className="m-0 px-4 pb-3 text-agentx-body text-agentx-alert"
				>
					{problem}
				</p>
			)}
		</Sheet>
	);
};
