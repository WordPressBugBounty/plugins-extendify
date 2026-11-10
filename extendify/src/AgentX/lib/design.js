import {
	chooseLayout,
	chooseLook,
	chooseStyle,
	draftUrl,
	picksOf,
} from '@agentx/lib/draft';
import { pageUrl } from '@agentx/lib/follow-site';
import { HeldPicks, holdPick, isHeld } from '@agentx/lib/held-picks';
import { showNewest } from '@agentx/lib/show-draft';
import { restyleSite, switchSite } from '@agentx/lib/switch-site';
import { useDraftStore } from '@agentx/state/draft';
import { useShellStore } from '@agentx/state/shell';
import apiFetch from '@wordpress/api-fetch';
import { useContext, useRef, useState } from '@wordpress/element';

const siteFrame = () => document.getElementById('extendify-agentx-site');

const loaded = {};

const ask = async (layer, key) => {
	try {
		const got = await apiFetch({
			path: `/extendify/v1/agentx/design/${layer}`,
		});
		// An empty pool means the patterns fetch failed, so Try again must ask again.
		if (layer === 'layout' && !got.options?.length) delete loaded[key];
		return got;
	} catch (error) {
		delete loaded[key];
		throw error;
	}
};

// Every list comes from the site as it is saved, so a draft pick changes nothing in it.
// Keyed on saves, not the version: a pick used to miss all three keys and ask again for each.
export const designOptions = (layer) => {
	const key = `${layer}:${useDraftStore.getState().saves}`;
	loaded[key] ??= ask(layer, key);
	return loaded[key];
};

// Styles can share corners, so the newest pick of the layer settles which one is live.
const liveOf = (draft, layer, live = []) => {
	if (live.length < 2) return live[0] ?? '';
	const last = draft.versions?.findLast(
		({ kind, undone }) => !undone && (kind === layer || kind === 'look'),
	);
	return live.includes(last?.[layer]) ? last[layer] : '';
};

const rewinds = (entry) =>
	entry.kind === 'restore' || entry.reverts || entry.revertsAll;

// The newest change still standing that set the layer, or could have.
const standingOf = (versions = [], layer) =>
	versions.findLast(
		(entry) =>
			!entry.undone &&
			!entry.dropped &&
			(entry.kind === layer ||
				rewinds(entry) ||
				(entry.kind === 'look' && entry[layer])),
	);

// What a save left on the site: the newest pick still standing, unless a restore came after.
const lastPick = (versions, layer) => {
	const entry = standingOf(versions, layer);
	return entry && !rewinds(entry) ? (entry[layer] ?? undefined) : undefined;
};

// Original on a saved look changes nothing and adds no entry, so the click itself is kept.
export const shownPick = (draft, layer, list) => {
	const click = draft.clicks?.[layer];
	if (click && click.standing === standingOf(draft.versions, layer)?.id) {
		return click.pick;
	}
	// A save empties the pick, and the list may predate the save, so history goes first.
	return (
		draft[layer] ||
		(lastPick(draft.versions, layer) ?? liveOf(draft, layer, list?.live))
	);
};

const holdClick = (layer, pick) =>
	useDraftStore.setState(({ clicks, versions }) => ({
		clicks: {
			...clicks,
			[layer]: { pick, standing: standingOf(versions, layer)?.id },
		},
	}));

// While a newer draft's list loads, the mark stays put instead of jumping back.
export const useShownPick = (draft, layer, list, trying = null) => {
	const shown = useRef('');
	if (trying !== null) shown.current = trying;
	else if (list?.version === draft.version || draft[layer]) {
		shown.current = shownPick(draft, layer, list);
	}
	return shown.current;
};

// The page the site frame shows, with the draft's other picks kept.
export const pickUrl = (page, layer, value, { version } = {}) => {
	const draft = useDraftStore.getState();
	return draftUrl(page, version ?? draft.version, {
		...picksOf(draft),
		[layer]: value,
	});
};

