import { check, draftUrl, picksOf } from '@agentx/lib/draft';
import { pageUrl } from '@agentx/lib/follow-site';
import { patchSite, renderAhead } from '@agentx/lib/patch-site';
import { patchable, switchSite } from '@agentx/lib/switch-site';
import { useDraftStore } from '@agentx/state/draft';
import { useRunStore } from '@agentx/state/run';
import { useShellStore } from '@agentx/state/shell';

const siteFrame = () => document.getElementById('extendify-agentx-site');

const FIRST_PAGE_MS = 15000;

// Before its first page the frame is about:blank, and switching to that blanks the site.
const pageShown = (frame) =>
	new Promise((resolve) => {
		if (showsPage()) return resolve(true);
		const done = () => {
			if (!showsPage()) return;
			clearTimeout(timer);
			frame.removeEventListener('load', done);
			resolve(true);
		};
		const timer = setTimeout(() => {
			frame.removeEventListener('load', done);
			resolve(false);
		}, FIRST_PAGE_MS);
		frame.addEventListener('load', done);
	});

// A save makes a new version that shows the same page, so a check queued behind it mustn't reload for it.
const savedFrom = new Map();
// A save answers with the draft, so a run ending at a save needs no check.
let savedAt = 0;
const autosaving = () => {
	const { autosave, changesOpen } = useShellStore.getState();
	const { unsaved, clashes } = useDraftStore.getState();
	return autosave && unsaved && !changesOpen && !clashes.length;
};

export const showNewest = async (before, draft, { quiet = false } = {}) => {
	const samePicks = Object.keys({ ...picksOf(draft), animation: true }).every(
		(pick) => before[pick] === draft[pick],
	);
	const sameVersion =
		draft.version === before.version ||
		savedFrom.get(draft.version) === before.version;
	if (sameVersion && samePicks) return;

	const frame = siteFrame();
	if (!(await pageShown(frame))) return;
	const page = pageUrl(frame.contentWindow.location.href);
	const picks = picksOf(draft);
	const href = draftUrl(page, draft.version, picks);
	// Only a move between versions renders on both sides; a design pick restyles the whole page.
	if (samePicks && before.current !== draft.current && patchable()) {
		const render = draftUrl(page, null, picks);
		const versions = { render, from: before.current, to: draft.current, href };
		const patched = await patchSite(frame, versions).catch(() => false);
		if (patched) return;
	}
	await switchSite(frame, href, { quiet });
};

export const showCurrent = async (params = {}) => {
	const frame = siteFrame();
	if (!frame || !(await pageShown(frame))) return;
	const draft = useDraftStore.getState();
	const url = new URL(
		draftUrl(
			pageUrl(frame.contentWindow.location.href),
			draft.version,
			picksOf(draft),
		),
	);
	for (const [name, value] of Object.entries(params)) {
		url.searchParams.set(name, value);
	}
	return switchSite(frame, url.href);
};

const renderShown = (draft) => {
	if (!showsPage() || !patchable()) return;
	const frame = siteFrame();
	const page = pageUrl(frame.contentWindow.location.href);
	renderAhead(frame, draftUrl(page, null, picksOf(draft)), draft.current);
};

// Quiet for a Quick Edit save, whose change the page already shows before it lands.
export const showDraft = async (
	call,
	{ saving = false, quiet = false, pressed = false } = {},
) => {
	const before = useDraftStore.getState();
	// A check mostly finds nothing new, and a save shows nothing new.
	if (!saving && call !== check) renderShown(before);
	// Neither a check nor a save changes what the page shows, so neither says it is working on it.
	// Without this, the user's own Undo or Discard says the agent is working.
	// A run of the agent's owns the toast from end to end, so a write inside one leaves it alone;
	// one write at a time blinked it on and off through a turn of several.
	const changes =
		!saving && !pressed && call !== check && !useRunStore.getState().working;
	if (changes) useRunStore.setState({ changing: true });
	try {
		const result = await call();
		// A save changes nothing the site shows, so a reload would load the same page again.
		if (saving) {
			savedFrom.set(result?.version, before.version);
			savedAt = Date.now();
			// The site's own look changed, which is the one thing the design lists read.
			useDraftStore.setState((state) => ({ saves: state.saves + 1 }));
		} else await showNewest(before, result, { quiet });
		return result;
	} catch (error) {
		if (error.data?.draft) {
			await showNewest(before, error.data.draft, { quiet });
		}
		throw error;
	} finally {
		if (changes) useRunStore.setState({ changing: false });
	}
};

const QUIET_MS = 2 * 60 * 1000;
const SAVED_MS = 2000;
const TICK_MS = 15000;
const SETTLED_MS = 5000;

const showsPage = () => {
	try {
		return siteFrame().contentWindow.location.protocol.startsWith('http');
	} catch {
		return false;
	}
};

// A reload would wipe what the user is typing in the site.
const typingInSite = () => {
	const field = siteFrame().contentDocument?.activeElement;
	return Boolean(
		field?.isContentEditable || field?.matches?.('input, textarea, select'),
	);
};

const checkNow = () => {
	// A replay mid-run would let the agent's next write pass a check planned on older content.
	if (useRunStore.getState().working) return;
	if (document.visibilityState !== 'visible') return;
	if (!showsPage() || typingInSite()) return;
	showDraft(check).catch(() => {});
};

const checkedWithin = (ms) =>
	Date.now() - useDraftStore.getState().checkedAt < ms;

// A link click shows the draft's copy of a page that may have changed since.
const checkLoadedPage = () => {
	if (!checkedWithin(SETTLED_MS)) checkNow();
};

// Another tab, or an edit in wp-admin, may have changed the draft meanwhile.
export const watchDraft = () => {
	const frame = siteFrame();
	const timer = setInterval(() => {
		if (!checkedWithin(QUIET_MS)) checkNow();
	}, TICK_MS);
	document.addEventListener('visibilitychange', checkNow);
	frame.addEventListener('load', checkLoadedPage);
	// The checks skipped during the run happen once, as it ends.
	const stopFollowingRuns = useRunStore.subscribe(({ working }, before) => {
		if (!before.working || working) return;
		if (Date.now() - savedAt < SAVED_MS || autosaving()) return;
		checkNow();
	});
	return () => {
		clearInterval(timer);
		document.removeEventListener('visibilitychange', checkNow);
		frame.removeEventListener('load', checkLoadedPage);
		stopFollowingRuns();
	};
};
