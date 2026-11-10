import { siteFrame } from '@agentx/lib/block-box';
import { movedId } from '@agentx/lib/block-ids';
import {
	buttonInkLabel,
	detailLabel,
	opLabel,
	paletteLabel,
	textInkLabel,
	themeSettingLabel,
} from '@agentx/lib/changes';
import {
	choosePalette,
	chooseThemeSetting,
	drop,
	editBlock,
	readChanges,
	replaceText,
	revert,
} from '@agentx/lib/draft';
import { libraryPhoto } from '@agentx/lib/library-photo';
import { pageInView } from '@agentx/lib/page-in-view';
import { blockById, looksOf } from '@agentx/lib/pick-block';
import { showDraft } from '@agentx/lib/show-draft';
import { useDraftStore } from '@agentx/state/draft';

const RESTYLES = ['set-style', 'set-css', 'copy-style'];
const SETTLE_MS = 800;

// A theme's transitions would have the new look read halfway.
const settledIn = async (doc, ids) => {
	const animations = ids
		.map((id) => blockById(doc, id))
		.filter(Boolean)
		.flatMap((element) => element.getAnimations?.({ subtree: true }) ?? []);
	if (!animations.length) return;
	await Promise.race([
		Promise.all(animations.map(({ finished }) => finished.catch(() => {}))),
		new Promise((resolve) => setTimeout(resolve, SETTLE_MS)),
	]);
};

const lookOf = (doc, id) => {
	const looks = looksOf(doc, id);
	return (
		looks && { looks, width: blockById(doc, id).getBoundingClientRect().width }
	);
};

const SIDE_MARGINS = ['margin-left', 'margin-right'];
const px = (value) => Number.parseFloat(value) || 0;
const outerOf = ({ looks, width }) =>
	width + px(looks['margin-left']) + px(looks['margin-right']);

// An auto margin takes up a wider box's room, which reads as a margin change no style made.
const followsBox = (from, now) => Math.abs(outerOf(from) - outerOf(now)) < 1;

// What each restyled block shows before and after, so the agent sees what came with what it set, like a theme's padding.
const shownOf = async (restyled) => {
	const doc = siteFrame()?.contentDocument;
	if (!doc || !restyled.length) return [];
	await settledIn(
		doc,
		restyled.map(({ id }) => id),
	);
	const first = new Map();
	for (const each of restyled)
		if (!first.has(each.id)) first.set(each.id, each);
	return [...first.values()].flatMap(({ id, type, from, margins }) => {
		const now = lookOf(doc, id) ?? { looks: {}, width: from.width };
		const moved = !margins && followsBox(from, now);
		const changed = Object.fromEntries(
			Object.keys({ ...from.looks, ...now.looks })
				.filter((style) => from.looks[style] !== now.looks[style])
				.filter((style) => !(moved && SIDE_MARGINS.includes(style)))
				.map((style) => [
					style,
					[from.looks[style] ?? null, now.looks[style] ?? null],
				]),
		);
		// A share of its row or a wide width changes how wide it's drawn, which no look shows.
		const drawn =
			Math.abs(from.width - now.width) >= 1
				? {
						width: [
							`${Math.round(from.width)}px`,
							`${Math.round(now.width)}px`,
						],
					}
				: {};
		const all = { ...changed, ...drawn };
		return Object.keys(all).length ? [{ block: id, type, changed: all }] : [];
	});
};

// Only a block's place and size show these, so one that moved neither didn't land.
const LAYOUT = [
	'align',
	'justification',
	'width',
	'vertical_alignment',
	'min_height',
	'height',
	'aspect_ratio',
];

const layoutOnly = ({ op, styles, direct }) => {
	const keys = Object.keys(styles ?? {});
	return (
		op === 'set-style' &&
		!direct &&
		keys.length > 0 &&
		keys.every((key) => LAYOUT.includes(key))
	);
};

// Its first part too: centering icons in a box no wider than them leaves the box unmoved.
const boxOf = (doc, id) => {
	const element = doc && id && blockById(doc, id);
	if (!element) return null;
	const { scrollX, scrollY } = doc.defaultView;
	return [element, element.firstElementChild].flatMap((each) => {
		if (!each) return [];
		const { left, top, width, height } = each.getBoundingClientRect();
		return [left + scrollX, top + scrollY, width, height];
	});
};

const sameBox = (from, now) =>
	from.length === now.length &&
	from.every((value, at) => Math.abs(value - now[at]) < 1);