// Each pick changes the version, and naming the new one would miss every page already loaded.
export const usePreviewVersion = () => {
	const held = useContext(HeldPicks);
	const [first] = useState(() => useDraftStore.getState().version);
	// Versions this row's own picks made; after any other change its cached pages are out of date.
	const ours = useRef([first]);
	return {
		first,
		held,
		now: () => {
			const { version } = useDraftStore.getState();
			if (!ours.current.includes(version)) ours.current = [];
			return ours.current.length ? first : version;
		},
		picked: () => {
			if (!ours.current.length) return;
			const { version } = useDraftStore.getState();
			// Autosave saves the pick next, and a save changes what the other options show.
			if (useShellStore.getState().autosave && !isHeld(version)) {
				ours.current = [];
			} else ours.current.push(version);
		},
	};
};

const sendPick = (choose, preview) =>
	preview?.held ? holdPick(choose) : choose();

// The theme's own replay, to see the entrance animations again without reloading.
export const replayAnimations = () =>
	siteFrame()?.contentWindow?.ExtendableAnimations?.reset?.();

const RESTYLED = ['colors', 'fonts', 'vibe'];
export const restyles = (layer) => RESTYLED.includes(layer);

// Shown at once from the warmed copy, while the draft records it.
export const pickStyle = async (
	layer,
	id,
	{ preview, colors, paint, duotone, tile = id } = {},
) => {
	const frame = siteFrame();
	const before = useDraftStore.getState();
	const href = pickUrl(pageUrl(frame.contentWindow.location.href), layer, id, {
		version: preview?.now(),
	});
	before.setPick(layer, id);
	const shown = restyles(layer)
		? restyleSite(frame, href, { colors, paint, duotone })
		: switchSite(frame, href);
	try {
		await sendPick(() => chooseStyle(layer, id), preview);
	} catch (error) {
		// A refusal brings the newest draft; any other failure leaves the pick from before.
		const newest = error.data?.draft;
		if (useDraftStore.getState().settlePick(layer, id)) {
			useDraftStore.setState({
				[layer]: newest ? newest[layer] : before[layer],
			});
		}
		await showNewest(
			{ ...before, [layer]: id },
			newest ?? useDraftStore.getState(),
		);
		throw error;
	}
	preview?.picked();
	useDraftStore.getState().settlePick(layer, id);
	holdClick(layer, tile);
	return shown;
};

// The href is the thumbnail's own, so the pick shows from its cached copy.
const pickHero = async (href, layers, choose, preview) => {
	const frame = siteFrame();
	const before = useDraftStore.getState();
	for (const [layer, pick] of Object.entries(layers)) {
		before.setPick(layer, pick);
	}
	const shown = switchSite(frame, href, { top: true });
	try {
		await sendPick(choose, preview);
	} catch (error) {
		const newest = error.data?.draft;
		const { settlePick } = useDraftStore.getState();
		const newer = Object.keys(layers).filter((layer) =>
			settlePick(layer, layers[layer]),
		);
		if (newer.length) {
			useDraftStore.setState(
				Object.fromEntries(
					newer.map((layer) => [layer, (newest ?? before)[layer]]),
				),
			);
			const draft = useDraftStore.getState();
			await switchSite(
				frame,
				draftUrl(pageUrl(href), draft.version, picksOf(draft)),
				{ top: true },
			);
		}
		throw error;
	}
	preview?.picked();
	for (const [layer, pick] of Object.entries(layers)) {
		useDraftStore.getState().settlePick(layer, pick);
	}
	return shown;
};

export const pickLayout = (href, id, { preview } = {}) =>
	pickHero(href, { layout: id }, () => chooseLayout(id), preview);

// A look's variation carries its colors and fonts, so separate picks are cleared.
export const lookLayers = (picks) => ({ ...picks, colors: '', fonts: '' });

export const pickLook = (href, picks, { preview } = {}) =>
	pickHero(href, lookLayers(picks), () => chooseLook(picks), preview);
