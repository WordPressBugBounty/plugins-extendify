import { CLOSE, PRESS, SAVE_BUTTON } from '@agentx/chat/styles';
import { opLabel, opOnPage } from '@agentx/lib/changes';
import { Tooltip } from '@agentx/Tooltip';
import { __, _n, sprintf } from '@wordpress/i18n';
import { closeSmall, Icon } from '@wordpress/icons';

export const TEXT_BUTTON = `agentx-focus-inset shrink-0 rounded-agentx-control border-0 bg-transparent px-3 py-1.5 font-agentx-button ${PRESS} not-aria-disabled:hover:bg-agentx-hover aria-disabled:text-current/[var(--agentx-disabled-opacity,60%)]`;

export const MAIN_BUTTON = SAVE_BUTTON;

export const DANGER_BUTTON = `agentx-focus shrink-0 rounded-agentx-control border-0 bg-agentx-danger px-3 py-1.5 font-agentx-button text-agentx-danger-ink ${PRESS} not-aria-disabled:hover:brightness-(--agentx-hover-brightness) aria-disabled:bg-agentx-danger/[var(--agentx-disabled-opacity,60%)]`;

// NOTICE_TITLE_500's weight alone, since the bar's lines take the bar's ink.
export const BAR_TITLE =
	'[font-weight:var(--font-weight-agentx-notice-title,var(--font-weight-agentx-title,500))]';

const REASONS = {
	changed: () =>
		// translators: Reason shown under the name of one of the user's unsaved edits that the AI Agent couldn't apply again: the block that edit changed was itself changed or removed elsewhere, so the agent can't find it.
		__(
			"Couldn't find the block as it was before this edit.",
			'extendify-local',
		),
	unsure: () =>
		// translators: Reason shown under the name of one of the user's unsaved edits that the AI Agent couldn't apply again: after the page changed elsewhere, several blocks match the one that edit changed, so the agent can't tell which.
		__(
			'More than one block now looks like the one this edit changed.',
			'extendify-local',
		),
	built: () =>
		// translators: Reason shown under the name of one of the user's unsaved edits that the AI Agent couldn't apply again: It means that named edit, and builds on means it was made on top of an earlier edit that also failed.
		__("It builds on an edit that couldn't be applied.", 'extendify-local'),
	old: () =>
		// translators: Reason shown under the name of one of the user's unsaved edits that the AI Agent couldn't apply again: the agent no longer keeps the details it needs to redo that edit.
		__('This edit is too old to apply again.', 'extendify-local'),
};

const onPage = (source) => {
	try {
		const page = document.getElementById(
			'extendify-agentx-site',
		)?.contentDocument;
		return Boolean(
			page?.querySelector(`[data-extendify-block^="${CSS.escape(source)}:"]`),
		);
	} catch {
		return false;
	}
};

const headline = (clashes) => {
	if (clashes.some((clash) => clash.here ?? onPage(clash.source))) {
		// translators: Shown on the AI Agent's unsaved changes bar, above its Resolve changes button, when the page the user is looking at was changed outside the agent. I is the AI Agent, not the user; use a form that doesn't mark the speaker's gender. Merge means combine the user's unsaved changes with the newer page.
		return __(
			'Content on this page was updated elsewhere. I can attempt to merge changes.',
			'extendify-local',
		);
	}
	if (clashes.length === 1) {
		return sprintf(
			// translators: %s is a page or template's title, like Home, not the page the user is looking at. Shown on the AI Agent's unsaved changes bar, above its Resolve changes button, when that page was changed outside the agent. I is the AI Agent, not the user; use a form that doesn't mark the speaker's gender. Merge means combine the user's unsaved changes with the newer page.
			__(
				'Content on “%s” was updated elsewhere. I can attempt to merge changes.',
				'extendify-local',
			),
			clashes[0].title,
		);
	}
	return sprintf(
		// translators: %d is how many pages or templates were changed outside the AI Agent, always 2 or more, so keep %d in every form. Shown on the agent's unsaved changes bar, above its Resolve changes button. I is the AI Agent, not the user; use a form that doesn't mark the speaker's gender. Merge means combine the user's unsaved changes with the newer pages.
		_n(
			'Content on %d page was updated elsewhere. I can attempt to merge changes.',
			'Content on %d pages was updated elsewhere. I can attempt to merge changes.',
			clashes.length,
			'extendify-local',
		),
		clashes.length,
	);
};

