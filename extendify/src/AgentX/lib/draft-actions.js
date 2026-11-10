import { redo, restoreTo, save, undo } from '@agentx/lib/draft';
import { useHeldPicks } from '@agentx/lib/held-picks';
import { showDraft } from '@agentx/lib/show-draft';
import { coverWhile } from '@agentx/lib/switch-site';
import { track } from '@agentx/lib/track';
import { useDraftStore } from '@agentx/state/draft';
import { closeGutter, useGutterStore } from '@agentx/state/gutter';
import { dropPlaceholders } from '@agentx/state/nudges';
import { usePlanStore } from '@agentx/state/plan';
import { useRunStore } from '@agentx/state/run';
import { useShellStore } from '@agentx/state/shell';
import { useEffect, useRef } from '@wordpress/element';
import { __, _n, sprintf } from '@wordpress/i18n';
import { create } from 'zustand';

// Saved in the same run, or the site loads once for the change and again for autosave's save.
const savedWithAutosave = async (result) => {
	if (!useShellStore.getState().autosave || !result?.unsaved) return result;
	try {
		return await save();
	} catch (error) {
		// Left unsaved for autosave to retry; a clash answers with the newest draft to show.
		return error.data?.draft ?? result;
	}
};

export const undoChange = async (live) => {
	dropPlaceholders();
	return savedWithAutosave(await undo(live));
};

export const redoChange = async (live) => savedWithAutosave(await redo(live));

// Restore, not discard: a discard stops at the last Save and keeps what autosave saved.
export const undoTo = (version, live) =>
	showDraft(() => restoreTo(version ?? 0, live), { pressed: true });

// One at a time across both bars and autosave, so whichever bar shows says what's running.
export const useDraftRunStore = create(() => ({
	busy: null,
	problem: null,
	// The tenth, twentieth and so on change set asked about since the save it counts from.
	asked: { savedId: 0, at: 0 },
}));

const setBusy = (busy) => useDraftRunStore.setState({ busy });

// Read live: the chat's closing line can start after a render read the run as over.
const free = () =>
	!useDraftRunStore.getState().busy && !useRunStore.getState().working;
// Tied to the draft it happened on, so the next change clears it.
const setProblem = (text) =>
	useDraftRunStore.setState({
		problem: text && { text, version: useDraftStore.getState().version },
	});

// The refusal brought a lagging tab up to date, so the same call goes again once.
const CAUGHT_UP = ['stale', 'drifted'];

// onDone lets a bar that unmounts once nothing is unsaved move focus first.
const DRAFT_EVENTS = {
	save: 'draft-saved',
	discard: 'draft-discarded',
	undo: 'draft-undone',
	redo: 'draft-redone',
};

export const runDraft = async (name, call, { onResult, onDone } = {}) => {
	if (!free()) return;
	if (DRAFT_EVENTS[name]) track(DRAFT_EVENTS[name]);
	setBusy(name);
	setProblem(null);
	try {
		const shown = () =>
			name === 'save'
				? showDraft(call, { saving: true })
				: coverWhile(() => showDraft(call, { pressed: true }));
		const result = await shown().catch((error) =>
			CAUGHT_UP.includes(error.code) ? shown() : Promise.reject(error),
		);
		onResult?.(result);
		if (result.refused?.length) {
			setProblem(
				// translators: Shown on the AI Agent's unsaved changes bar, or under the bar over the website, when part of a save was refused because the site changed outside the agent.
				__(
					"Some changes weren't saved because the site changed outside the agent.",
					'extendify-local',
				),
			);
		}
		if (!useDraftStore.getState().unsaved) onDone?.();
	} catch (error) {
		// The bar shows the clash that refused it instead.
		if (['stuck', 'changed'].includes(error.code)) {
			setBusy(null);
			return;
		}
		if (error.code === 'live_changed') {
			setBusy(null);
			askLive(name, call, error.data?.live ?? [], { onResult, onDone });
			return;
		}
		setProblem(
			// translators: Shown on the AI Agent's unsaved changes bar, or under the bar over the website, when undo, redo or save failed.
			__("That didn't work. Please try again.", 'extendify-local'),
		);
	}
	setBusy(null);
};

export const useDraftRun = ({ onResult, onDone } = {}) => {
	const working = useRunStore((state) => state.working);
	const busy = useDraftRunStore((state) => state.busy);
	const version = useDraftStore((state) => state.version);
	const problem = useDraftRunStore((state) =>
		state.problem?.version === version ? state.problem.text : null,
	);
	// A write mid-run would act on content the agent is still changing.
	const blocked = Boolean(busy) || working;
	const run = (name, call) => runDraft(name, call, { onResult, onDone });

	return { busy, blocked, problem, run };
};

