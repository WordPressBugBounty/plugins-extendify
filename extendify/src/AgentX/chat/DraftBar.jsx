import {
	BAR_TITLE,
	DANGER_BUTTON,
	MAIN_BUTTON,
	ResolveChanges,
	TEXT_BUTTON,
} from '@agentx/chat/ResolveChanges';
import { PRESS, ROW_CORNER, SAVE_BUTTON } from '@agentx/chat/styles';
import { discard, resolve, save } from '@agentx/lib/draft';
import { redoChange, undoChange, useDraftRun } from '@agentx/lib/draft-actions';
import { useKeyAnywhere } from '@agentx/lib/hooks';
import { useDraftStore } from '@agentx/state/draft';
import { useShellStore } from '@agentx/state/shell';
import { Tooltip } from '@agentx/Tooltip';
import {
	forwardRef,
	useLayoutEffect,
	useRef,
	useState,
} from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import {
	chevronUp,
	Icon,
	redo as redoIcon,
	trash,
	undo as undoIcon,
} from '@wordpress/icons';
import { motion, useIsPresent, useReducedMotion } from 'motion/react';

const SLIDE = { type: 'spring', stiffness: 500, damping: 40 };

// Messages scrolling under the floating bar would read through a translucent card.
const BAR = `${ROW_CORNER} border border-solid border-agentx-unsaved-bar-border bg-agentx-unsaved-bar text-agentx-unsaved-bar-ink shadow-(--agentx-notice-shadow) backdrop-blur-(--agentx-unsaved-bar-blur)`;

const PRESENCE_CARD = `${ROW_CORNER} border border-solid border-agentx-presence-card-border bg-agentx-presence-card shadow-(--agentx-notice-shadow) backdrop-blur-(--agentx-unsaved-bar-blur)`;

// The card under the unsaved changes bar, which the notices above the chat box draw too.
export const NOTICE_CARD = `${PRESENCE_CARD} m-0 flex w-full items-center gap-2.5 px-3.5 py-2 text-agentx-caption`;

export const presenceLine = (presence) =>
	presence.mine
		? // translators: Shown under the AI Agent's unsaved changes bar or the bar over the website when the user, not someone else, has the page they're looking at open in the WordPress editor in another browser tab.
			__('This page is open in another tab.', 'extendify-local')
		: sprintf(
				// translators: %s is the name of another user of this site who has this page open in the WordPress editor right now; viewing means has it open, not visiting the live site. Shown under the AI Agent's unsaved changes bar or the bar over the website; word it to fit any gender.
				__('%s is viewing this page.', 'extendify-local'),
				presence.name,
			);

const seenOf = (clashes) =>
	Object.fromEntries(clashes.map(({ source, live }) => [source, live]));

const keyOf = (clashes) =>
	clashes.map(({ source, live }) => `${source}@${live}`).join(',');

const ICON_BUTTON = `agentx-focus-inset flex size-8 shrink-0 items-center justify-center rounded-agentx-control border-0 bg-transparent p-0 text-agentx-unsaved-bar-ink ${PRESS} not-aria-disabled:hover:bg-agentx-unsaved-bar-hover aria-disabled:text-agentx-unsaved-bar-ink/[var(--agentx-disabled-opacity,40%)]`;