const firstLine = (failed) => {
	const [failure] = failed;
	const reason = (REASONS[failure.reason] ?? REASONS.changed)();
	const [item] = failure.changed;
	if (!item) {
		return {
			text: sprintf(
				// translators: %s is the title of the page or template the edit is on, like Home, not what it changed to. Names an earlier unsaved edit the AI Agent couldn't apply again and no longer has the details of; a label, not a sentence.
				__('An older edit on “%s”', 'extendify-local'),
				failure.title,
			),
			reason,
		};
	}
	const manyPages =
		new Set(
			failed.flatMap(({ changed, title }) =>
				changed.length ? changed.map((each) => each.title) : [title],
			),
		).size > 1;
	return {
		text: manyPages ? opOnPage(item) : opLabel(item),
		reason,
	};
};

export const ResolveChanges = ({
	clashes,
	failed,
	busy,
	onResolve,
	onOverwrite,
	onDelete,
	onClose,
}) => {
	if (!failed?.length) {
		return (
			<div className="flex flex-col gap-2 px-2 pt-1">
				<p className="m-0">{headline(clashes)}</p>
				<div className="flex items-center justify-end gap-1">
					<button
						type="button"
						aria-disabled={Boolean(busy)}
						onClick={onResolve}
						className={MAIN_BUTTON}
					>
						{busy === 'merge'
							? // translators: Shown on the AI Agent's Resolve button while it applies the user's unsaved changes again on top of a page changed elsewhere; use the same verb as that button, meaning settle the clash, not dissolve.
								__('Resolving…', 'extendify-local')
							: // translators: Button on the AI Agent's unsaved changes bar after the page was changed elsewhere: applies the user's unsaved changes again on top of the newer page, keeping both. Resolve means settle the clash, not cancel or dissolve. Keep it to one short word.
								__('Resolve', 'extendify-local')}
					</button>
				</div>
			</div>
		);
	}

	const line = firstLine(failed);
	return (
		<div className="relative flex flex-col gap-2 px-2 pt-1">
			<p role="alert" className={`m-0 pe-8 ${BAR_TITLE}`}>
				{
					// translators: I is the AI Agent, not the user; use a form that doesn't mark the speaker's gender. Shown on its unsaved changes bar when some of the user's unsaved changes couldn't be applied again to a page changed elsewhere; the first one is named below.
					__('I was unable to merge in the changes.', 'extendify-local')
				}
			</p>
			<p className="m-0 flex items-start gap-1.5 text-[0.8125rem] leading-[1.125rem]">
				<Icon
					icon={closeSmall}
					size={16}
					className="mt-px shrink-0 fill-agentx-alert"
				/>
				<span className="flex min-w-0 flex-col">
					<span className="break-words">{line.text}</span>
					<span className="text-agentx-caption text-agentx-notice-muted">
						{line.reason}
					</span>
				</span>
			</p>
			<div className="flex items-center justify-end gap-1">
				<button
					type="button"
					aria-disabled={Boolean(busy)}
					onClick={onDelete}
					className={TEXT_BUTTON}
				>
					{
						// translators: Button on the AI Agent's unsaved changes bar, beside Overwrite: deletes the user's own unsaved edits that couldn't be applied and keeps their other changes. Mine means my edits, said by the user, not the agent; Delete is a verb; keep it short.
						__('Delete mine', 'extendify-local')
					}
				</button>
				<button
					type="button"
					aria-disabled={Boolean(busy)}
					onClick={onOverwrite}
					className={MAIN_BUTTON}
				>
					{
						// translators: Button on the AI Agent's unsaved changes bar, beside Delete mine, a verb: keeps the user's unsaved changes so the next Save writes them over the change made elsewhere. Keep it short.
						__('Overwrite', 'extendify-local')
					}
				</button>
			</div>
			<Tooltip
				text={__('Close', 'extendify-local')}
				className="absolute -end-[3px] -top-0.5"
			>
				<button
					type="button"
					aria-disabled={Boolean(busy)}
					onClick={() => !busy && onClose?.()}
					aria-label={
						// translators: Closes the AI Agent's list of unsaved edits it couldn't merge, going back to its offer to resolve the changes.
						__('Close', 'extendify-local')
					}
					className={CLOSE}
				>
					<Icon icon={closeSmall} size={24} className="fill-current" />
				</button>
			</Tooltip>
		</div>
	);
};