const unshownOf = async (boxes, ids) => {
	const doc = siteFrame()?.contentDocument;
	const checked = boxes.flatMap((box, index) =>
		box && ids[index] ? [[index, ids[index], box]] : [],
	);
	if (!doc || !checked.length) return [];
	await settledIn(
		doc,
		checked.map(([, id]) => id),
	);
	return checked.flatMap(([index, id, box]) => {
		const now = boxOf(doc, id);
		return now && sameBox(box, now) ? [index] : [];
	});
};

const WIDENS = ['align', 'width'];

// Told only that nothing showed, plan mode kept widening a picture its column held.
const heldWhy = (op, id) => {
	const doc = siteFrame()?.contentDocument;
	const element = doc && id ? blockById(doc, id) : null;
	const widens = Object.keys(op.styles ?? {}).some((key) =>
		WIDENS.includes(key),
	);
	return widens && element?.parentElement?.closest('.wp-block-column')
		? 'The page shows no change: its column holds it, and a block in a column is never wider than the column, so it has to move out of the columns to be wider.'
		: 'The page shows no change: the parts around the block hold its place and size.';
};

// A refusal is the tool's answer, for the agent to explain; any other failure throws and reaches it as an error.
const refusalOf = (error) =>
	error?.data?.status >= 400 && error.data.status < 500
		? { refused: error.message, code: error.code }
		: null;

const WHOLE = [
	'move',
	'delete',
	'duplicate',
	'wrap',
	'stack-columns',
	'text-on-image',
];

const EDITS = [
	'delete',
	'edit-text',
	'format-text',
	'edit-code',
	'set-style',
	'set-css',
	'copy-style',
	'set-link',
	'set-settings',
	'move',
	'duplicate',
	'add',
	'replace-image',
	'set-alt',
	'rename',
	'wrap',
	'stack-columns',
	'text-on-image',
	'set-map',
	'logo-title',
];

// "$1" names the block op 1 changed or added, and "$1.0" one inside it; neither existed when the ops were written.
const REF = /^\$(\d+)((?:\.\d+)*)$/;

const DETAILS = ['phone', 'email', 'address', 'hours'];

const validOp = (entry) =>
	entry?.op === 'revert'
		? Number.isInteger(entry.version)
		: entry?.op === 'save-detail'
			? DETAILS.includes(entry.detail) && Boolean(entry.value?.trim?.())
			: entry?.op === 'set-theme-setting'
				? typeof entry.setting === 'string' && entry.setting !== ''
				: entry?.op === 'set-palette-color'
					? typeof entry.slug === 'string' &&
						/^#[0-9a-f]{6}$/i.test(entry.color ?? '')
					: EDITS.includes(entry?.op) &&
						typeof entry.block === 'string' &&
						entry.block !== '' &&
						typeof entry.type === 'string';

// A correction takes back what the last turn did to the wrong part, every part of it that can still go back.
const putBack = async (version) => {
	const { changes = [] } = await readChanges([version]);
	const keys = (changes[0]?.parts ?? [])
		.filter(({ revertible }) => revertible)
		.map(({ key }) => key);
	if (!keys.length) return null;
	const result = await revert(version, keys);
	return result.changed?.length ? opLabel(result.changed[0]) : null;
};

// Ids are positions, so each op's block is read through the ids the ops before it moved.
const targetOf = (block, index, landed, moves) => {
	const ref = REF.exec(block);
	const from = ref ? Number(ref[1]) : -1;
	if (ref && (from >= index || !landed[from])) return null;
	return moves
		.slice(from + 1)
		.reduce(
			(id, ids) => id && movedId(id, ids),
			ref ? `${landed[from]}${ref[2] ?? ''}` : block,
		);
};

// The refusal brought the newest draft into the store, so the edit is tried once against it; the type check still guards the id.
const AGAIN = ['stale', 'drifted'];
const editAgain = (edit) =>
	edit().catch((error) => {
		if (!AGAIN.includes(error?.code)) throw error;
		return edit();
	});

// Where the block's content starts on the page, so a scroll between reloads doesn't read as a move.
const placeOf = (id) => {
	const doc = document.getElementById('extendify-agentx-site')?.contentDocument;
	const element = doc && id && blockById(doc, id);
	if (!element) return null;
	const range = doc.createRange();
	range.selectNodeContents(element);
	const box = range.getBoundingClientRect();
	return {
		x: box.left + doc.defaultView.scrollX,
		y: box.top + doc.defaultView.scrollY,
	};
};

const WAYS = { right: [1, 0], left: [-1, 0], down: [0, 1], up: [0, -1] };

// A layout can hold a block in place whatever its own style says, so a move counts only once the page shows it.
const stayedPut = ({ moves, at }, id) => {
	const now = placeOf(id);
	if (!at || !now) return false;
	const [x, y] = WAYS[moves];
	return (now.x - at.x) * x + (now.y - at.y) * y < 1;
};