// Mounted once beside the chat, so it saves in the phone layout and with a canvas tool open too.
export const useAutosave = () => {
	const unsaved = useDraftStore((state) => state.unsaved);
	const version = useDraftStore((state) => state.version);
	const clashes = useDraftStore((state) => state.clashes.length);
	const working = useRunStore((state) => state.working);
	// A save between plan steps would split one request into two History rows.
	const planning = usePlanStore((state) =>
		Boolean(state.plan || state.planning),
	);
	const autosave = useShellStore((state) => state.autosave);
	const changesOpen = useShellStore((state) => state.changesOpen);
	const held = useHeldPicks(
		({ picking, versions }) => picking > 0 || versions.includes(version),
	);
	const { busy, run } = useDraftRun();
	const tried = useRef(null);

	// Once per draft version, so a save that failed waits for the next change.
	useEffect(() => {
		// The list of changes open would shift under the user.
		if (
			!autosave ||
			!unsaved ||
			working ||
			planning ||
			busy ||
			clashes ||
			changesOpen
		) {
			return;
		}
		if (held || tried.current === version || !free()) return;
		tried.current = version;
		run('save', save);
	}, [
		autosave,
		unsaved,
		working,
		planning,
		busy,
		clashes,
		version,
		changesOpen,
		held,
	]);
};

const ASK_EVERY = 10;

// Each turn's changes are one set, however many parts it touched.
export const unsavedSets = ({ versions }) =>
	versions.filter(({ saved, undone, dropped }) => !saved && !undone && !dropped)
		.length;

// Due once at each tenth set since the last save, so an undo and redo around one doesn't ask again.
export const askToSaveDue = () => {
	const draft = useDraftStore.getState();
	const savedId = draft.versions.findLast(({ saved }) => saved)?.id ?? 0;
	const reached = Math.floor(unsavedSets(draft) / ASK_EVERY) * ASK_EVERY;
	const { asked } = useDraftRunStore.getState();
	const at = asked.savedId === savedId ? asked.at : 0;
	if (useShellStore.getState().autosave || !reached || reached <= at) {
		return false;
	}
	useDraftRunStore.setState({ asked: { savedId, at: reached } });
	return true;
};

const LIVE_UNDONE = {
	// translators: Asked in the AI Agent's chat when the user pressed Undo on a logo the agent set, but the logo changed somewhere else since.
	logo: () =>
		__(
			'Your logo changed somewhere else after I set it. Put the earlier one back anyway?',
			'extendify-local',
		),
	// translators: Asked in the AI Agent's chat when the user pressed Undo on a site icon the agent set, but the icon changed somewhere else since.
	icon: () =>
		__(
			'Your site icon changed somewhere else after I set it. Put the earlier one back anyway?',
			'extendify-local',
		),
	// translators: Asked in the AI Agent's chat when the user pressed Undo on a site title the agent set, but the title changed somewhere else since.
	title: () =>
		__(
			'Your site title changed somewhere else after I set it. Put the earlier one back anyway?',
			'extendify-local',
		),
	// translators: Asked in the AI Agent's chat when the user pressed Undo on a tagline the agent set, but the tagline changed somewhere else since.
	tagline: () =>
		__(
			'Your tagline changed somewhere else after I set it. Put the earlier one back anyway?',
			'extendify-local',
		),
	status: ({ title }) =>
		sprintf(
			// translators: %s is a page's title. Asked in the AI Agent's chat when the user pressed Undo on publishing or unpublishing the page, but it was published or unpublished somewhere else since.
			__(
				'“%s” was published or unpublished somewhere else after I changed it. Put it back anyway?',
				'extendify-local',
			),
			title,
		),
};

const liveQuestion = (name, items) =>
	name === 'undo' && items.length === 1 && LIVE_UNDONE[items[0].key]
		? LIVE_UNDONE[items[0].key](items[0])
		: // translators: Asked in the AI Agent's chat when going back or forward in its history would put back a logo, title, tagline or page that changed somewhere else since.
			__(
				'Some of this changed somewhere else since. Put it back anyway?',
				'extendify-local',
			);

// The same Undo, Redo or Restore again, told to put the change back anyway or to skip it.
export const askLive = (name, call, items, options) =>
	useGutterStore.setState({
		card: {
			text: liveQuestion(name, items),
			// translators: Button on the AI Agent's card asking whether to put back a change made somewhere else since; puts it back anyway.
			button: __('Put it back', 'extendify-local'),
			onPress: () => {
				closeGutter();
				return runDraft(name, () => call('force'), options);
			},
			// translators: Button on the AI Agent's card asking whether to put back a change made somewhere else since; leaves the site as it is and moves past the change.
			dismiss: __('Skip', 'extendify-local'),
			onDismiss: () => {
				closeGutter();
				return runDraft(name, () => call('skip'), options);
			},
			onClose: closeGutter,
		},
	});

// A card already in the gutter waits on the user, and this would replace it unanswered.
export const askToSave = () => {
	if (useGutterStore.getState().card) return;
	const count = unsavedSets(useDraftStore.getState());
	useGutterStore.setState({
		card: {
			text: sprintf(
				// translators: %d is how many sets of changes the AI Agent made that aren't saved yet, a multiple of ten; asked in the chat with a Save button and a choice to turn on autosave.
				_n(
					'%d change isn’t saved yet. Save it now?',
					'%d changes aren’t saved yet. Save them now?',
					count,
					'extendify-local',
				),
				count,
			),
			// translators: Button on the AI Agent's card asking to save the changes not saved yet.
			button: __('Save', 'extendify-local'),
			onPress: () => {
				closeGutter();
				return runDraft('save', save);
			},
			// translators: Button on the AI Agent's card asking to save; turns on autosave, which saves these changes and every one after.
			dismiss: __('Turn on autosave', 'extendify-local'),
			onDismiss: () => {
				closeGutter();
				useShellStore.getState().setAutosave(true);
			},
			onClose: closeGutter,
		},
	});
};
