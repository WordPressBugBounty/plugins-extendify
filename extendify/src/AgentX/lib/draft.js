import { movedId } from '@agentx/lib/block-ids';
import { setPresets } from '@agentx/lib/presets';
import { useBusinessStore } from '@agentx/state/business';
import { markChanged } from '@agentx/state/changed';
import { useDraftStore } from '@agentx/state/draft';
import { useSelectionStore } from '@agentx/state/selection';
import { setAvailableNotifications } from '@notifications/available';
import apiFetch from '@wordpress/api-fetch';

// These can add or remove blocks, and an id is a position, so a picked block's id may name its neighbour.
const SHIFTS = [
	'layout',
	'look',
	'undo',
	'redo',
	'restore',
	'revert',
	'discard',
	'resolve',
];

// Each call rewrites the whole draft, so two in flight would drop one.
let queue = Promise.resolve();

const send = (path, data = {}, { skip } = {}) => {
	const sent = queue.then(async () => {
		if (skip?.()) return null;
		// Read when the call starts, so it names what the call before it answered.
		const { version, current, receive, request } = useDraftStore.getState();
		// Every call checks the draft, so the next idle check can wait.
		useDraftStore.setState({ checkedAt: Date.now() });
		try {
			const result = await apiFetch({
				path: `/extendify/v1/agentx/draft/${path}`,
				method: 'POST',
				data: {
					...data,
					shown: { version, current },
					...(request && { request }),
				},
			});
			receive(result);
			// An undo can put a contact detail back, so the agent follows every answer.
			if (result?.business) {
				useBusinessStore.setState({ ...result.business }, true);
			}
			if (result?.presets) setPresets(result.presets);
			// Only a write that put a site setting back answers with a list.
			setAvailableNotifications(result?.notifications);
			// The focus stays: the frame's reload checks it still names a block of its kind.
			if (SHIFTS.includes(path) && result?.changed?.length) {
				useSelectionStore.setState({ block: null });
			}
			if (result?.ids) follow(result.ids);
			return result;
		} catch (error) {
			if (error.data?.draft) receive(error.data.draft);
			throw error;
		}
	});
	queue = sent.catch(() => {});
	return sent;
};

// An edit says which ids it moved, so the picked and focused parts stay with their blocks.
const follow = (ids) => {
	const state = useSelectionStore.getState();
	const moved = {};
	for (const key of ['block', 'focus']) {
		const part = state[key];
		const id = part && movedId(part.id, ids);
		if (part && id !== part.id) moved[key] = id ? { ...part, id } : null;
	}
	if (Object.keys(moved).length) useSelectionStore.setState(moved);
};

export const editBlock = (op, block, args, { turn, confirmed = false } = {}) =>
	send('edit', { op, block, ...args, turn, ...(confirmed && { confirmed }) });

// A variation sets both colors and fonts.
const partsOf = (picks) =>
	Object.entries(picks)
		.filter(([, pick]) => pick)
		.flatMap(([layer]) =>
			layer === 'variation' ? ['colors', 'fonts'] : [layer],
		);

// A part picked here ends its setup card, as the server records too.
const changed = (picks) => (result) => {
	for (const part of partsOf(picks)) markChanged(part);
	return result;
};

export const replaceText = (pairs, { block = '', keep, turn } = {}) =>
	send('replace', { pairs, block, keep, turn });

// A pick a newer one of its layer replaced while it waited is never sent.
const newestPicks = {};
export const chooseStyle = (layer, pick) => {
	const mine = {};
	newestPicks[layer] = mine;
	return send(
		'style',
		{ layer, pick },
		{ skip: () => newestPicks[layer] !== mine },
	).then(changed({ [layer]: pick }));
};

// One palette color takes a new value everywhere the site uses it.
export const choosePalette = (slug, color, name, turn) =>
	send('palette', { slug, color, name, turn });

// One theme setting, like the content width or the spacing scale, across the whole site.
export const chooseThemeSetting = (setting, value, turn) =>
	send('theme-setting', { setting, value, turn });

export const chooseLayout = (layout) => send('layout', { layout });

export const chooseLook = ({ layout, variation, vibe }) =>
	send('look', { layout, variation, vibe }).then(changed({ variation, vibe }));

// A live save changed elsewhere since asks first; live says whether to put it back anyway or skip it.
export const undo = (live) => send('undo', live ? { live } : {});

// Count keeps a plan's earlier steps when the dropped writes joined their version.
export const drop = (count) => send('drop', { count });

export const redo = (live) => send('redo', live ? { live } : {});

export const restore = (id, live) =>
	send('restore', { id, ...(live && { live }) });

// For the agent's own undos: a stale-tab refusal brings the newest draft, so it tries once more.
export const restoreTo = (id, live) =>
	restore(id, live).catch((error) =>
		['stale', 'drifted'].includes(error?.code)
			? restore(id, live)
			: Promise.reject(error),
	);

// A logo or icon saved live goes in the history, so Undo can put the earlier one back.
export const recordLive = (key, before, after) =>
	send('live', { key, before, after });

export const revert = (version, keys) => send('revert', { version, keys });

// Read only, so it skips the queue: it changes nothing a write in flight could lose.
export const readChanges = (ids) =>
	apiFetch({
		path: `/extendify/v1/agentx/draft/changes?ids=${ids.map(Number).join(',')}`,
	});

export const discard = () => send('discard');

export const save = () => send('save');

export const resolve = (how, seen) => send('resolve', { how, seen });

export const check = () => send('check');

export const PICKS = {
	variation: 'extendify-variation',
	colors: 'extendify-colors',
	fonts: 'extendify-fonts',
	vibe: 'extendify-vibe',
	animation: 'extendify-animation',
	layout: 'extendify-layout',
};

// Each pick named, even an empty one, overrides the draft's in the site frame.
export const draftUrl = (page, version, picks = {}) => {
	const url = new URL(page);
	if (version) url.searchParams.set('extendify-draft', version);
	for (const [pick, param] of Object.entries(PICKS)) {
		if (picks[pick] !== undefined) url.searchParams.set(param, picks[pick]);
	}
	return url.href;
};

// The draft's own style picks, so the frame shows them over a cached copy of an older choice.
// An animation is named only to show it, since the frame otherwise turns entrance animations off.
export const picksOf = ({ variation, colors, fonts, vibe }) => ({
	variation,
	colors,
	fonts,
	vibe,
});