// A revert would add a second history row for a change the page never showed.
const takeBack = (count) =>
	showDraft(async () => {
		await drop(count);
		return useDraftStore.getState();
	}).catch(() => {});

// One turn, so the ops make one version that one Undo takes back.
export const editBlocks = async ({
	ops = [],
	confirmed = false,
	turn: asked,
} = {}) => {
	if (!Array.isArray(ops) || !ops.length || !ops.every(validOp)) {
		return {
			done: [],
			refused:
				'Each op names an edit the draft makes, with its block and type.',
			code: 'bad_ops',
		};
	}
	// The user's own edits never join a request's turn, or its Undo would take them.
	const theirs = ops.every(({ direct }) => direct);
	const turn =
		(!theirs && asked) || `edit-${Math.random().toString(36).slice(2)}`;
	const page = siteFrame()?.contentDocument;
	// Quick Edit's own saves skip it: only the agent reads how a change looked.
	const looked = new Map(
		ops.flatMap(({ op, block, direct }) => {
			if (!RESTYLES.includes(op) || REF.test(block) || direct) return [];
			const look = lookOf(page, block);
			return look ? [[block, look]] : [];
		}),
	);
	const boxes = ops.map((op) =>
		layoutOnly(op) && !REF.test(op.block) ? boxOf(page, op.block) : null,
	);
	const done = [];
	const inked = [];
	// Each block's words before and after, which the page as it is now no longer shows.
	const words = [];
	// Each op's block before and once it ran, and the ids it moved.
	const sources = [];
	const landed = [];
	const moves = [];
	const notes = [];
	const maps = [];
	// A held move takes back only these writes, not the plan steps it joined.
	let written = 0;
	let refused = null;
	let failed = null;
	let asks = null;
	const took = [];
	const checks = ops.map(({ block, moves }) =>
		WAYS[moves] ? { moves, at: placeOf(block) } : null,
	);
	// A photo the backend found comes as an address; without it uploaded, the part keeps its picture.
	const photos = ops.map(({ op, image, new: added }) => {
		if (op === 'replace-image' && image?.url && !image.id) {
			return libraryPhoto(image).catch(() => null);
		}
		const wanted = op === 'add' ? added?.images : null;
		return Array.isArray(wanted) && wanted.length
			? Promise.all(
					wanted.map((each) =>
						each?.url && !each.id ? libraryPhoto(each).catch(() => null) : each,
					),
				)
			: undefined;
	});
	await showDraft(
		async () => {
			for (const [
				index,
				{ op, block, type, moves: _, ...args },
			] of ops.entries()) {
				if (op === 'set-theme-setting') {
					const label = await chooseThemeSetting(args.setting, args.value, turn)
						.then(() => themeSettingLabel(args.setting))
						.catch((error) => {
							refused = refusalOf(error);
							failed = refused ? null : error;
							return null;
						});
					if (!label) break;
					took[index] = true;
					done.push(label);
					landed.push(null);
					moves.push({});
					continue;
				}
				if (op === 'save-detail') {
					const kept = await replaceText([], {
						keep: { [args.detail]: args.value },
						turn,
					}).catch(() => null);
					if (kept) {
						done.push(detailLabel(args.detail));
						took[index] = true;
					}
					landed.push(null);
					moves.push({});
					continue;
				}
				if (op === 'set-palette-color') {
					const chosen = await choosePalette(
						args.slug,
						args.color,
						args.name,
						turn,
					)
						.then((result) => result ?? {})
						.catch((error) => {
							refused = refusalOf(error);
							failed = refused ? null : error;
							return null;
						});
					if (!chosen) break;
					done.push(paletteLabel(args.name));
					took[index] = true;
					if (chosen.ink) {
						done.push(buttonInkLabel(chosen.ink.name));
						inked.push({ ...chosen.ink, fill: args.color });
					}
					for (const name of chosen.text ?? []) done.push(textInkLabel(name));
					landed.push(null);
					moves.push({});
					continue;
				}
				if (op === 'revert') {
					const label = await putBack(args.version).catch(() => null);
					if (label) {
						done.push(label);
						took[index] = true;
					}
					landed.push(null);
					moves.push({});
					continue;
				}
				if (photos[index] !== undefined) {
					const photo = await photos[index];
					const got = Array.isArray(photo) ? photo.filter(Boolean) : photo;
					if (!got || (Array.isArray(got) && !got.length)) {
						landed.push(null);
						moves.push({});
						continue;
					}
					if (Array.isArray(got)) args.new = { ...args.new, images: got };
					else args.image = got;
				}
				try {
					const target = targetOf(block, index, landed, moves);
					const next =
						typeof args.next === 'string'
							? targetOf(args.next, index, landed, moves)
							: undefined;
					if (!target || next === null) {
						refused = {
							refused: 'An earlier change in this turn removed the block.',
							code: 'moved',
						};
						break;
					}
					sources[index] = target;
					// A synced pattern's move, delete or copy needs the page in view to find its reference there.
					const page = WHOLE.includes(op) && pageInView()?.id;
					// The single template draws every post's featured image, so the post in view is the one changed.
					const post = type === 'core/post-featured-image' && pageInView()?.id;
					const result = await editAgain(() =>
						editBlock(
							op,
							target,
							{
								...args,
								...(next && { next }),
								...(page && { page: `post:${page}` }),
								...(post && { post }),
								type,
							},
							{ turn, confirmed },
						),
					);
					landed.push(result.block ?? null);
					moves.push(result.ids ?? {});
					if (result.changed?.length) {
						written++;
						took[index] = true;
						done.push(opLabel(result.changed[0]));
					}
					for (const { type: kind, words: said } of result.changed ?? []) {
						if (said) words.push({ type: kind, ...said });
					}
					if (result.note) notes.push(result.note);
					if (result.map) maps.push(result.map);
				} catch (error) {
					// The change would show on every page using the pattern, so the user is asked first.
					if (error?.code === 'synced_pattern') {
						asks = { code: error.code, pattern: error.data?.pattern ?? null };
						break;
					}
					// A post's title shows wherever the post does, so renaming it is asked first too.
					if (error?.code === 'renames_post') {
						asks = { code: error.code, post: error.data?.post ?? null };
						break;
					}
					refused = refusalOf(error);
					failed = refused ? null : error;
					break;
				}
			}
			// Each answer, a refusal's too, left the newest draft in the store.
			return useDraftStore.getState();
		},
		{ quiet: ops.every(({ direct }) => direct) },
	);
	if (failed) throw failed;
	if (asks) return { done, confirm: asks };
	if (refused) return { done, ...refused };
	if (checks.some((check, index) => check && stayedPut(check, landed[index]))) {
		if (written) await takeBack(written);
		return {
			done: [],
			refused: "The block didn't move: the layout around it holds it in place.",
			code: 'not_moved',
		};
	}
	// As the page has them once every op ran, for a plan's later steps.
	const settled = (id, from) =>
		moves.slice(from).reduce((at, ids) => at && movedId(at, ids), id);
	const unshown = await unshownOf(
		boxes,
		landed.map((id, index) => id && settled(id, index + 1)),
	);
	for (const index of unshown) took[index] = false;
	// A change the page didn't take is refused, so the agent never reports it as made.
	if (!theirs && !took.some(Boolean)) {
		const why =
			unshown.length &&
			heldWhy(ops[unshown[0]], settled(landed[unshown[0]], unshown[0] + 1));
		if (written) await takeBack(written);
		return why
			? { done: [], refused: why, code: 'not_shown' }
			: {
					done: [],
					refused: 'Nothing on the page changed.',
					code: 'unchanged',
				};
	}
	// The backend's closing line leaves these ops out.
	const unchanged = ops.flatMap((_, index) => (took[index] ? [] : [index]));
	const moved = moves.filter((ids) => Object.keys(ids).length);
	const copies = ops.flatMap(({ op }, index) => {
		if (op !== 'duplicate' || !sources[index] || !landed[index]) return [];
		const copy = {
			from: settled(sources[index], index),
			to: settled(landed[index], index + 1),
		};
		return copy.from && copy.to ? [copy] : [];
	});
	const added = ops.flatMap(({ op }, index) =>
		op === 'add' && landed[index] ? [settled(landed[index], index + 1)] : [],
	);
	const shown = await shownOf(
		ops.flatMap(({ op, block, type, styles }, index) => {
			const from = looked.get(block);
			const id = from && landed[index] && settled(landed[index], index + 1);
			const margins =
				op === 'copy-style' ||
				Object.keys(styles ?? {}).some((key) => key.startsWith('margin'));
			return id ? [{ id, type, from, margins }] : [];
		}),
	).catch(() => []);
	return {
		done,
		blocks: landed,
		...(shown.length && { shown }),
		...(notes.length && { notes }),
		...(maps.length && { maps }),
		...(moved.length && { moved }),
		...(copies.length && { copies }),
		...(added.filter(Boolean).length && { added: added.filter(Boolean) }),
		...(inked.length && { inked }),
		...(words.length && { words }),
		...(unchanged.length && { unchanged }),
	};
};