// Unsaved changes from any workflow, kept off the live site until Save.
export const DraftBar = forwardRef(
	(
		{
			clashes,
			failed: shownFailed,
			applied: shownApplied,
			confirm: shownConfirm,
			presence,
			open,
			onOpen,
			onDone,
		},
		opener,
	) => {
		const draft = useDraftStore();
		const present = useIsPresent();
		// A failed merge's list stays until the pages it was for change again.
		const [failedFor, setFailedFor] = useState(null);
		const failed =
			shownFailed ??
			(failedFor?.key === keyOf(clashes) ? failedFor.failed : null);
		const applied = shownApplied ?? draft.applied;
		const [confirming, setConfirming] = useState(false);
		const confirm = shownConfirm ?? confirming;
		const trashButton = useRef(null);
		const keepOnEscape = (event) => {
			if (event.key !== 'Escape') return;
			event.stopPropagation();
			setConfirming(false);
		};
		const reduceMotion = useReducedMotion();
		// The bar over the site shows the shared problem when it's on screen too.
		const canvasBar = useShellStore((state) => state.canvasBar);
		const { busy, blocked, problem, run } = useDraftRun({
			onResult: (result) => {
				if (result.failed?.length) {
					setFailedFor({
						key: keyOf(result.clashes ?? []),
						failed: result.failed,
					});
				}
			},
			onDone,
		});
		const region = useRef(null);
		// It steps aside for the gutter too, and focus inside would fall to the page.
		const done = useRef(onDone);
		done.current = onDone;
		useLayoutEffect(
			() => () => {
				if (region.current?.contains(document.activeElement)) {
					done.current?.();
				}
			},
			[],
		);
		const view = !clashes.length
			? applied
				? 'applied'
				: confirm
					? 'confirm'
					: 'changes'
			: failed?.length
				? 'failed'
				: 'stuck';
		const shownView = useRef(view);
		// Switching views removes the focused button, and focus would fall to the page.
		useLayoutEffect(() => {
			if (shownView.current === view) return;
			const was = shownView.current;
			shownView.current = view;
			if (document.activeElement && document.activeElement !== document.body) {
				return;
			}
			const target =
				was === 'confirm' && view === 'changes'
					? trashButton.current
					: region.current?.querySelector('button, [tabindex="-1"]');
			target?.focus({ preventScroll: true });
		}, [view]);
		const canRedo = draft.versions.some(({ undone }) => undone);

		// Saves like the block editor does, where the browser would save the page instead.
		useKeyAnywhere((event) => {
			if (event.key.toLowerCase() !== 's') return;
			if (!(event.metaKey || event.ctrlKey) || event.shiftKey || event.altKey) {
				return;
			}
			event.preventDefault();
			if (view === 'changes') run('save', save);
		});

		// Set with the answer, or the Changes row would show while the site switches.
		const merge = async () => {
			const result = await resolve('merge', seenOf(clashes));
			if (!result.failed?.length) useDraftStore.getState().setApplied(true);
			return result;
		};

		return (
			<motion.div
				ref={region}
				role="region"
				// translators: Screen reader name for the AI Agent's bar with undo, redo and save for changes not saved yet.
				aria-label={__('Unsaved changes', 'extendify-local')}
				// Leaving, it gives its room back at once, or the chat drops after the fade.
				data-agentx-pushes={present || undefined}
				initial={{ opacity: 0, y: 12 }}
				animate={{ opacity: 1, y: 0 }}
				// Short, since anything waiting for the gutter shows only once the bar is gone.
				exit={{
					opacity: 0,
					y: 12,
					transition: { duration: reduceMotion ? 0 : 0.15 },
				}}
				transition={reduceMotion ? { duration: 0 } : SLIDE}
				className="flex flex-col gap-2 text-agentx-notice-body text-agentx-unsaved-bar-ink"
			>
				<div className={`${BAR} flex flex-col gap-1 p-[7px]`}>
					{clashes.length ? (
						<ResolveChanges
							clashes={clashes}
							failed={failed}
							busy={blocked ? busy || 'working' : null}
							onResolve={() => run('merge', merge)}
							onOverwrite={() =>
								run('overwrite', () => resolve('overwrite', seenOf(clashes)))
							}
							onDelete={() =>
								run('delete', () => resolve('delete', seenOf(clashes)))
							}
							onClose={() => setFailedFor(null)}
						/>
					) : applied ? (
						<div className="flex flex-col gap-2 px-2 pt-1">
							<output className={BAR_TITLE}>
								{
									// translators: Shown on the AI Agent's unsaved changes bar after Resolve changes applied all of the user's unsaved changes again on top of a page changed elsewhere, until dismissed; they are still not saved.
									__('Changes applied successfully', 'extendify-local')
								}
							</output>
							<div className="flex items-center justify-end gap-1">
								<button
									type="button"
									onClick={() => useDraftStore.getState().setApplied(false)}
									className={MAIN_BUTTON}
								>
									{
										// translators: Closes the AI Agent's message that the user's unsaved changes were merged again after the page changed elsewhere.
										__('Got it', 'extendify-local')
									}
								</button>
							</div>
						</div>
					) : confirm ? (
						<div key="confirm" className="flex flex-col gap-2 px-2 pt-1">
							<p className={`m-0 ${BAR_TITLE}`}>
								{
									// translators: The AI Agent's question after the user pressed the trash button on its unsaved changes bar: throw away every change not saved yet, putting back the site as last saved.
									__('Discard all unsaved changes?', 'extendify-local')
								}
							</p>
							<div className="flex items-center justify-end gap-1">
								<button
									type="button"
									onKeyDown={keepOnEscape}
									onClick={() => setConfirming(false)}
									className={TEXT_BUTTON}
								>
									{
										// translators: Closes the AI Agent's question about discarding unsaved changes, keeping them.
										__('Cancel', 'extendify-local')
									}
								</button>
								<button
									type="button"
									aria-disabled={blocked}
									onKeyDown={keepOnEscape}
									onClick={() =>
										run('discard', discard).then(() => setConfirming(false))
									}
									className={DANGER_BUTTON}
								>
									{busy === 'discard'
										? // translators: Shown on the AI Agent's button that discards every unsaved change while it does so.
											__('Discarding…', 'extendify-local')
										: // translators: Button that throws away every change the AI Agent made that isn't saved yet, once the user confirms it on the unsaved changes bar.
											__('Discard', 'extendify-local')}
								</button>
							</div>
						</div>
					) : (
						<div key="changes" className="flex items-center gap-1">
							<button
								ref={opener}
								type="button"
								aria-haspopup="dialog"
								aria-expanded={open}
								onClick={onOpen}
								className={`agentx-focus me-auto flex min-w-0 items-center gap-1 rounded-agentx-control border-0 bg-transparent px-2 py-1.5 font-agentx-button text-agentx-unsaved-bar-ink ${PRESS} hover:bg-agentx-unsaved-bar-hover`}
							>
								<span className="truncate">
									{
										// translators: Opens the AI Agent's list of changes not saved yet; keep it short, the bar is narrow.
										__('Changes', 'extendify-local')
									}
								</span>
								<Icon
									icon={chevronUp}
									size={20}
									className="shrink-0 fill-current"
								/>
							</button>
							<Tooltip text={__('Discard changes', 'extendify-local')}>
								<button
									ref={trashButton}
									type="button"
									aria-disabled={blocked}
									onClick={() => !blocked && setConfirming(true)}
									// translators: Opens a confirmation for throwing away every change the AI Agent made that isn't saved yet.
									aria-label={__('Discard changes', 'extendify-local')}
									className={ICON_BUTTON}
								>
									<Icon icon={trash} size={24} className="fill-current" />
								</button>
							</Tooltip>
							<Tooltip text={__('Undo', 'extendify-local')}>
								<button
									type="button"
									aria-disabled={blocked || !draft.current}
									onClick={() => draft.current && run('undo', undoChange)}
									// translators: Undoes the last change the AI Agent made that is not saved yet.
									aria-label={__('Undo', 'extendify-local')}
									className={ICON_BUTTON}
								>
									<Icon icon={undoIcon} size={24} className="fill-current" />
								</button>
							</Tooltip>
							<Tooltip text={__('Redo', 'extendify-local')}>
								<button
									type="button"
									aria-disabled={blocked || !canRedo}
									onClick={() => canRedo && run('redo', redoChange)}
									// translators: Puts back the last change undone in the AI Agent.
									aria-label={__('Redo', 'extendify-local')}
									className={ICON_BUTTON}
								>
									<Icon icon={redoIcon} size={24} className="fill-current" />
								</button>
							</Tooltip>
							<button
								type="button"
								aria-disabled={blocked}
								onClick={() => run('save', save)}
								className={SAVE_BUTTON}
							>
								{busy === 'save'
									? // translators: Shown on the AI Agent's Save button while the changes save.
										__('Saving…', 'extendify-local')
									: // translators: Puts the changes the AI Agent made live on the site.
										__('Save', 'extendify-local')}
							</button>
						</div>
					)}
					{problem && !canvasBar && (
						<p role="alert" className="m-0 px-2 pb-1 text-agentx-alert">
							{problem}
						</p>
					)}
				</div>
				{presence && <PresenceNotice presence={presence} />}
			</motion.div>
		);
	},
);

export const PresenceNotice = ({ presence }) => {
	const reduceMotion = useReducedMotion();
	return (
		<p className={`${NOTICE_CARD} text-agentx-presence-card-ink`}>
			<span
				aria-hidden="true"
				className="relative flex size-2 shrink-0 items-center justify-center"
			>
				{!reduceMotion && (
					<motion.span
						className="absolute inset-0 rounded-full border border-solid border-agentx-presence"
						initial={{ scale: 1, opacity: 0 }}
						// Faded out at both ends, so the loop's restart doesn't flash.
						animate={{ scale: [1, 1.4, 2.6], opacity: [0, 0.9, 0] }}
						transition={{
							duration: 1.6,
							times: [0, 0.15, 1],
							ease: 'easeOut',
							repeat: Number.POSITIVE_INFINITY,
							repeatDelay: 0.6,
						}}
					/>
				)}
				<span className="size-2 rounded-full bg-agentx-presence" />
			</span>
			<span>{presenceLine(presence)}</span>
		</p>
	);
};
